# 13 · 设计阐明

> 本文解释 CueFlow **为什么是这样**：图模型、节点边界、执行语义、会话模型、UI 取舍、安全边界。
> 具体选择与替代方案见 [决策记录表](decisions.md)；可执行规格见 [05](05-node-reference.md) / [07](07-execution-engine.md)；能力缺口见 [14](14-readiness-gaps.md)。

## 1. 要解决的问题

编码任务不是一次问答，而是一条有依赖的链路：

```text
读仓库 → 取 diff → 审查 → 决定是否修 → 修改 → 测试 → 总结
```

聊天框把这条链压成线性消息：每一步都混在上下文里，失败后难以只重跑一段，换一个模型/技能要重写提示词，流程无法作为资产复用。CueFlow 的目标是把这条链变成**人可编辑、机器可执行、结果可检查**的图。

它不替代 Agent，也不替代脚本；它让“谁在什么阶段做什么”显式化。

## 2. 为什么是节点图，而不是 DSL / 表单 / 脚本

| 方案 | 问题 |
|---|---|
| 表单 | 只能表达线性步骤；分支/并行/合并会变成隐藏逻辑 |
| 纯 DSL | 可表达，但不可视、不可局部调试、非作者难审查 |
| 让模型写脚本 | 黑盒；每次生成不同；权限/失败点不可见 |
| 节点图 | 类型化端口 + 连线即依赖；可静态校验；状态画在节点上；JSON 可分享 |

CueFlow 借 ComfyUI 的**视觉编程**隐喻，但不照搬它的模型加载/队列生态：节点是 DSH 能力的白名单包装，不是任意 Python 扩展。

关键约束：

- DAG，不允许环；
- 一个输入端口最多一条入边；
- 连线类型必须兼容；
- workflow 与 run 分离，run 保存 workflow 快照；
- 画布状态（缩放/选中）不写进 workflow。

## 3. 节点集为什么是这 15 个

节点集按“编码主链路 + 最小通用性”选：

| 类别 | 节点 | 为什么需要 |
|---|---|---|
| IO | Input / Output | 运行输入与最终产物 |
| 变换 | Template | 把值拼成 prompt/命令/文件名 |
| Agent | Agent / Skill | 让模型/技能真正工作 |
| DSH | Command | 复用 DSH 已有的斜杠命令 |
| 执行 | Shell / Read File | 确定性命令与文件上下文 |
| 控制 | Condition / Merge / Subflow / Fan-out / Reroute / Group | 分支、汇合、子图复用、fan-out、连线整理与视觉分组 |
| 辅助 | Note | 画布解释，不执行 |

**刻意不做**：

- 任意 JS/Python 代码节点：安全与可审查性优先；
- 文件写节点：MVP 只读，写操作交给 Agent/Shell，避免绕过 fs 策略；
- HTTP 节点：先不做，等凭据/审批/重试模型明确；
- 循环/子图：复杂度高，MVP 先验证编辑-运行闭环。

## 4. 执行语义为什么这样设计

### 4.1 就绪与跳过

节点就绪 = 所有上游已 settle（成功/失败/跳过），而不是“入边数量到了”。因为 Condition 的未走分支不会产出值，下游必须能区分“还没跑”和“这条路没走”。

未走分支用 `undefined` 表示，下游必填输入缺失 → `skipped`。这不是错误；错误用 `error`，取消用 `cancelled`。

### 4.2 fail-fast

默认一个节点失败就停止启动后续节点，但**不主动杀死正在运行的节点**（避免半截副作用）。用户取消才 abort 全部。这个选择让“失败现场”保留，代价是资源可能短暂继续占用。

### 4.3 并发

`settings.concurrency` 默认 2，最多 8。依赖关系仍然串行；并发只作用于互不依赖的分支。没有全局 run 上限是当前的生产缺口（见 14）。

### 4.4 超时/取消

节点级超时；Agent/Skill/Command 的 signal 会传给子代理/命令；Shell 的 timeout 交给执行器。通用超时是兜底，不能替代 adapter 自己响应 abort。

## 5. 会话模型：为什么不是“同一个会话”

这是最容易误解的一点。CueFlow 的 run 不是 DSH 对话的一个 turn，而是 Host 里的 `RunManager`。

```text
DSH 父会话（用户选中的 live Agent）
   │
   ├─ Agent/Skill 节点 ──▶ ctx.subagents.startActivation
   │                         ├─ spawn: 新 child session（默认，干净上下文）
   │                         └─ fork:  child session + 继承父上下文
   │                         delivery: caller（结果回 CueFlow，不写父会话）
   │
   ├─ Command 节点 ──────▶ ctx.commands.execute(parent, …)
   │                         （命令生命周期落在父会话）
   │
   └─ Shell/File 节点 ───▶ Host 进程（run cwd + DSH shell/fs policy）
```

因此：

- **图本身**：CueFlow 的 run 记录，独立于 DSH session log；
- **Agent/Skill**：每个节点一个 child session；多个节点彼此也不共享同一个 session；
- **Command**：唯一显式落在父会话的节点类型；
- **Shell/File**：进程能力，不是会话消息。

### 为什么这样选

- `delivery:'caller'` 避免每个节点结束都往父会话塞通知，保持对话干净；
- `spawn` 避免子代理继承整段父历史，降低污染与 token 成本；
- 父会话只作为**归属/权限/cwd**的锚点；
- run 记录独立保存，才能做到“workflow 可编辑，历史 run 可复现”。

### 代价

- 没有统一 transcript：用户要在 CueFlow 的 run 日志与 child session 之间切换；
- 默认 `spawn` 不继承父会话上下文；需要继承时应显式选 `fork`（当前 UI 未暴露 provider，属于后续能力）；
- Command 与 Agent/Skill 的“会话归属”不同，审计时要看清节点类型。

设计选择记录：D-009（subagent）、D-010（显式选父会话）、D-045（会话模型）。

### 5.1 显式会话模式（M6-P1-1）

当前默认是 `isolated`：每个 Agent/Skill 节点一个 child。对多步编码任务，这会丢失“审查→修改→测试”的上下文连续性。因此 M6 计划引入 run 级 `sessionMode`。**当前构建只开放 `isolated` / `inherit`**；`workflow` 与 `parent` 仍待实现（见下）：

| 模式 | 语义 | 用途 |
|---|---|---|
| `isolated` | 当前行为；每节点 child | 并行、干净、可复现，默认 |
| `workflow` | 一次 run 复用一个 child（可按分支） | 多步 Agent 共享上下文，不污染父会话 |
| `parent` | 在选中父会话执行 | 结果写回当前对话；要求 idle + 单 run 锁 + 明确警告 |

`workflow` 是投入产出最高的模式：它保留上下文但不写入父会话；代价是该 session 内节点串行、上下文会增长。`parent` 适合“助手在当前任务里继续做”，但不适合作为默认：会污染 transcript、无法并行、取消语义复杂。

实现前必须确认 DSH 是否支持向已有 child session 追加 turn。已确认 `ctx.subagents.sendMessage()` 存在，但它只返回 inbox id，不提供“等待该 turn 结果”的宿主 API；因此 `workflow` 模式还需要一个结果收集设计，`parent` 模式则需要向父会话发送 turn 的 API。当前先开放 `isolated` / `inherit`（`inherit` 选 `fork`，仍为 child），不把未验证的模式伪装成可用。该模式排在 P0-1..P0-6 之后，见 [16 · M6 计划](16-m6-plan.md)。

## 6. 为什么选 `main` + `sidebar.panellist`

DSH 的插件管理器/Task Manager 使用同一模式：左侧入口，`main` keyed panel 全屏。相比：

- Settings 页：空间小，不像编辑器；
- header action 弹窗：绑定单个会话，遮挡对话；
- `shell.overlay`：盖住整个应用，缺少页面语义。

代价是 root scope 拿不到当前 session，所以运行对话框显式选父会话，而不是猜。

## 7. UI 为什么是“制图台 + 提示卡”

- 画布是深色制图台：长时间编辑不刺眼，网格提供空间参照；
- 节点是提示卡：左侧分类色脊 + cue light 状态灯；
- 端口颜色=类型：拖线时就判断兼容性；
- 单一强调色（琥珀）：避免多彩霓虹的“AI 模板感”；
- 运行中只让 cue light/连线动，不做整卡发光。

UI 细节见 [06](06-ui-design.md)。

## 8. 安全边界

- 无任意代码节点；Shell/FS/Skill/Command/Agent 是白名单能力；
- Shell 走 `ctx.shell`，File 走 `ctx.fs`，继承 DSH 策略；
- Command 走 `ctx.commands`，不拼 shell；
- Skill 只从 registry 读取，不读任意路径；
- 路由同源，不另开端口。

**已知缺口**：Shell/Command 直接调用 service，没有经过 `ctx.tools` 的审批链；公开 Web 部署还缺 CSRF/认证。它们在 [14](14-readiness-gaps.md) 的 P0 中。

## 9. 备选方案与拒绝原因

| 备选 | 拒绝原因 |
|---|---|
| 只用 DSH `workflow` 工具（模型写脚本） | 不是人编辑的图；不可视、不可局部调试 |
| 直接复用 ComfyUI 前端 | 依赖 Python 后端/节点生态；与 DSH service 模型不匹配 |
| Settings 页放画布 | 空间不足；不是“打开即用”的编辑器 |
| 在插件里新建顶级 Agent | 需要完整 CreateAgentOptions；不会自动进入父会话 catalog；MVP 用 subagent seam |
| SSE/WebSocket 实时流 | MVP 轮询更易测试/恢复；长任务进度是 P1 |
| 允许任意 JS 节点 | 安全/可审查性不可接受 |

## 10. 开放问题

1. 是否提供“同一会话模式”（Agent 结果回到父会话）作为显式选项？
2. Shell/Command 的审批应由节点配置、Host 统一策略，还是复用 DSH tool approval？
3. 循环/fan-out 用专用节点还是子图 + map？
4. 运行恢复的粒度：整图、失败节点、还是节点+下游？
5. 多用户/公开 Web 部署是否需要独立的 workflow 权限模型？

这些问题会在 [14](14-readiness-gaps.md) 的 P0/P1 中逐项收敛。
