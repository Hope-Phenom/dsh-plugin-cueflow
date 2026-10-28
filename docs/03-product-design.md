# 03 · 产品设计

## 1. 一句话定位

**CueFlow 是 DSH 里的“可执行流程图”**：把编码与通用任务拆成有类型端口的节点，用画布编排 Skill、Command、Agent、Shell 和文件读取，并保留每次运行的证据。

不是“又一个聊天框”，也不是“让模型生成脚本”的黑盒；它面向需要**重复执行、逐步检查、局部替换、团队分享**的工作流。

## 2. 目标用户

| 用户 | 场景 | 需要 CueFlow 的原因 |
|---|---|---|
| 独立开发者 | 每天重复“拉 diff → 审查 → 修 → 测 → 总结” | 不想每次重写提示词；想固定流程、只换输入 |
| Tech Lead / 审查者 | 对一批改动做一致的多角度审查 | 图本身就是审查清单；节点输出可核对 |
| 工具/平台工程师 | 把团队约定固化成流程 | 可分享 JSON、可版本化、可逐步替换节点 |
| 非编码的 DSH 用户 | 研究报告、文档整理、批量转换 | 用 Input/Agent/Output 搭通用流水线 |

## 3. 核心用户故事

1. **重复编码流程**：我保存一个“实现功能”工作流，每次只改任务输入；它依次做规划、实现、测试、审查，最后输出变更摘要。
2. **审查当前 diff**：我从画布运行“审查 diff”，Shell 节点取 `git diff`，审查 Agent 输出问题列表，Condition 节点在发现问题时走“修复”分支。
3. **调用团队 Skill**：我把 `code-review`（仅用户可见）拖进 Skill 节点；它不出现在模型工具目录里，但工作流可以显式调用。
4. **调用 DSH 命令**：我用 Command 节点跑 `/simplify` 或团队自定义命令，保留命令执行日志。
5. **只重跑失败段**：一个节点失败后，我修好配置，只重跑该节点及其下游（MVP 先做“整图重跑”；局部重跑列入 M5）。
6. **分享流程**：我把 workflow JSON 发给同事；他导入后看到同样的节点、连线和默认参数，只改自己的会话即可运行。

## 4. MVP 范围

### 4.1 必须有

- 在 DSH 内可打开的 CueFlow 全屏面板（`main` + `sidebar.panellist`）。
- ComfyUI 式画布：平移/缩放、双击搜索新建、节点拖拽、端口拖线、删除、撤销/重做、框选（可后置）。
- 工作流库：新建、命名、保存、另存、删除、从模板新建、导入/导出 JSON。
- 节点：Input、Template、Agent、Skill、Command、Shell、File Read、Condition、Merge、Output、Note。
- 运行：输入表单、运行/取消、节点状态、节点输出预览、运行日志、运行历史。
- 校验：未知节点、缺失端口、类型不兼容、重复入边、成环、必填输入未连接。
- 持久化：workflow 与 run 分离；重启 DSH 后仍在。
- 测试：核心逻辑单元测试、Mock Host、独立 UI 页面、至少一次真实 DSH 手工 smoke。

### 4.2 应该有（MVP 后优先）

- 局部重跑 / 从失败节点继续。
- 子工作流节点（把一张图作为节点复用）。
- 节点分组、Reroute、Bypass 模式。
- 运行对比（两次 run 的节点输出 diff）。
- 导入/导出与模板市场。
- 节点级重试策略与失败分支。
- 运行事件 SSE（替代轮询）。

### 4.3 明确不做（MVP）

- 任意 JavaScript / Python 代码节点（安全与可审查性）。
- 在插件内直接创建新的 DSH Agent 会话（依赖 live Agent；见 D-010）。
- 修改 DSH 的 Agent loop / 工具权限模型。
- 多用户协作、云端同步、权限系统。
- 移动端适配（面板在窄窗口下可用即可）。
- 自动把运行结果写回会话日志（避免污染对话）。
- ComfyUI 节点包兼容层（不加载 ComfyUI 自定义节点）。

## 5. 设计原则

1. **图是事实**：执行顺序、数据依赖、分支都从图推导；不存在隐藏的“节点内部再调用另一个隐藏流程”。
2. **每一步可观察**：节点状态、输入、输出、错误、耗时都在 UI 可见；日志是补充，不是唯一入口。
3. **能力白名单**：节点类型是固定的、可审查的；不做“任意代码”逃生舱。
4. **DSH 原生**：Skill/Command/Agent/Shell/FS 都走 DSH 公开服务；不复制一套权限与生命周期。
5. **失败要可定位**：错误信息包含节点、端口、阶段、可操作建议；不要只抛一个 `Error`。
6. **保存的是流程，不是一次运行**：workflow 文件不包含运行输出；run 记录单独存。
7. **默认安全**：不允许隐式写文件、隐式执行命令；Shell/FS 节点必须显式配置，且继承 DSH 的执行策略。
8. **不打断对话**：面板是独立 main panel；运行使用 caller-delivery 子代理，不往父会话塞通知。

## 6. 关键交互决策

### 6.1 运行前输入

Input 节点有默认值，但运行对话框会再列一次，避免“改了默认值忘了保存”或“每次都要改节点”。运行输入只作用于本次 run，不回写 workflow（除非用户点“保存为默认”）。

### 6.2 目标会话

Agent/Skill/Command 节点需要一个 live Agent 作为父级。运行对话框显示 `ctx.agents.list()` 的 live 会话；默认选最近注册的一个。没有 live 会话时：

- 纯确定性图（Input/Template/Condition/Merge/Output/Note/Shell/File Read）仍可运行；
- 含 Agent/Skill/Command 的图在运行前校验失败，提示“先打开一个 DSH 会话”。

### 6.3 失败策略

MVP：任一节点失败 → 整个 run 标记 `error`，停止调度后续节点；已经运行完的节点保留输出。Condition 节点用“未走的分支”实现跳过，不用失败表达分支。

### 6.4 运行历史

每次 run 保存：workflow 快照、输入、目标会话、节点状态与输出（截断）、事件日志、耗时。默认保留最近 50 次；超过后按时间删除最旧。

## 7. 成功标准（MVP 验收）

| 编号 | 标准 | 验证方式 |
|---|---|---|
| A1 | 在 DSH 左侧栏能看到 CueFlow 入口，点击打开全屏面板 | 真实 DSH 手工 smoke |
| A2 | 能从空白画布创建 Input → Agent → Output 并保存 | 独立 UI 测试页 + 真实 DSH（Input→Template→Output 已跑；Agent API 已跑） |
| A3 | 能拖线连接兼容端口，拒绝不兼容端口与成环 | 单元测试 + UI/CDP 交互测试 |
| A4 | 能运行纯确定性图（Input → Template → Output）并看到输出 | Mock Host + 单元测试 + 真实 DSH |
| A5 | 能运行 Skill 节点，且 `modelInvocable:false` 的 Skill 也可用 | 从机 `code-review` 实机返回 `OK` |
| A6 | 能运行 Command 节点并看到成功/错误文本 | 从机 `/remote-use status` 返回状态文本 |
| A7 | 运行中可取消；节点状态与日志实时更新 | 单元测试 + 从机 UI 运行轮询；真实取消待跑 |
| A8 | 刷新页面/重启 DSH 后 workflow 仍在 | API 保存/读取 + 真实 DSH 文件落盘；重启未做 |
| A9 | 类型不兼容、必填未连接、未知节点在运行前被指出 | 单元测试 + UI |
| A10 | 不重启 DSH 即可跑完单元测试、构建 UI、截图验证 | `pnpm test` / `pnpm build` / `pnpm ui:shot` |

## 8. 文案与命名

- 产品名：**CueFlow**（中文界面也保留英文名，像 ComfyUI 一样作为专有名词）。
- 节点名用动宾或名词短语：`Input`、`Template`、`Agent`、`Skill`、`Command`、`Shell`、`Read File`、`Condition`、`Merge`、`Output`、`Note`。
- 运行状态：`Idle / Queued / Running / Success / Error / Skipped / Cancelled`。
- 错误文案格式：`节点「审查」· 输入 prompt：上游未产出文本。请连接一个输出文本的节点。`
- 不使用“魔法”“一键”之类无法验证的词；按钮文案直接说结果（`Run workflow`、`Cancel run`、`Save`）。

## 9. 与 DSH 其它插件的关系

- 不替代 `workflow` 工具：DSH 的 `workflow` 是模型写脚本编排子代理；CueFlow 是人编辑图，二者可以共存。
- 不替代 `subagent` 工具：CueFlow 的 Agent 节点底层就是 subagent；只是由人显式编排。
- 不替代 `Skill` 工具：模型仍可通过 `skill` 工具调用可见 Skill；CueFlow 让用户把 Skill 作为流程步骤显式调用。
- 与 `dsh-plugin-notify`、`dsh-cost-meter` 等面板插件互不依赖；只共享 DSH 的 slot 与 token。
