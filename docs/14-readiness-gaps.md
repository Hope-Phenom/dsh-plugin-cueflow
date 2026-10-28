# 14 · 工作负载差距

> “能跑通”不等于“能作为工作负载”。本文按 **P0（上真实仓库前必须）** / **P1（规模化）** 列出差距、验收标准与当前状态。
> 当前已验证：86 个测试、从机主 `desktop` profile、面板 + UI run、审批/CSRF/队列/重试/心跳/Shell + Agent 取消。极窄拖拽 E2E 仍未覆盖。

## 0. 两种“工作负载”

| 场景 | 门槛 |
|---|---|
| 单人桌面日常使用 | P0 的审批、运行上限、失败恢复、长任务可观测 |
| 团队/公开 Web/多用户 | P0 全部 + 认证/CSRF、隔离、审计、版本化、发布流程 |

没有 P0 的 `Shell/Command` 审批和运行上限时，建议只在受控的本地仓库、`workspace-write` 或更低权限下使用。

## 1. P0 安全与可控性

### P0-1 Shell/Command 审批链

**状态**：✅ 已完成（M6-P0-1），单测/API/UI harness + 从机真实面板均通过。

**实现**：Shell/Command 节点增加 `approval: ask | allow | deny`，默认 `ask`。`ask` 时 Host 创建 pending approval，节点进入 `waiting-approval`；UI 显示命令/动作，批准一次后执行，拒绝/超时/无通道 fail-closed。审批记录写入 run JSON（approvalId、动作、命令、cwd、状态、时间）。`allow`/`deny` 是显式的 workflow 配置。

**为什么不是直接复用 `ctx.approval`**：DSH 的 `ctx.approval.request()` 要求 open turn；CueFlow run 在 Host 中执行，不在 DSH turn 内。因此实现 Host 自有的一次性审批队列，不伪装成 DSH tool approval。

**验收**：
- [x] 节点配置 `ask` / `allow` / `deny`；
- [x] `ask` 时 UI 显示命令/动作，批准后执行，拒绝后节点 `error`；
- [x] 无审批通道时 `APPROVAL_UNAVAILABLE`，绝不静默执行；
- [x] 运行取消时 pending approval 变 `cancelled`；
- [x] run JSON 含审批记录；
- [x] 单测覆盖 allow/ask/deny/cancel/unavailable；
- [x] 真实 DSH 面板验证 Shell 审批（从机 `<run-id>`）；Command 同一路径，待补。

### P0-2 API 认证/CSRF

**状态**：✅ 已完成（M6-P0-2）；CSRF/Origin/JSON 防护 + 从机真实面板验证通过；身份认证依赖 DSH 的已认证 Web 表面。

**实现**：所有写请求要求 `X-CueFlow-Request: 1`；跨源 `Origin` / `Sec-Fetch-Site: cross-site` 拒绝；有 body 的请求必须 `application/json`。跨站表单无法设置自定义 header，跨源 preflight 也不会被放行。

**边界**：这不是身份认证。桌面版在回环端口；`dsh web` 公开部署必须经过 DSH 自己的登录/连接认证，CueFlow 不另开端口。

**验收**：
- [x] 校验 `Origin` / `Sec-Fetch-Site`；
- [x] 只接受 JSON body；
- [x] 缺 CSRF header → 403；跨源 → 403；
- [x] 同源 UI 正常；
- [x] 真实 DSH 面板 smoke（同源 UI 正常；无 header 403）。

### P0-3 全局运行队列与预算

**状态**：✅ 已实现（M6-P0-3）；真实从机 smoke 待做

**实现**：RunManager 全局 `maxActiveRuns`（默认 2）队列；queued run 有 `queuePosition`，UI 运行面板显示。每 run 记录 `budget`：墙钟上限（默认 30 分钟）、Agent 调用上限（默认 50）、Token 上限（默认 0/不限制，adapter 返回 usage 时统计）。超墙钟/Agent/Token 预算以 `RUN_BUDGET_EXCEEDED` 结束；取消 queued run 会移除队列并落盘。

**验收**：
- [x] 每 profile `maxActiveRuns`，超出的 run 排队；
- [x] `maxWallClockMs` / `maxAgentCalls` / `maxTokens` 字段与错误码；
- [x] UI 显示队列位置；
- [x] 取消 queued/active run 清理定时器与队列；
- [x] 从机真实并发 smoke（4 个 run，2 active + queued，取消 queued）。

### P0-4 失败恢复与重试

**状态**：✅ retry/onError/局部重跑已实现；真实长节点 smoke 待补

**实现**：Agent/Skill/Command/Shell/File 节点增加 `retry`（0–5）、`retryDelayMs`、`onError: fail | skip`；每个 attempt 记录 `attempts`，`node/retry` 事件；`skip` 会让该节点 `skipped` 并继续。Shell/Command 默认 `retry: 0`，避免自动重试副作用。`POST /runs/:id/rerun` 从失败节点继续：只 seed 上游成功节点，不再执行它们。

**验收**：
- [x] `retry` + backoff；
- [x] `onError: fail | skip`；
- [x] 非幂等节点默认不重试；
- [x] run 记录 attempts / retry 事件；
- [x] 从失败节点继续（保留上游输出）；
- [ ] 真实 DSH 长节点 smoke。

### P0-5 长任务可观测与重连

**状态**：✅ heartbeat/active list/UI 自动接回已实现；真实从机 remount 已验证

**实现**：节点每 10s 发 `node/heartbeat`；`GET /runs` 合并 running/queued 内存记录；UI bootstrap 检测 running/queued run 并自动加载其 workflow 快照/事件；加载 run 时同步 workflow selector 摘要。DSH 崩溃后的 running run 由既有 recovery 标记 error。

**验收**：
- [x] active runs 列表（`GET /runs` 包含 running/queued）；
- [x] UI remount 自动接回 active run（从机 `<run-id>`）；
- [x] heartbeat（10s）；
- [x] interrupted run 可诊断（store recovery）；
- [ ] workflow selector 修正后的从机 smoke。

### P0-6 取消语义

**状态**：✅ 已完成（Shell + Agent 取消从机验证；abort-all/drain 可选）

**实现**：`settings.cancelPolicy` 支持 `abort-all`（默认）与 `drain`；drain 停止启动新节点但让 running 节点自然完成。Shell/Agent signal 传入 adapter，Agent abort 时显式 dispose。queued run 取消从队列移除并落盘。

**验收**：
- [x] 真实 Shell 运行中取消，2s 内 `cancelled`；
- [x] 真实 Agent 运行中取消，5s 内 `cancelled`（<run-id>）；
- [x] 失败 vs 取消策略可配置（`abort-all` / `drain`；从机 drain <run-id> 验证：run cancelled，两个节点 success）。

## 2. P1 工作流表达力

| 缺口 | 为什么需要 | 验收 |
|---|---|---|
| 循环 / fan-out / map | 对文件、测试用例逐项执行 | ✅ Fan-out：数组逐项/并发（1–8）运行子 workflow，maxItems 100，`onItemError` fail/skip；从机 3 项输出 `a!/b!/c!` |
| 显式会话模式 | 多步 Agent 保留上下文 | 已开放 `isolated` / `inherit`；`workflow`/`parent` 待结果收集 API |
| 子工作流 | 复用“审查/实现/测试”子图 | ✅ Subflow 节点（workflowId + input/output 映射，深度上限 5）；从机 parent→child 输出 `nested!` |
| JSON 变换 | 从 Agent 结构化输出取字段 | 安全 JSONPath/模板，不执行任意代码 |
| HTTP 节点 | 调内部 API/webhook | URL/方法/头/体；凭据走 DSH credentials；重试/超时 |
| 文件写/patch | 确定性落盘 | 走 `ctx.fs`，带 observation policy/审批；支持 dry-run |
| 人工审批/等待 | 危险操作前暂停 | Wait/Approve 节点，恢复后继续；超时策略 |
| 批量输入/触发 | 定时/批量跑同一图 | API/CLI 批量输入；可接 DSH schedule |
| 运行对比 | 两次 run 的节点 diff | 选择两次 run，节点输出/耗时对比 |

## 3. P1 持久化、版本与协作

**状态**：⚠️ 版本/回滚、浏览器草稿恢复已实现；schema 迁移/workspace 隔离待做

- **Workflow 版本**：✅ 每次保存把旧版归档到 `workflows/.history/<id>/`，保留最近 20 版；API/UI 可列举、读取、恢复（从机 `wf_versions_smoke` 已验证）。
- **自动保存/草稿恢复**：✅ 编辑 700ms 后写入 localStorage 草稿；刷新/重开面板时若无 active run 自动恢复并标记 dirty；保存成功后清除。跨设备/清缓存仍会丢。
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
- 极窄窗口拖拽 E2E（你提到的项）：✅ Playwright `e2e/canvas.spec.js` 覆盖 900px 下添加/拖拽节点；
- 画布性能：200 节点/500 边下的渲染与拖拽。

## 5. P1 工程化与发布

| 缺口 | 验收 |
|---|---|
| CI（Windows runner） | ✅ test/build/ui:build/ui:shot/pack dry-run；E2E 待加 |
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
| 真实 Agent 取消 | ✅ Shell + Agent 取消已验证；drain/abort-all 可选 |
| 极窄窗口拖拽 E2E | ✅ Playwright 900px 添加/拖拽通过 |
| Shell/Command 审批 | ✅ 从机面板已验证 |
| 全局 run 队列/预算 | ✅ 从机队列已验证；墙钟/Token 单测 |
| retry/onError/局部重跑 | ✅ 单测；从机 onError=skip 已验证 |
| active run 重连/heartbeat | ✅ 从机 remount + heartbeat 已验证 |
| 循环/fan-out/子图 | ❌ 未实现 |
| workflow 版本/自动保存 | ⚠️ 版本/恢复已实现；自动保存未做 |
| CI/E2E/类型检查 | ⚠️ Windows CI 已加；E2E/类型检查未做 |
| 从机主 profile 实机 | ✅ 已通过 |
| 真实性 Skill/Command/Shell/Agent | ✅ 已通过 |

> 这不是“全部都要一次做完”的清单；它是按风险排序的路线图。P0-1 到 P0-4 是投入产出最高的四项。








