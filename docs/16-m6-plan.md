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

**范围**：`maxActiveRuns`（默认 2）；每 run 的 wall-clock / Agent 调用数 / token 预算 / 输出上限；超额排队或 429；取消清理子代理与 shell 进程。

**验收**：并发启动 10 个 run 不压垮 Host；队列位置可见；超预算 run 以稳定错误码结束。

### M6-P0-4 · 重试 / onError / 局部重跑

**范围**：节点 `retry`（次数/退避）；`onError: fail | skip | branch`；非幂等节点默认不自动重试；从失败节点继续（保留上游输出）；run 记录 attempt。

**验收**：瞬时失败自动重试；`onError=skip` 下游按缺失输入处理；局部重跑不会重复执行已成功上游。

### M6-P0-5 · 运行恢复与心跳

**范围**：active runs 列表 + UI 自动重连；节点 heartbeat/阶段日志；DSH 重启后 interrupted run 可诊断；不在内存的 run 只读展示。

**验收**：运行中刷新页面能接回；30s 长 Agent 至少出现一次 heartbeat；重启后 run 状态不丢失。

### M6-P0-6 · 真实取消

**范围**：真实 Agent + Shell 运行中取消；child session dispose、shell 子进程终止；失败 vs 取消策略可配置。

**验收**：10s 内 run `cancelled`，无残留子进程/监听器。

## 3. P1（规模化与体验）

### M6-P1-1 · 显式会话模式

**范围**：run 级 `sessionMode: isolated | workflow | parent`。
- `isolated`：当前行为，每节点 child；
- `workflow`：一次 run 复用一个 child，保留多步上下文，不污染父会话；
- `parent`：在选中的父会话执行，结果写回对话；要求父会话 idle + 单 run 锁 + 警告。

**验收**：三种模式在 UI 可选；`workflow` 的“审查→修改→测试”能引用前一步上下文；`parent` 结果出现在父会话且不会并发冲突；run JSON 记录 mode/childId。

**前置**：确认 DSH 是否支持向已有 child session 追加 turn；不支持则先实现 fork + 摘要，不假装支持。

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

**范围**：Windows CI（test/build/shot/E2E）；类型检查/lint；Playwright；npm 发布/CHANGELOG/兼容矩阵；安全测试/性能测试。

**验收**：PR 必须全绿；发布包可安装；200 节点图与并发 run 压测有基线。

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
