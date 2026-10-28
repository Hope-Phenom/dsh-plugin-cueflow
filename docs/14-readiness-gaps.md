# 14 · 工作负载差距

> “能跑通”不等于“能作为工作负载”。本文按 **P0（上真实仓库前必须）** / **P1（规模化）** 列出差距、验收标准与当前状态。
> 当前已验证：62 个测试、从机主 `desktop` profile、面板 + UI run、Agent/Skill/Command/Shell/File。真实取消与极窄拖拽 E2E 仍未覆盖，但它们是本文 P1 的一小部分。

## 0. 两种“工作负载”

| 场景 | 门槛 |
|---|---|
| 单人桌面日常使用 | P0 的审批、运行上限、失败恢复、长任务可观测 |
| 团队/公开 Web/多用户 | P0 全部 + 认证/CSRF、隔离、审计、版本化、发布流程 |

没有 P0 的 `Shell/Command` 审批和运行上限时，建议只在受控的本地仓库、`workspace-write` 或更低权限下使用。

## 1. P0 安全与可控性

### P0-1 Shell/Command 审批链

**状态**：✅ 已实现（M6-P0-1），UI harness + 单测/API 测试通过；真实 DSH 面板待最终 smoke。

**实现**：Shell/Command 节点增加 `approval: ask | allow | deny`，默认 `ask`。`ask` 时 Host 创建 pending approval，节点进入 `waiting-approval`；UI 显示命令/动作，批准一次后执行，拒绝/超时/无通道 fail-closed。审批记录写入 run JSON（approvalId、动作、命令、cwd、状态、时间）。`allow`/`deny` 是显式的 workflow 配置。

**为什么不是直接复用 `ctx.approval`**：DSH 的 `ctx.approval.request()` 要求 open turn；CueFlow run 在 Host 中执行，不在 DSH turn 内。因此实现 Host 自有的一次性审批队列，不伪装成 DSH tool approval。

**验收**：
- [x] 节点配置 `ask` / `allow` / `deny`；
- [x] `ask` 时 UI 显示命令/动作，批准后执行，拒绝后节点 `error`；
- [x] 无审批通道时 `APPROVAL_UNAVAILABLE`，绝不静默执行；
- [x] 运行取消时 pending approval 变 `cancelled`；
- [x] run JSON 含审批记录；
- [x] 单测覆盖 allow/ask/deny/cancel/unavailable；
- [ ] 真实 DSH 面板手工验证 Shell + Command（待重启/安装最新 Host）。

### P0-2 API 认证/CSRF

**现状**：`/api/dsh/dsh-plugin-cueflow` 直接注册在 `ctx.webServer`，无 token/Origin 校验；桌面版在回环端口风险较低，`dsh web` 公开部署时不可接受。

**验收**：
- 校验 `Origin`/`Sec-Fetch-Site` 或 CSRF token；
- 只接受 `application/json`；
- 公开部署走 DSH 已认证连接；`/runs` 不允许匿名触发；
- 失败返回 401/403，不泄露内部信息。

### P0-3 全局运行队列与预算

**现状**：每个 run 有节点并发，但没有全局 active run 上限；连续启动多个长 Agent/Shell 会耗尽资源。

**验收**：
- 每 profile `maxActiveRuns`（建议 1–4）与每会话上限；
- 每 run `maxWallClockMs`、`maxAgentCalls`、`maxTokenBudget`、`maxOutputChars`；
- 超限时排队或 429/409，并在 UI 显示队列位置；
- 取消时清理子代理、shell 子进程、定时器。

### P0-4 失败恢复与重试

**现状**：fail-fast；无 retry/backoff/onError 分支；失败后只能整图重跑。

**验收**：
- 节点 `retry`（次数/退避/可重试错误码）；
- `onError: fail | skip | branch`；
- 非幂等节点（Shell/Command）默认不自动重试；
- 从失败节点继续（保留上游输出）或至少“整图重跑”；
- run 记录保留每次 attempt。

### P0-5 长任务可观测与重连

**现状**：Agent 节点只有 start/end 事件；UI 刷新后不会自动接回 active run；只能靠已知 run id 查询。

**验收**：
- active runs 列表 + 自动重连；
- 节点 heartbeat/阶段日志（至少 10–30s 一次）；
- UI 显示 elapsed、最近事件、子代理 id；
- 插件重启后把 interrupted run 展示为可诊断状态，而不是静默丢失。

### P0-6 取消语义

**现状**：单元测试覆盖 abort；真实子代理 dispose、Shell 子进程终止未在从机验证；fail-fast 不主动取消正在运行的节点。

**验收**：
- 真实 Agent + Shell 运行中取消，10s 内状态 `cancelled`；
- child session 结束、进程退出、监听器移除；
- 失败 vs 取消的策略可配置（drain / abort-all）。

## 2. P1 工作流表达力

| 缺口 | 为什么需要 | 验收 |
|---|---|---|
| 循环 / fan-out / map | 对文件、测试用例逐项执行 | `Map` 节点或子图输入数组，输出数组，支持并发上限 |
| 子工作流 | 复用“审查/实现/测试”子图 | 子图节点引用 workflow id + 输入/输出映射；递归有上限 |
| JSON 变换 | 从 Agent 结构化输出取字段 | 安全 JSONPath/模板，不执行任意代码 |
| HTTP 节点 | 调内部 API/webhook | URL/方法/头/体；凭据走 DSH credentials；重试/超时 |
| 文件写/patch | 确定性落盘 | 走 `ctx.fs`，带 observation policy/审批；支持 dry-run |
| 人工审批/等待 | 危险操作前暂停 | Wait/Approve 节点，恢复后继续；超时策略 |
| 批量输入/触发 | 定时/批量跑同一图 | API/CLI 批量输入；可接 DSH schedule |
| 运行对比 | 两次 run 的节点 diff | 选择两次 run，节点输出/耗时对比 |

## 3. P1 持久化、版本与协作

- **Workflow 版本**：保存即覆盖，没有版本/diff/回滚；至少保留最近 N 版。
- **自动保存/草稿恢复**：刷新/崩溃会丢未保存修改。
- **Schema 迁移**：只有 `schemaVersion: 1`，没有迁移器。
- **Workspace 隔离**：workflows 存在全局 `$DSH_HOME`；多项目需要 workspace-scoped 库。
- **审计身份**：run 记录有 sessionId/cwd，但没有“谁触发”的身份；多用户需要。
- **保留策略配置**：run 固定 50 条；需要按项目/时间/大小配置。
- **多实例并发写**：store 原子写但没有跨进程锁；多个 DSH 实例共享 `$DSH_HOME` 时有覆盖风险。

## 4. P1 编辑体验

- 多选/框选/复制粘贴/节点分组/Reroute/对齐；
- 拖端口到空白处弹出候选节点；
- 大 catalog 下 Skill/Command 可搜索选择器（现在是下拉）；
- 运行历史列表、run 详情、从历史 run 恢复；
- 断网/API 不可用的离线态与重试；
- 键盘导航/ARIA 审计；
- 极窄窗口拖拽 E2E（你提到的项）；
- 画布性能：200 节点/500 边下的渲染与拖拽。

## 5. P1 工程化与发布

| 缺口 | 验收 |
|---|---|
| CI（Windows runner） | `pnpm test` + build + UI 截图 + E2E 全绿 |
| 类型检查 / lint | 至少 `tsc --checkJs` 或迁移 TS；ESLint/格式检查 |
| 浏览器 E2E | Playwright 覆盖拖拽、连线、运行、取消；可截图对比 |
| 发布 | npm 包（当前 `private: true`）、版本号、CHANGELOG、兼容矩阵 |
| 存储迁移测试 | 旧 schema → 新 schema 自动迁移，失败可回滚 |
| 遥测/错误关联 | runId → node → child session → command 的可追踪链路 |
| 安全测试 | CSRF/Origin、路径遍历、超大 body、恶意 workflow、审批拒绝 |
| 性能测试 | 200 节点图加载/保存/执行；并发 run 压测 |

## 6. 最小生产门槛（建议）

如果只做 6 件事，按顺序：

1. **P0-1 审批链**；
2. **P0-3 全局队列 + 预算**；
3. **P0-4 retry + onError + 局部重跑**；
4. **P0-5 active run 重连 + heartbeat**；
5. **P1 循环/fan-out + 子工作流**；
6. **CI + Playwright + 类型检查**。

完成 1–4 后，单用户可以在真实仓库上日常使用；完成 5–6 后才适合团队/生产。

## 7. 当前状态对照

| 项 | 状态 |
|---|---|
| 真实取消中的子代理 | ❌ 单测覆盖，真实未跑 |
| 极窄窗口拖拽 E2E | ❌ 未跑 |
| Shell/Command 审批 | ❌ 未接入 |
| 全局 run 队列/预算 | ❌ 未实现 |
| retry/onError/局部重跑 | ❌ 未实现 |
| active run 重连/heartbeat | ❌ 未实现 |
| 循环/fan-out/子图 | ❌ 未实现 |
| workflow 版本/自动保存 | ❌ 未实现 |
| CI/E2E/类型检查 | ❌ 未实现 |
| 从机主 profile 实机 | ✅ 已通过 |
| 真实性 Skill/Command/Shell/Agent | ✅ 已通过 |

> 这不是“全部都要一次做完”的清单；它是按风险排序的路线图。P0-1 到 P0-4 是投入产出最高的四项。
