# P1-1 workflow 共享子会话：真实从机验证记录

日期：2026-10-28  
环境：从机 `<test-host>`，主 `desktop` profile，DSH `0.2.1-rc.3`  
工作流：`wf_m6_workflow_session`，两个串行 Agent 节点（`a1` → `a2.context`），`sessionMode=workflow`。

## 结果

| run | a1 | a2 | a1 childId | a2 childId | 结论 |
|---|---|---|---|---|---|
| `<run-id>` | success | success | `session-511a...` | `session-a1a3...` | 未复用 |
| `<run-id>` | success | success | `session-7ea8...` | `session-5d31...` | 未复用 |
| `<run-id>` | success | success | `session-2d14...` | `session-f594...` | 未复用 |
| `<run-id>` | success | success | `session-1fc1...` | `session-1397...` | 未复用 |

两节点输出均正确（`FIRST` / `SECOND`），但第二个节点使用了新的 child session，说明 workflow 模式没有达到“同一 child 复用”的验收。

## 已尝试

1. 保存 `activation.childId`，第二个节点 `ctx.agents.get(childId)`；
2. 保存 `activation.handle.agent`（receipt 未暴露 handle）；
3. `ctx.subagents.sendMessage(parent, childId, ...)` 冷恢复，再轮询 `agents.get` 2 秒。

仍取不到活着的 child；API 层已回退为只开放 `isolated` / `inherit`，`workflow` 保持未开放，避免虚假验收。
