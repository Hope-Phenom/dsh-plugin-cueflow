# 15 · API 参考

> Host 路由：`/api/dsh/dsh-plugin-cueflow`。所有响应为 JSON；错误响应统一 `{ ok:false, code, error, details? }`。
> 该路由由 DSH Web 服务器/Electron IPC 承载，默认只在本机回环使用；公开部署前必须补认证/CSRF（见 [14](14-readiness-gaps.md#p0-2-api-认证csrf)）。

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

### `GET /workflows`

```json
{ "ok": true, "workflows": [ { "id": "wf_...", "name": "...", "updatedAt": 0, "nodeCount": 3, "edgeCount": 2 } ], "errors": [] }
```

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

返回 run 摘要列表（按结束/创建时间倒序）。

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
    { "seq": 3, "time": 0, "type": "run/end", "message": "Run completed" }
  ]
}
```

### `POST /runs/:id/cancel`

- 运行中：abort；返回 200 + 当前 run；
- 已结束：409 `RUN_CONFLICT`；
- 不存在：404。

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
  "settings": { "concurrency": 2, "cwd": "", "defaultProvider": "", "defaultModel": "" }
}
```

### RunRecord

字段：`id/workflowId/workflowName/workflowSnapshot/status/inputs/sessionId/cwd/createdAt/startedAt/endedAt/nodeStates/outputs/error/events`。

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
节点状态：`idle/queued/running/success/error/skipped/cancelled`。

## 5. 错误码

| HTTP | code | 含义 |
|---|---|---|
| 400 | `BAD_REQUEST` | 结构错误/缺字段 |
| 400 | `BAD_JSON` | body 不是 JSON（BOM 已容忍） |
| 404 | `NOT_FOUND` | workflow/run 不存在 |
| 405 | `METHOD_NOT_ALLOWED` | 方法不支持 |
| 409 | `RUN_CONFLICT` | run 已结束，不能重复取消 |
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
curl.exe -sS -X POST -H Content-Type:application/json --data-binary "@body.json" `
  http://127.0.0.1:60167/api/dsh/dsh-plugin-cueflow/runs
```

## 9. 扩展点

- 新节点类型：`shared/node-types.js` + `lib/core/adapters.js` + 测试 + [05](05-node-reference.md)；
- 新 DSH 能力：在 `lib/index.js` 增加可选 `ctx.inject`，在 adapter 做防御性读取；
- 新事件：`executor.js` 的 `pushEvent`；前端轮询按 `seq` 增量消费；
- 新 UI 面板：`main` keyed slot；不要静态 import DSH 内部组件。

## 10. 未完成

认证/CSRF、审批链、全局队列/预算、retry/onError、active run 重连、heartbeat、workflow 版本、CI/E2E 均未实现。见 [14 · 工作负载差距](14-readiness-gaps.md)。
