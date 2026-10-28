# 16 · M6 计划：从可运行到可承载工作负载

> 来源：[14 · 工作负载差距](14-readiness-gaps.md)、[13 · 设计阐明](13-design-rationale.md)、[12 · 使用文档](12-user-guide.md)。
> 状态：M6-P0-1 实施中；其余按顺序推进。每项完成时更新状态、证据与决策表。

## 1. 目标与验收口径

M6 完成时，CueFlow 应能在一台真实开发机上反复执行编码工作流，满足：

- 敏感动作有显式审批，默认 fail-closed；
- 多个 run 有全局上限，不能拖垮 Host；
- 失败可重试/分流/局部重跑，而不是只能整图重跑；
- UI 刷新/DSH 重启后能接回运行，长任务有心跳；
- 用户能显式选择会话边界（隔离 / workflow 共享 / 父会话）；
- 有 CI、E2E、类型检查和可发布产物。

## 2. P0（上真实仓库前必须）

### M6-P0-1 · 审批链

**状态**：✅ 已完成（单测/API/UI harness/从机真实面板均通过）

**范围**
- Shell/Command 节点增加 `approval: allow | ask | deny`，默认 `ask`；
- `ask` 时 Host 创建 pending approval，节点 `waiting-approval`，run 继续但不执行；
- 审批通过后执行一次；拒绝/取消/超时 fail-closed；
- 审批记录写入 run（`approvalId`、命令/动作、cwd、决定、时间）；
- UI 弹出审批面板，API 支持批准/拒绝；
- 运行取消/超时时清理 pending approval。

**验收**
- [x] `allow` 不弹审批，直接执行（executor unit）；
- [x] `ask` 在 UI 显示命令/动作，批准后执行，拒绝后节点 `error`（API + UI harness）；
- [x] 无审批通道时 `ask` 返回 `APPROVAL_UNAVAILABLE`，绝不静默执行；
- [x] 取消 run 后 pending approval 变 `cancelled`；
- [x] run JSON 含审批记录；
- [x] 单测覆盖 allow/ask/deny/cancel/unavailable；
- [x] 真实 DSH 面板验证一次 Shell 审批（从机 `<run-id>`）；Command 使用同一路径，待后续补。

### M6-P0-2 · API 认证 / CSRF

**状态**：✅ 已完成（API 测试 + 从机真实面板/无 header 403 验证）

**范围**：`X-CueFlow-Request` header + Origin/Sec-Fetch-Site 校验；只接受 JSON；公开部署走 DSH 已认证连接；匿名/跨站触发 `/runs` 返回 403。

**验收**：
- [x] 跨站 `text/plain` POST 被拒（403/415）；
- [x] 缺 CSRF header → 403 `CSRF_REQUIRED`；
- [x] 同源 UI 正常（API 测试 + UI harness）；
- [x] 错误不泄露内部细节；
- [x] 真实 DSH 面板 smoke（同源 UI 正常；无 header 403）。

### M6-P0-3 · 全局运行队列与预算

**状态**：✅ 已实现（单测通过）；真实从机并发 smoke 待做

**范围**：`maxActiveRuns`（默认 2）；每 run 的 wall-clock / Agent 调用数 / token 预算 / 输出上限；超额排队；取消清理子代理与 shell 进程。

**验收**：
- [x] 并发启动多个 run 时只运行 `maxActiveRuns` 个；
- [x] 队列位置可见；取消 queued run 生效；
- [x] 墙钟/Agent/Token 预算以 `RUN_BUDGET_EXCEEDED` 结束；
- [x] 从机真实并发 smoke（4 个 run；2 active + queued；取消 queued）。

### M6-P0-4 · 重试 / onError / 局部重跑

**状态**：✅ 已实现（retry/onError/局部重跑）；真实长节点 smoke 待补

**范围**：节点 `retry`（0–5）/`retryDelayMs`；`onError: fail | skip`；非幂等节点默认不自动重试；从失败节点继续（保留上游输出）；run 记录 attempt。

**验收**：
- [x] 瞬时失败自动重试；
- [x] `onError=skip` 下游按缺失输入处理；
- [x] run 记录 attempts / `node/retry`；
- [x] 局部重跑不重复执行已成功上游（seedValues + upstream closure）；
- [ ] 真实 DSH smoke。

### M6-P0-5 · 运行恢复与心跳

**状态**：⚠️ 部分实现：heartbeat/active list/自动接回已完成；真实长任务 smoke 待做

**范围**：active runs 列表 + UI 自动重连；节点 heartbeat/阶段日志；DSH 重启后 interrupted run 可诊断；不在内存的 run 只读展示。

**验收**：
- [x] 运行中刷新页面能接回；
- [x] 10s heartbeat；
- [x] `GET /runs` 包含 running/queued；
- [x] 重启后 interrupted run 由 store recovery 标记；
- [x] 从机真实 remount 自动接回 + heartbeat（<run-id>）；
- [ ] workflow selector 修正后的从机 smoke。

### M6-P0-6 · 真实取消

**状态**：✅ 已完成（Shell + Agent 取消从机验证；abort-all/drain 可选）

**范围**：真实 Agent + Shell 运行中取消；child session dispose、shell 子进程终止；失败 vs 取消策略可配置。

**验收**：
- [x] 真实 Shell 运行中取消，2s 内 `cancelled`（<run-id>）；
- [x] 真实 Agent 运行中取消，5s 内 `cancelled`（<run-id>）；
- [x] `abort-all` / `drain` 可选（单测覆盖；从机 drain smoke 待补）。

## 3. P1（规模化与体验）

### M6-P1-1 · 显式会话模式

**状态**：⚠️ 已开放 `isolated` / `inherit`；`workflow` / `parent` 待实现

**范围**：run 级 `sessionMode: isolated | inherit | workflow | parent`。
- `isolated`：当前行为，每节点 child（默认）；
- `inherit`：选择 `fork` provider，child 继承父会话快照，仍不写回父会话；
- `workflow`：一次 run 复用一个 child，保留多步上下文，不污染父会话；
- `parent`：在选中的父会话执行，结果写回对话；要求父会话 idle + 单 run 锁 + 警告。

**验收**：
- [x] UI 可选 `isolated` / `inherit`；非法值被 validation 拒绝；
- [x] run JSON 记录 `settings.sessionMode`；
- [ ] `workflow` 共享 child（需要 child turn 结果收集 API）；
- [ ] `parent` 写回父会话（需要父会话 turn API）。

**前置结论**：DSH 有 `ctx.subagents.sendMessage()`，但只返回 inbox id，不提供等待该 turn 结果的宿主 API；`parent` 也没有向自身发送 turn 的公开 seam。不能把两种模式伪装成可用。

### M6-P1-2 · 循环 / fan-out / 子工作流

**范围**：Map 节点或数组输入；子图节点引用 workflow + 输入/输出映射；并发上限；递归深度限制。

**验收**：对 10 个文件逐项执行；子图可复用；失败项可定位。

### M6-P1-3 · 持久化与版本

**范围**：workflow 版本/回滚；自动保存/草稿；schema 迁移；workspace 级存储；保留策略配置；审计身份。

**验收**：保存产生版本；崩溃后可恢复草稿；旧 schema 自动迁移。

### M6-P1-4 · 编辑体验

**范围**：多选/复制粘贴/分组/Reroute；端口拖空白建节点；可搜索 Skill/Command；运行历史详情；窄窗口拖拽 E2E；键盘/ARIA。

**验收**：200 节点图可编辑；窄窗口拖拽可用；键盘完成核心流程。

### M6-P1-5 · 工程化与发布

**状态**：⚠️ Windows CI 已加入；类型检查/Playwright/发布/压测待做

**范围**：Windows CI（test/build/shot/E2E）；类型检查/lint；Playwright；npm 发布/CHANGELOG/兼容矩阵；安全测试/性能测试。

**验收**：
- [x] Windows CI：install / test / build / ui:build / ui:shot / pack dry-run；
- [ ] 类型检查/lint；
- [ ] Playwright 拖拽/运行/取消 E2E；
- [ ] npm 发布/CHANGELOG/兼容矩阵；
- [ ] 200 节点与并发 run 压测基线。

## 4. 实施顺序

```text
P0-1 审批链
  → P0-2 API 认证
  → P0-3 队列/预算
  → P0-4 retry/onError/局部重跑
  → P0-5 恢复/心跳
  → P0-6 取消
  → P1-1 会话模式
  → P1-2 循环/子图
  → P1-3 持久化/版本
  → P1-4 UX
  → P1-5 工程化
```

P0-1 与 P0-3 有交集（审批等待也占资源），但先做 P0-1 以关闭“Shell 可无审批执行”的最高风险。

## 5. 本轮变更记录

| 日期 | 变更 |
|---|---|
| 2026-10-28 | 建立 M6 计划；P0-1 审批链实现并通过测试 + approval 截图；P0-2 CSRF 防护实现；P1-1 会话模式纳入计划（当前默认 isolated）；真实 DSH smoke 待做 |
