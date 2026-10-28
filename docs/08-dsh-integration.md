# 08 · DSH 集成

> 本文是实现契约。Host 侧代码不得 import `@deepseek-ai/*`；Client 侧不得 import DSH 内部包。所有 DSH 能力经由 `ctx` 注入。

## 1. 包清单

```json
{
  "name": "dsh-plugin-cueflow",
  "version": "0.1.0",
  "type": "module",
  "main": "lib/index.js",
  "icon": "./assets/icon.svg",
  "exports": {
    ".": "./lib/index.js",
    "./client": "./lib/client.js",
    "./package.json": "./package.json",
    "./locale/*.json": "./locale/*.json"
  },
  "files": [
    "lib",
    "shared",
    "assets",
    "locale",
    "cordis.patch.yml",
    "README.md",
    "README.zh.md"
  ],
  "scripts": {
    "build": "node scripts/build-client.mjs",
    "test": "node --test test/*.test.js",
    "ui": "vite ui --port 5199",
    "ui:build": "vite build ui --outDir ../.ui-dist",
    "ui:shot": "node scripts/screenshot-ui.mjs"
  },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web" }
  },
  "engines": { "dsh": ">=0.2.0 <0.3.0", "node": ">=20" }
}
```

`cordis.patch.yml`：

```yaml
- insert:
    - id: dsh-plugin-cueflow
      name: dsh-plugin-cueflow
```

## 2. Host 入口

```js
// lib/index.js
export const name = 'dsh-plugin-cueflow'

export function apply(ctx) {
  const store = createStore({ env: process.env })
  const runs = createRunManager({ ... })
  const catalog = createCatalog({ ctx })

  ctx.effect(() => () => runs.dispose(), 'cueflow: runs')

  ctx.inject(['webServer'], (child) => {
    child.effect(() => child.webServer.register({
      kind: 'prefix',
      path: '/api/dsh/dsh-plugin-cueflow',
      handler: createRoute({ store, runs, catalog, ctx }),
    }), 'cueflow: api')
  })

  // 可选能力：存在时提供更丰富的 catalog / 执行器
  ctx.inject(['skills'], (child) => {
    catalog.attachSkills(child.skills)
    return () => catalog.detachSkills()
  })
  ctx.inject(['commands'], (child) => {
    catalog.attachCommands(child.commands)
    return () => catalog.detachCommands()
  })
  ctx.inject(['agents'], (child) => {
    catalog.attachAgents(child.agents)
    return () => catalog.detachAgents()
  })
  ctx.inject(['subagents'], (child) => {
    catalog.attachSubagents(child.subagents)
    return () => catalog.detachSubagents()
  })
  ctx.inject(['shell'], (child) => {
    catalog.attachShell(child.shell)
    return () => catalog.detachShell()
  })
  ctx.inject(['fs'], (child) => {
    catalog.attachFs(child.fs)
    return () => catalog.detachFs()
  })
}
```

注意：

- `ctx.inject` 的回调在服务可用时执行；服务卸载时执行返回的 disposer。
- `webServer` 是必需能力；没有它时 UI 仍能注册，但 API 不可用。`ctx.inject` 不阻塞插件加载。
- 真实实现把 `catalog` 做成持有 `ctx` 的轻对象，而不是把服务实例复制到全局。

## 3. HTTP API

Base：`/api/dsh/dsh-plugin-cueflow`。所有响应 `application/json; charset=utf-8`。

### 3.1 `GET /health`

```json
{ "ok": true, "version": "0.1.0", "dsh": "0.2.1-rc.3", "capabilities": { "skills": true, "commands": true, "agents": true, "subagents": true, "shell": true, "fs": true, "webServer": true } }
```

### 3.2 `GET /catalog?cwd=...&sessionId=...`

```json
{
  "ok": true,
  "nodeTypes": [ ... ],
  "skills": [
    { "name": "simplify", "description": "...", "modelInvocable": true, "userInvocable": true, "source": "user-dsh", "whenToUse": "" }
  ],
  "commands": [
    { "name": "simplify", "description": "...", "input": { "hint": "..." } }
  ],
  "agents": [
    { "id": "session-...", "status": "idle", "provider": "deepseek-official", "model": "deepseek-flash", "title": "" }
  ],
  "templates": [ { "id": "review-diff", "name": "Review a diff", "description": "...", "workflow": { ... } } ],
  "capabilities": { "skills": true, "commands": false, "agents": true, "subagents": true, "shell": true, "fs": true },
  "cwd": "F:\\WorkSpace\\...",
  "warnings": [ "No live DSH session; Agent/Skill/Command nodes cannot run." ]
}
```

- `skills` 用 `ctx.skills.snapshot({ cwd })`；`complete:false` 时加 warning。
- `commands` 需要 live agent；`ctx.commands.list(agent)`；没有 agent 时为空 + capability false。
- `agents` 从 `ctx.agents.list()` 读取，按注册顺序；`title` 尽可能从会话标题服务读取（可选），读不到就空。
- `nodeTypes` 直接序列化 `shared/node-types.js` 的公开元数据（不含函数）。

### 3.3 Workflows

| 方法 | 路径 | Body | 返回 |
|---|---|---|---|
| GET | `/workflows` | — | `{ ok, workflows: [{id,name,description,updatedAt,nodeCount}] }` |
| GET | `/workflows/:id` | — | `{ ok, workflow }` |
| POST | `/workflows` | `{ workflow }` | `{ ok, workflow }`（upsert） |
| DELETE | `/workflows/:id` | — | `{ ok }` |

- POST 先 `normalizeWorkflow` + `validateWorkflow`；422 返回 `issues`。
- Host 覆盖 `updatedAt`，保留 `createdAt`；缺失时生成。
- 文件名 `workflows/<safeId>.json`；`safeId` 只允许 `[A-Za-z0-9_-]`，否则 400。

### 3.4 Runs

| 方法 | 路径 | Body | 返回 |
|---|---|---|---|
| POST | `/runs` | `{ workflow, inputs, sessionId?, cwd?, concurrency? }` | `201 { ok, run }` |
| GET | `/runs?limit=20` | — | `{ ok, runs: [summary] }` |
| GET | `/runs/:id?after=<seq>` | — | `{ ok, run, events: [seq>after] }`；省略 `after` 返回全部事件 |
| POST | `/runs/:id/cancel` | — | `{ ok, run }` |

- `POST /runs` 不要求 workflow 已保存；用请求里的快照运行，`workflowId` 可选。
- 运行前校验：`validateWorkflow`，以及“含 Agent/Skill/Command 节点时必须能解析 live agent”。
- `run.status` 初始 `queued` 或 `running`；响应立即返回，不等待完成。
- `GET /runs/:id` 返回的 `run.events` 只包含 `seq > after` 的事件；`run.nodeStates` 总是完整快照。

### 3.5 `POST /validate`

```json
{ "ok": true, "issues": [ { "severity": "error|warning", "code": "...", "message": "...", "nodeId": "n_2", "port": "prompt" } ] }
```

### 3.6 错误响应

见 [架构 §7](04-architecture.md#7-错误模型)。`details.issues` 与 `/validate` 的 issues 同构。

## 4. 节点执行适配

`lib/core/adapters.js` 导出：

```js
export function createAdapters({ getCatalog, resolveParent, log }) {
  return {
    async execute(node, inputs, context) { ... } // 返回 { outputs, logs?, meta? }
  }
}
```

`context` 包含 `{ signal, run, cwd, sessionId, timeoutMs }`。

### 4.1 解析父 Agent

```js
function resolveParent(catalog, sessionId) {
  const agents = catalog.agents ?? []
  if (sessionId) {
    const exact = agents.get(sessionId) // AgentRegistry.get
    if (exact) return exact
  }
  const live = agents.list()
  return live.length ? live[live.length - 1] : null
}
```

- 不能把 `Agent` 序列化到 API；只在 Host 内存中使用。
- `sessionId` 来自 UI 运行对话框；Host 不做“当前会话”的隐式推断，避免 root-scope 面板拿不到 session。

### 4.2 Agent

```js
const provider = chooseProvider(subagents) // spawn > fork
const activation = await subagents.startActivation({
  provider,
  label: node.title,
  ...(isLocal(provider) ? { childId: `session-${crypto.randomUUID()}` } : {}),
  delivery: 'caller',
  signal: ctx.signal,
  request: {
    parent,
    cwd,
    prompt: [{ type: 'text', text: promptText }],
    ...(provider.capabilities?.agentOptions && agentOptions ? { agentOptions } : {}),
    ...(provider.capabilities?.outputSchema && schema ? { outputSchema: schema } : {}),
    ...(node.config.agentPreset
      ? (provider.capabilities?.agentPreset
          ? { agentPreset: node.config.agentPreset }
          : (() => { throw new Error('provider does not support agentPreset') })())
      : {}),
  },
})
try {
  const result = await activation.result
  ...
} finally {
  await activation.dispose()
}
```

**注意**

- `childId` 只在本地 provider 传；外部 provider 由后端分配 id。
- 如果 `startActivation` 因 capacity 拒绝，错误信息原样透出。
- `activation.result` 不会 reject（按文档），但仍用 try/catch 兜底。

### 4.3 Skill

```js
const skill = await skills.get(name, { cwd, signal })
if (!skill) throw new SkillNotFoundError(name)
const prompt = [
  `<skill_content name="${escapeAttr(name)}">`,
  skill.content,
  `</skill_content>`,
  instructions ? `<workflow_instructions>${instructions}</workflow_instructions>` : '',
  `<workflow_task>${input ?? ''}</workflow_task>`,
].filter(Boolean).join('\n\n')
```

- 不检查 `modelInvocable`；但日志记录 `skill.invocation`，让用户知道它是 user-only。
- Skill 正文可能很长；MVP 不截断（Cursor 等 Skill 本来就按需加载），但记录长度；超过 200k 字符时警告。

### 4.4 Command

```js
const line = `/${name}${rawInput ? ' ' + rawInput : ''}`
let execution
if (typeof commands.execute === 'function') {
  execution = await commands.execute(parent, line, [], signal)
} else {
  const def = commands.find(parent, name)
  if (!def) throw new CommandNotFoundError(name)
  const result = await def.handler({
    commandId: crypto.randomUUID(),
    agent: parent,
    rawInput,
    attachments: [],
    signal,
  })
  execution = { result }
}
if (execution === undefined) throw new CommandNotFoundError(name)
const result = execution.result ?? execution
if (result.kind === 'error') throw new CommandFailedError(result.text)
return { text: result.text ?? '' }
```

- `execute` 可能返回 `{ commandId, result }`；兼容 `execution.text`。
- `commands.list(parent)` 在 catalog 中使用；如果 `execute` 不存在，catalog 仍可列出 `find` 的结果？`find` 需要名字；无法枚举。MVP 在 `execute` 不存在时，catalog 的 commands 为空并加 warning。

### 4.5 Shell

```js
// Shell must carry the per-call policy; otherwise workspace-write defaults to
// the DSH process home and Windows ACL may refuse the temp root.
const sandboxPolicy = resolveShellSandboxPolicy(services, context)
const spec = shell.resolve({
  command,
  workdir: workdir || cwd,
  timeoutMs,
  signal,
  ...(stdin ? { stdin } : {}),
  ...(sandboxPolicy ? { sandboxPolicy } : {}),
  stdoutMaxBytes: 256 * 1024,
})
const execution = await shell.execute(spec)
const result = await (execution.result ?? execution.done ?? execution)
```

- 兼容 `execution.result` 为 Promise 或值。
- 非零退出默认失败；错误消息包含 stderr 尾部 2000 字符。
- `stdout`/`stderr` 取 `CollectedOutput.text`；若实际是字符串，直接使用。
- **必须**解析 `ctx.sandboxPolicy`：优先使用 live session 的 cwd/mode；没有 session 时保留部署默认 mode，并用 workflow cwd 作为 workspace root。否则 Windows ACL 会把 `%TEMP%` 判为 workspace 内部而拒绝运行。

### 4.6 Read File

```js
const target = await fs.resolve(path, { cwd, signal })
const info = await fs.stat(target, signal)
if (!info || info.type !== 'file') throw new NotAFileError(path)
let text = await fs.readText(target, signal)
```

- 不做写操作。
- 大文件截断到 `maxChars`，并在 `info.truncated` 标记。

### 4.7 真实 DSH 实测结果

2026-10-28 使用从机 <test-host> 验证：

| 能力 | 实测结果 |
|---|---|
| 临时 profile | `cueflow-check`（2619）：health/catalog、确定性图 `hello!`、Read File `remote-file-ok` |
| 临时 profile Shell | 初测 `SANDBOX_UNAVAILABLE`；补 `runnerCommand` shim + `sandboxPolicy` 后成功 |
| 主 desktop 安装 | 依赖与 bundles 写入；端口 60167 的 CueFlow route 正常 |
| 面板 UI | 真实主 DSH 打开 CueFlow，3 节点 / 2 连线正常渲染 |
| UI 运行 | 从面板运行 `Remote UI deterministic` → `completed`，输出 `hello!` |
| Command | `/remote-use status` → 返回 “remote-use is off for this session…” |
| user-only Skill | `code-review` → `OK`，childId 创建/释放 |
| Shell | `echo cueflow-remote-shell` → stdout，exitCode 0 |
| BOM | 发现 PowerShell 5.1 的 UTF-8 BOM 导致 `BAD_JSON`；API 已修复并加测试 |

**仍未实测**：真实取消中的子代理、极窄窗口拖拽 E2E。其余 MVP 能力已从机实机覆盖。

### 4.8 会话归属（重要）

CueFlow 的 run **不是**父 DSH 会话里的一个 turn。各节点的归属如下：

| 节点 | 运行位置 | 是否进入父会话消息 |
|---|---|---|
| Agent / Skill | `ctx.subagents.startActivation` 的 child session；默认 `spawn`，可选 `fork`；`delivery:'caller'` | 否；结果只回 CueFlow |
| Command | `ctx.commands.execute(parent, …)` | 是；命令生命周期落在父会话 |
| Shell / Read File | Host 进程；run cwd + DSH `ctx.shell`/`ctx.fs` 策略 | 否 |
| 图/调度/事件 | CueFlow `RunManager` + run JSON | 否；独立 run 记录 |

多个 Agent/Skill 节点各自拥有 child session，彼此也不共享同一个 session。父会话只作为归属、权限、cwd 的锚点。设计原因与代价见 [13 · 设计阐明](13-design-rationale.md#5-会话模型为什么不是同一个会话)，决策见 D-045。

## 5. 客户端注册

```js
// src/client/plugin.js
import { setReact } from './react.js'
import { CueFlowPanel } from './App.jsx'
import { CueFlowIcon } from './Icons.jsx'

export function createCueflowClient(require) {
  const React = require('react')
  setReact(React)

  const inject = ['slots', 'locale']
  function apply(ctx) {
    const t = ctx.locale.bind('dsh-plugin-cueflow')
    ctx.effect(() => ctx.locale.register('dsh-plugin-cueflow', { zh, en }), 'cueflow: locale')

    ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
      name: 'sidebar.panellist',
      id: 'cueflow',
      order: 60,
      label: () => t('nav'),
    }, CueFlowIcon))

    ctx.slots.inject('main', () => ctx.slots.register({
      name: 'main',
      key: 'cueflow',
    }, CueFlowPanel))
  }
  return { inject, apply }
}
```

`src/client/entry.js`：

```js
import { createCueflowClient } from './plugin.js'

window.__ModuleLoader__.load({
  id: 'dsh-plugin-cueflow',
  factory(require) {
    return createCueflowClient(require)
  },
})
```

## 6. 样式与主题

- 所有 CSS 在 `src/client/styles.js` 的字符串中，由组件 `<style>{CSS}</style>` 注入一次。
- 使用 `--dsw-alias-*` 作为首选，CueFlow 变量作为兜底：

```css
.cue-root {
  --cue-canvas: var(--dsw-alias-bg-layer-1, #0d1015);
  --cue-text: var(--dsw-alias-label-primary, #e7edf5);
  --cue-border: var(--dsw-alias-border-l2, #2b3542);
}
```

- 明暗主题：用 `html[data-ds-dark-theme]` 或 `body[data-ds-dark-theme]` 覆盖 CueFlow 变量；同时提供 `prefers-color-scheme` 兜底。
- 字体：使用系统字体 + Cascadia/Consolas，不引入网络字体。

## 7. 版本兼容与降级

| 情况 | 行为 |
|---|---|
| `webServer` 不存在 | 插件仍加载；`/health` 不可用；UI 显示 Host API unavailable |
| `skills` 不存在 | catalog `capabilities.skills=false`；Skill 节点运行前校验失败 |
| `commands` 不存在 | Command 节点不可运行；catalog 空 |
| `agents` / `subagents` 不存在 | Agent/Skill 节点不可运行 |
| `shell` 不存在 | Shell 节点不可运行 |
| `fs` 不存在 | File Read 不可运行 |
| `ctx.commands.execute` 不存在 | 回退 `find` + `handler`；catalog 为空 + warning |
| `ctx.shell.execute().result` 形状不同 | 回退 `done` 或直接使用 execution；日志 `adapter:fallback` |
| subagent provider 只有 `fork` | 使用 `fork`，并在运行日志提示“继承父会话历史” |

## 8. 安装与热更新

```powershell
# 在仓库根目录；先退出 DSH 桌面应用以避免 profile 锁
dsh plugin --profile desktop add "F:\WorkSpace\dsh-plugin-cueflow"
```

- 本地目录安装后，修改 Host 代码通常需要重启/重新加载插件；修改 Client bundle 可由 HMR 推送（若启用了相应 watcher）。
- 开发期用 `pnpm build` 生成 `lib/client.js`；不要把未构建的源码当作 client bundle。
- 卸载：`dsh plugin --profile desktop remove dsh-plugin-cueflow`。

## 9. 真实 DSH 联调检查表

- [x] `dsh --profile <temp> --dump-config` 能看到 `dsh-plugin-cueflow` 行。
- [x] DSH 启动无插件加载错误（临时 profile 启动日志干净）。
- [x] 左侧栏出现 CueFlow 图标；点击打开全屏面板。
- [x] `/api/dsh/dsh-plugin-cueflow/health` 返回 `ok:true`。
- [x] catalog 能列出当前用户 skills / commands / agents。
- [x] 纯确定性图能运行并输出。
- [x] Agent 节点能创建子会话并返回文本；父会话没有多余通知。
- [x] Skill 节点能加载 `modelInvocable:false` 的 skill：从机 `code-review` → `OK`。
- [x] Command 节点能执行斜杠命令：从机 `/remote-use status` → 文本。
- [x] Shell 节点在真实 DSH 中执行 `echo` 并返回 stdout（含 sandboxPolicy 解析）。
- [x] 面板内运行、轮询状态、输出展示（从机 UI 运行 `completed`，输出 `hello!`）。
- [ ] 取消运行后，子代理被 dispose（单元测试覆盖；真实未跑）。
- [x] 保存后 workflow 仍在；真实 DSH 文件落盘。
