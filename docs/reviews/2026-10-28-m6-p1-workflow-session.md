# P1-1 workflow 共享子会话：真实从机验证记录

日期：2026-10-28  
环境：从机 `<test-host>`，主 `desktop` profile，DSH `0.2.1-rc.3`  
工作流：`wf_m6_workflow_session`，两个串行 Agent 节点（`a1` → `a2.context`），`sessionMode=workflow`。

## 最终结果

| run | a1 | a2 | a1 childId | a2 childId | 结论 |
|---|---|---|---|---|---|
| `<run-id>` | success | success | `<session-id>...` | `<session-id>...` | ✅ 同一 child |

两个节点输出 `FIRST` / `SECOND`，`a2` 通过 `sendMessage` 冷恢复同一个 child。

## 早期失败与修复

早期 4 次运行（`<run-id>`、`<run-id>`、`<run-id>`、`<run-id>`）均生成不同 childId。  
根因：`sendMessage(sender, targetId, content, options)` 的 `options.signal` 是必需参数，之前漏传，冷恢复失败后回退到新 child。

官方文档：[子代理 · sendMessage](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/subagent.md) 与 [SubagentActivation](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/subagent.md)。

修复：`lib/core/adapters.js` 传入 `{ signal: context.signal ?? new AbortController().signal }`，然后轮询 `agents.get`、`whenIdle`、读取 `session.snapshotEvents`。
