# 15 · API 参考

> Host 路由：`/api/dsh/dsh-plugin-cueflow`。所有响应为 JSON；错误响应统一 `{ ok:false, code, error, details? }`。
> 该路由由 DSH Web 服务器/Electron IPC 承载，默认只在本机回环使用；公开部署前必须使用 DSH 的已认证 Web 表面（见 [14](14-readiness-gaps.md#p0-2-api-认证csrf)）。

## 0. 请求保护（CSRF）

所有 `POST/PUT/PATCH/DELETE` 必须带：

```http
X-CueFlow-Request: 1
Content-Type: application/json
```

- 自定义 header 让跨站表单无法直接触发；跨源请求的 preflight 不会被放行；
- `Sec-Fetch-Site: cross-site` / 不匹配的 `Origin` → 403 `ORIGIN_REJECTED`；
- 缺 header → 403 `CSRF_REQUIRED`；
- 有 body 但非 JSON → 415 `UNSUPPORTED_MEDIA_TYPE`。

这是 CSRF 防护，不是身份认证。公开部署仍需 DSH 的登录/连接认证；CueFlow 不额外监听端口。

## 1. 健康与能力

### `GET /health`

```json
{
  "ok": true,
  "name": "CueFlow",
  "version": "0.1.0",
  "dsh": "",
  "capabilities": {
    "skills": true, "commands": true, "agents": true, "subagents": true,
    "shell": true, "fs": true, "sandboxPolicy": true, "webServer": true
  },
  "storage": "local-json"
}
```

### `GET /catalog?cwd=...&sessionId=...`

返回 node types、skills、commands、live agents、templates、能力与警告。

```json
{
  "ok": true,
  "version": "0.1.0",
  "cwd": "E:\\WorkSpace\\repo",
  "nodeTypes": [ { "type": "agent", "title": "Agent", "inputs": [], "outputs": [], "fields": [] } ],
  "categories": [ { "id": "agents", "title": "Agents", "color": "#b79ce0" } ],
  "skills": [ { "name": "code-review", "modelInvocable": false, "userInvocable": true } ],
  "skillsComplete": true,
  "commands": [ { "name": "remote-use", "description": "..." } ],
  "agents": [ { "id": "session-...", "status": "idle", "model": "deepseek-flash" } ],
  "defaultSessionId": "session-...",
  "templates": [ { "id": "review-diff", "name": "Review a diff", "workflow": {} } ],
  "capabilities": { "skills": true, "commands": true, "agents": true, "shell": true, "fs": true, "sandboxPolicy": true },
  "warnings": []
}
```

## 2. Workflow

### `GET /workflows?workspace=<cwd>`

```json
{ "ok": true, "workflows": [ { "id": "wf_...", "name": "...", "updatedAt": 0, "nodeCount": 3, "edgeCount": 2 } ], "errors": [] }
```

`workspace` 可选；新 workflow 会写到 `workspaces/<hash>/workflows`，没有 workspace 的 legacy workflow 仍会出现在所有列表。`POST /workflows` 可带 `cwd`，Host 会把它写入 `settings.workspace`。读取/版本/删除路由也可带 `workspace`，优先 workspace 目录、回退全局。

### `GET /workflows/:id` → `{ ok, workflow }`

### `POST /workflows` — upsert

```json
{ "workflow": { "schemaVersion": 1, "id": "wf_...", "name": "...", "nodes": [], "edges": [], "settings": { "concurrency": 2 } } }
```

成功返回 `{ ok:true, workflow }`；校验失败返回 422：

```json
{ "ok": false, "code": "VALIDATION_FAILED", "error": "Workflow validation failed: 1 error, 0 warnings.", "details": { "issues": [] } }
```

### `DELETE /workflows/:id` → `{ ok:true }`

### `GET /workflows/:id/versions`

```json
{ "ok": true, "versions": [
  { "version": "1793156000000", "savedAt": 1793156000000, "name": "Review a diff", "nodeCount": 3, "edgeCount": 2 }
] }
```

### `GET /workflows/:id/versions/:version` → `{ ok, workflow }`

### `POST /workflows/:id/versions/:version/restore` → `{ ok, workflow }`

恢复会先归档当前版本，再写回历史快照；每次保存保留最近 20 版。

### `POST /validate`

```json
{ "workflow": {} }
```

返回**200**，即使图无效：

```json
{ "ok": true, "valid": false, "summary": "1 error, 0 warnings.", "issues": [
  { "severity": "error", "code": "REQUIRED_INPUT_UNCONNECTED", "message": "...", "nodeId": "n3", "port": "value" }
] }
```

## 3. Run

### `POST /runs`

```json
{
  "workflow": { "schemaVersion": 1, "id": "wf_...", "name": "...", "nodes": [], "edges": [], "settings": {} },
  "inputs": { "n1": "hello" },
  "sessionId": "session-...",
  "cwd": "E:\\WorkSpace\\repo",
  "concurrency": 2
}
```

- `workflow` 是运行快照；不要求已保存。
- `sessionId` 是 Agent/Skill/Command 的父 Agent；省略时 Host 选最后一个 live agent。
- `cwd` 是 Shell/File/子代理目录；省略时用 workflow `settings.cwd`，再退到进程 cwd。
- `settings.sessionMode`：`isolated`（默认）或 `inherit`（fork 继承父快照）。`workflow` / `parent` 当前会被 validation 拒绝。
- `settings.cancelPolicy`：`abort-all`（默认）或 `drain`（停止启动新节点，等待 running 完成）。
- 运行前校验：结构/端口/环/必填 Input；含 LLM 节点但无 live agent → 422 `LIVE_AGENT_REQUIRED`。
- 成功返回 201，`run.status` 初始 `running`。

```json
{
  "ok": true,
  "run": {
    "schemaVersion": 1,
    "id": "run_...",
    "workflowId": "wf_...",
    "workflowName": "...",
    "workflowSnapshot": {},
    "status": "running",
    "inputs": {},
    "sessionId": "session-...",
    "cwd": "E:\\WorkSpace\\repo",
    "createdAt": 0, "startedAt": 0, "endedAt": null,
    "nodeStates": { "n1": { "status": "running", "startedAt": 0, "attempts": 1, "outputs": {}, "preview": "", "error": null } },
    "events": [],
    "outputs": {},
    "error": null
  }
}
```

### `GET /runs?limit=20`

返回 run 摘要列表（按结束/创建时间倒序）。列表合并内存中的 `running/queued` 记录，因此运行中的 run 不会因为落盘状态滞后而消失；`queued` 行带 `queuePosition`。

### `GET /runs/:id?after=<seq>`

- 省略 `after`：返回全部事件；
- `after=N`：只返回 `seq > N` 的事件；
- `run.events` 本身是空数组，事件在顶层 `events` 中；`nodeStates` 始终是完整快照。

```json
{
  "ok": true,
  "run": { "id": "run_...", "status": "completed", "nodeStates": {}, "outputs": {} },
  "events": [
    { "seq": 0, "time": 0, "type": "run/start", "message": "Run started" },
    { "seq": 1, "time": 0, "type": "node/start", "nodeId": "n1", "message": "Running Task" },
    { "seq": 2, "time": 0, "type": "node/end", "nodeId": "n1", "message": "Completed Task" },
    { "seq": 3, "time": 0, "type": "node/heartbeat", "nodeId": "n2", "message": "Review still running" },
    { "seq": 4, "time": 0, "type": "run/end", "message": "Run completed" }
  ]
}
```

### `POST /runs/:id/cancel`

- 运行中：abort；返回 200 + 当前 run；
- 已结束：409 `RUN_CONFLICT`；
- 不存在：404。

### `POST /runs/:id/rerun`

```json
{ "fromNodeId": "n2" }
```

- 只允许已结束的 run；运行中返回 409；
- 默认从 `run.error.nodeId` 或第一个 error 节点继续；
- 计算 `fromNodeId` 的上游闭包，把其中成功节点的 outputs 作为新 run 的 `seedValues`；
- 新 run 不重复执行这些上游节点，只执行 `fromNodeId` 及其下游；
- 返回 201 + 新 run；`seeded` 列出被复用的节点 id。

### `POST /runs/:id/approvals/:approvalId`

```json
{ "decision": "allow" }
```

- `allow` → 一次性批准；节点继续执行；
- `reject` → 节点 `error`，run `error`；
- 非 pending：409 `APPROVAL_CONFLICT`；
- 找不到：404 `APPROVAL_NOT_FOUND`；
- 进程重启后旧 pending approval 不在 live map：409 `APPROVAL_NOT_LIVE`（不会误执行）。

## 4. 数据模型

### WorkflowDocument

```json
{
  "schemaVersion": 1,
  "id": "wf_...",
  "name": "Review a diff",
  "description": "",
  "createdAt": 0,
  "updatedAt": 0,
  "nodes": [
    { "id": "n1", "type": "input", "title": "Task", "position": { "x": 40, "y": 80 },
      "config": { "label": "Task", "valueType": "text", "defaultValue": "", "required": true },
      "disabled": false }
  ],
  "edges": [
    { "id": "e1", "from": { "node": "n1", "port": "value" }, "to": { "node": "n2", "port": "value" } }
  ],
  "settings": { "concurrency": 2, "cwd": "", "defaultProvider": "", "defaultModel": "", "sessionMode": "isolated", "cancelPolicy": "abort-all" }
}
```

### RunRecord

字段：`id/workflowId/workflowName/workflowSnapshot/status/inputs/sessionId/cwd/triggeredBy/createdAt/startedAt/endedAt/nodeStates/approvals/budget/outputs/error/events`。`queuePosition` 仅在 `queued` 时存在。`triggeredBy` 由 `body.triggeredBy`、`X-CueFlow-Actor` 或默认 `local` 填充；UI 发送 `cueflow-ui`。

`budget`：

```json
{
  "maxWallClockMs": 1800000,
  "maxAgentCalls": 50,
  "maxTokens": 0,
  "agentCalls": 0,
  "tokens": 0,
  "startedAt": 0
}
```

- 全局同时运行的 run 数默认 2（`CUEFLOW_MAX_ACTIVE_RUNS`）；
- 超出 `maxWallClockMs` / `maxAgentCalls` / `maxTokens` 时 run 以 `RUN_BUDGET_EXCEEDED` 结束；
- `maxTokens: 0` 表示不限制；只有 adapter 返回 usage 时才累计 token。

`approvals[id]`：

```json
{
  "id": "apr_...",
  "nodeId": "n2",
  "nodeTitle": "git diff",
  "action": "shell",
  "detail": { "command": "git diff", "workdir": "E:\\WorkSpace\\repo" },
  "status": "pending",
  "requestedAt": 0,
  "decidedAt": null
}
```

`status`: `pending` / `allowed-once` / `rejected` / `cancelled`。

`nodeStates[id]`：

```json
{
  "status": "success",
  "startedAt": 0, "endedAt": 0, "durationMs": 0, "attempts": 1,
  "outputs": { "text": "hello!" },
  "preview": "hello!",
  "error": null,
  "logs": []
}
```

运行状态：`queued/running/completed/error/cancelled`。
节点状态：`idle/queued/waiting-approval/running/success/error/skipped/cancelled`。
长节点每 10s 发 `node/heartbeat`（type，不改变状态）。

## 5. 错误码

| HTTP | code | 含义 |
|---|---|---|
| 400 | `BAD_REQUEST` | 结构错误/缺字段 |
| 400 | `BAD_JSON` | body 不是 JSON（BOM 已容忍） |
| 404 | `NOT_FOUND` | workflow/run 不存在 |
| 405 | `METHOD_NOT_ALLOWED` | 方法不支持 |
| 409 | `RUN_CONFLICT` | run 已结束，不能重复取消 |
| 409 | `APPROVAL_CONFLICT` | approval 已决定 |
| 409 | `APPROVAL_NOT_LIVE` | approval 不属于当前 live run |
| 400 | `RERUN_INVALID` | 局部重跑没有失败节点/节点不存在 |
| 500 | `RUN_BUDGET_EXCEEDED` | 墙钟/Agent/Token 预算超限（run.error.code） |
| 404 | `APPROVAL_NOT_FOUND` | approval 不存在 |
| 400 | `APPROVAL_INVALID` | 决定不是 allow/reject |
| 409 | `CAPABILITY_MISSING` | 缺少 DSH 服务（部分路径） |
| 413 | `BODY_TOO_LARGE` | body 超过 1 MiB |
| 422 | `VALIDATION_FAILED` | 图/运行输入校验失败 |
| 500 | `STORE_CORRUPT` | workflow/run JSON 损坏 |
| 500 | `INTERNAL` | 未分类错误 |

## 6. 限制

- body 1 MiB；workflow ≤ 200 节点 / 500 边；
- 单节点输出截断 20k 字符；事件上限 2000；
- run 历史保留 50 条；内存事件按需轮询；
- 不提供任意代码执行；Shell/FS/Command/Skill 都是白名单节点。

## 7. 会话语义（调用方必读）

- `sessionId` 是**父 Agent**，不是“所有节点共享的会话”。
- Agent/Skill 节点通过 `ctx.subagents.startActivation` 创建 child session；默认 `spawn`，可用 `fork`；`delivery:'caller'` 不写父会话。
- Command 节点通过 `ctx.commands.execute(parent, …)` 在父会话执行，命令生命周期留在父会话。
- Shell/File 节点是 Host 进程能力，不进入会话消息。
- CueFlow 自己的 run 记录独立存储；不要把 run 当成 DSH 对话 turn。

## 8. curl 示例（PowerShell）

PowerShell 5.1 的 `Set-Content -Encoding UTF8` 会写 BOM；CueFlow 已容忍，但推荐 ASCII/无 BOM：

```powershell
$body = '{"workflow":{"schemaVersion":1,"id":"wf_demo","name":"demo","nodes":[],"edges":[],"settings":{"concurrency":1}},"inputs":{}}'
Set-Content -LiteralPath body.json -Value $body -Encoding ascii
curl.exe -sS -X POST -H Content-Type:application/json -H X-CueFlow-Request:1 --data-binary "@body.json" `
  http://127.0.0.1:60167/api/dsh/dsh-plugin-cueflow/runs
```

## 9. 扩展点

- 新节点类型：`shared/node-types.js` + `lib/core/adapters.js` + 测试 + [05](05-node-reference.md)；
- 新 DSH 能力：在 `lib/index.js` 增加可选 `ctx.inject`，在 adapter 做防御性读取；
- 新事件：`executor.js` 的 `pushEvent`；前端轮询按 `seq` 增量消费；
- 新 UI 面板：`main` keyed slot；不要静态 import DSH 内部组件。

## 10. 未完成

认证/CSRF、审批链、全局队列/预算、retry/onError、active run 重连、heartbeat、workflow 版本、CI/E2E 均未实现。见 [14 · 工作负载差距](14-readiness-gaps.md)。
