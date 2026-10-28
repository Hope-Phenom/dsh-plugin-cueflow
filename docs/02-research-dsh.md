# 02 · DSH 研究：插件、Slots 与可调用能力

> 调研日期：2026-10-27。依据 DSH 官方文档站点、本机 DSH `0.2.1-rc.3` 的插件实现与 profile 结构。本文记录 **CueFlow 会依赖的公开契约**，以及明确不能依赖的实现细节。
>
> **实现后更新**：`ctx.shell`、`ctx.fs`、`ctx.subagents`（Agent 节点）、`ctx.webServer`、`ctx.skills` catalog 已在临时 DSH profile 中实测；`ctx.commands.execute` 与真实 Skill 执行仍未实测，见 [08 · DSH 集成](08-dsh-integration.md#47-真实-dsh-实测结果)。

## 1. 插件的最小形态

DSH 的 profile 由有序的 bundle patch 层组成；一个插件包（bundle）通过 `package.json` 的 `dsh.bundle.patch` 声明自己的 `cordis.patch.yml`，patch 里用 `insert` 增加一行 Host 插件：

```json
{
  "name": "dsh-plugin-cueflow",
  "type": "module",
  "main": "lib/index.js",
  "exports": {
    ".": "./lib/index.js",
    "./client": "./lib/client.js",
    "./package.json": "./package.json",
    "./locale/*.json": "./locale/*.json"
  },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web" }
  }
}
```

```yaml
# cordis.patch.yml
- insert:
    - id: dsh-plugin-cueflow
      name: dsh-plugin-cueflow
```

`dsh.client` 让 `dsh-client-modules` 扫描到客户端 bundle；`exports["./client"]` 必须指向一个可被浏览器 module loader 执行的单文件。

**硬约束**：profile 安装的插件在运行时**不能 import `@deepseek-ai/*`**（这些包在 DSH 安装目录的 asar 里，不在 profile 的 `node_modules`）。插件只能：

- 使用 Node 内置模块（Host 侧）；
- 通过 Cordis `ctx` 注入的服务访问 DSH 能力；
- 客户端通过 module loader 的 `require('react')` 获取 React，通过 `ctx.slots` 扩展 UI。

这条约束直接决定了 CueFlow 的分层：**核心逻辑纯 JS，DSH 能力全部经由注入的 service 适配**。

## 2. 客户端 bundle 的加载方式

浏览器端不是普通 ESM；DSH 的 `dsh-client-modules` 把 bundle 作为单资源 CJS 工厂加载。已安装插件 `@hope_phenom/dsh-plugin-notify` 的可工作写法：

```js
window.__ModuleLoader__.load({
  id: 'dsh-plugin-cueflow',
  factory(require) {
    const React = require('react')
    ...
    return { inject: ['slots'], apply(ctx) { ... } }
  },
})
```

关键点：

- `factory(require)` 同步执行，返回 `{ inject, apply }`；
- `require('react')` 可用；不要静态 `import` DSH 包；
- 只有一个 bundle 文件，相对 ESM import 不可依赖（构建时打成一个文件）；
- 样式通过 `<style>` 或 `styles.insert` 注入；颜色使用 `--dsw-alias-*` token，保证明暗主题；
- 客户端 bundle 变更可通过 DSH HMR 推送，但**新安装/替换同包**通常需要重启；因此测试策略必须能不依赖 DSH 重启。

CueFlow 的做法：源码在 `src/client/`，用 esbuild 打包成 `lib/client.js`（IIFE，`react` 作为外部依赖由 loader 提供）；`src/client/react.js` 提供 `setReact()`、`h()` 与 hooks 代理，组件文件用 JSX 但只 import 本模块，不直接 import React。

## 3. Slots：面板放在哪里

官方 `Client Slots` 文档与生成的 slot catalog 是权威。CueFlow 需要两个 slot：

### 3.1 `sidebar.panellist`（左侧栏入口）

- 类型：`list`，scope `root`
- 注册参数：`id`（必需）、`order`、`label`
- owner props：`{ size, active }`
- 约定：**每个 list id 对应 `main` 的同名 key**；sidebar 负责按钮，点击后选中对应 main panel。

### 3.2 `main`（中央全屏面板）

- 类型：`keyed`，scope `root`
- 注册参数：`key`（必需）
- 已被占用：`conversation`；插件管理器与任务管理器分别占用自己的 key。
- `ctx.layout.selectPanel(id)` 是编程式切换入口；sidebar 的按钮会走同一机制。

CueFlow 注册：

```js
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
```

注意：`main` 是 root scope，**不会**自动获得 `sessionId` / `useSession`；只能拿到 `useSessions`、`useWorkspaces`、`usePanelInfo` 等 root 标准 props。因此 CueFlow 不假设“当前会话”，而是由 Host 的 `/catalog` 返回 live agents，用户在运行对话框里选择目标会话；默认选最近注册的 live agent。这个决策记录为 D-010。

### 3.3 备选方案与拒绝原因

| 方案 | 结论 | 原因 |
|---|---|---|
| `settings.section` | 拒绝 | 设置页适合配置，不适合全屏画布；用户需要“打开就能画图” |
| `conversation.session.header.actions` 弹窗 | 拒绝 | 绑定单个会话，且会遮挡对话；不适合全局工作流库 |
| `shell.overlay` 浮动层 | 拒绝（MVP） | 会盖住整个应用，缺少稳定的“页面”语义；`main` 更符合插件管理器/Task Manager 的既有模式 |
| 新建独立 Web 页面 | 拒绝 | 无法在 DSH 内直接使用；且需要另起服务器 |

## 4. Host 侧服务

### 4.1 Web 路由

`ctx.webServer.register({ kind: 'prefix'|'exact', path, handler })` 注册命名路由；handler 拥有完整 `IncomingMessage` / `ServerResponse` 生命周期。CueFlow 使用一个 prefix 路由：

```js
ctx.inject(['webServer'], (child) => {
  child.effect(() => child.webServer.register({
    kind: 'prefix',
    path: '/api/dsh/dsh-plugin-cueflow',
    handler: route,
  }), 'cueflow: api')
})
```

参考实现：`@hope_phenom/dsh-plugin-notify` 的 `lib/index.js`。它证明 profile 插件可以直接注册 `/api/dsh/...` 路由并被 Web GUI 访问。

### 4.2 Skills

`ctx.skills` 是分层 registry：

- `ctx.skills.list({ cwd, scope? })` → `SkillSummary[]`
- `ctx.skills.snapshot({ cwd })` → `{ skills, complete }`
- `ctx.skills.get(name, { cwd, signal? })` → `SkillDefinition | undefined`
- `SkillInvocationPolicy = { modelInvocable, userInvocable }`
- `ctx.skills.register()` 用于插件发布自己的 skill；CueFlow 不发布 skill，只消费。

**关键**：`ctx.skills.get()` 是 trusted caller 接口，不检查 `modelInvocable`。因此：

- Skill 节点可以加载 `modelInvocable: false` 的“仅用户可见”Skill；
- 加载后把正文注入 Agent prompt，等价于用户显式调用该 Skill；
- 这是 CueFlow 支持“面向/不面向 LLM 的 Skill”的实现基础（D-007）。

### 4.3 Commands

`ctx.commands` 是人类斜杠命令 registry：

- `ctx.commands.list(agent)` → `CommandDescriptor[]`（需要 live Agent）
- `ctx.commands.find(agent, name)` → `CommandDefinition | undefined`
- `ctx.commands.execute(agent, line, attachments, signal)` → `CommandExecution | undefined`
- `CommandDefinition.handler(invocation)` 直接执行，不经过模型；`CommandInvocation` 包含 `commandId`、`agent`、`rawInput`、`attachments`、`signal`。
- `execute()` 会写 `command/run` / `command/done` 生命周期事件，是更忠实的调用方式。

CueFlow 的 Command 节点优先使用 `ctx.commands.execute()`；如果 DSH 版本没有该方法（或调用失败），回退到 `find()` + `handler()`，并在运行日志中标注“fallback”。两者都要求有 live Agent，因为命令 handler 的契约需要 `agent`（D-008）。

### 4.4 Agents / Subagents

`ctx.agents`：

- `list()`、`roots()`、`get(id)`；
- `create()` / `resume()` 返回 `AgentHandle`，但创建新 Agent 需要完整的 `CreateAgentOptions` 与持久化配置，MVP 不主动创建。

`ctx.subagents`：

- `list()` 返回 provider 名称；
- `registerProvider()` 由其它插件注册；
- `startActivation({ provider, label, childId?, request, signal, delivery })` 启动一个受管子代理；
- `request.parent: Agent` 必填；`request.prompt: ContentBlock[]`；`request.cwd`、`agentOptions`、`outputSchema` 可选；
- 本地 provider（`spawn` / `fork`）需要 `childId`（`SessionId`）；外部 provider（ACP 等）不需要；
- `delivery: 'caller'` 只把结果返回调用方，不向父会话注入结算通知；
- 返回 `{ childId, messageId?, result, dispose() }`；`result` 解析为 `{ output, structured?, diagnostic?, stopReason }`。

CueFlow 的选择（D-009）：

1. 优先 `spawn`（不继承父会话历史，上下文干净）；
2. 没有 `spawn` 时用 `fork`（继承父会话）；再没有则报“无可用 subagent provider”；
3. 传入 `agentOptions` 仅在 provider `capabilities.agentOptions` 为真时；
4. 传入 `outputSchema` 仅在 `capabilities.outputSchema` 为真时；
5. 节点完成后调用 `dispose()`，确保子会话资源释放；
6. 父 Agent 从 `ctx.agents.list()` 中按用户在 UI 选择的 sessionId 解析，缺失时选最后一个 live agent。

**假设待验证**：`spawn`/`fork` provider 的实际能力标志与 `childId` 规则；如果 `startActivation` 对 `childId` 的格式有额外要求，适配层会回退到 `ctx.agents.create()`（后续里程碑）。本轮用单元测试 mock 验证调用形状，真实 DSH 联调放到 M4。

### 4.5 Shell

`ctx.shell` 是抽象 seam：

```js
const spec = ctx.shell.resolve({ command, workdir, timeoutMs, signal, stdin })
const execution = await ctx.shell.execute(spec)
const result = await execution.result
// result: { exitCode, signal, timedOut, aborted, stdout: { text }, stderr: { text } }
```

CueFlow 的 Shell 节点只使用这个公开接口，不直接 `child_process.exec`，从而继承 DSH 的 subprocess / sandbox 行为（具体策略由当前 composition 决定）。`stdout`/`stderr` 是 `CollectedOutput`，取 `.text`。

**假设待验证**：`execution.result` 的确切属性名（文档写的是 `ShellExecution.result`）；如果实际是 `execution.done` + `execution.result()`，适配层做兼容。

### 4.6 Filesystem

`ctx.fs`：`resolve(path, { cwd })` → `FsTarget`；`stat`；`readText`；`writeText`；`editText`；`listDir`。CueFlow MVP 只做 **File Read**（`resolve` + `readText`），不做写文件，避免绕过 fs observation policy；写文件交给 Agent 或 Shell 节点。

### 4.7 Session 事件

`ctx.on('session/event', (session, event) => …)` 是 post-commit 的 append feed。CueFlow MVP 不需要把工作流运行写进会话日志；运行记录是插件自己的 JSON。这样不会污染用户会话，也避免和 `turn/end` 语义耦合。

## 5. 存储与生命周期

- 插件自有数据放在 `$DSH_HOME/storages/dsh-plugin-cueflow/`；参考 notify 的 `settings.json` 与原子写（temp + rename）。
- 不依赖 `ctx.storage` / `ctx.storageDomain`：MVP 只需要少量 JSON 文件，自管目录更简单，也不会因 storage 插件未组合而失效（D-011）。
- 所有注册（路由、slot、事件）都包在 `ctx.effect` / `ctx.inject` 中，保证 HMR / disable 时干净卸载。

## 6. 客户端可用的 React 与样式

- `require('react')` 可用；不要假设 `react-dom` 或 DSH 内部组件库可用。
- 组件用 `React.createElement` / 本地 `h()`；不用 CSS-in-JS 依赖。
- 颜色使用 `--dsw-alias-*` token；画布专用颜色用 CueFlow 自己的 CSS 变量，并提供明暗两套。
- 图标用内联 SVG；不依赖图标包。
- 布局必须适配 DSH 的窗口顶栏 `--dsh-frame-top-clearance`（约 48px），否则面板顶部会被窗口 chrome 盖住。

## 7. 测试含义

| 约束 | 测试后果 |
|---|---|
| 插件安装/替换常需重启 | 逻辑用 `node --test`；UI 用独立 Vite 页面；Host 用 fake ctx + 真 HTTP server |
| 客户端只能 `require('react')` | 独立测试页用 Vite 解析 react；生产 bundle 用 esbuild external react |
| Slot 只能在 DSH 内验证 | 用一个 fake `ctx.slots` 捕获注册；另做一次 M4 手工联调 |
| 真实 Skill/Command/Agent 依赖 live 会话 | 适配层全部依赖注入，单元测试用 mock；真实联调用当前会话做 smoke |
| 本机 DSH 版本会变 | 适配层对 `execute`/`result` 形状做防御性读取，失败时给出可读诊断 |

## 8. 参考资料

- DSH 文档总索引（含 `.md` 原页）：<https://deepseek-harness.github.io/deepseek-harness/llms.txt>
- Client Slots: <https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/slots.md>
- Client Modules: <https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/client-modules.md>
- Web Client: <https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/web-client.md>
- Web Server: <https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/web-server.md>
- Skills: <https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/skills.md>
- Commands: <https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/commands.md>
- Subagents: <https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/subagent.md>
- Shell: <https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/shell.md>
- Filesystem: <https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/filesystem.md>
- Storage: <https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/storage.md>
- 插件打包与安装: <https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish.md>
- Slot catalog（生成物，含全部 key）: <https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/extensions/cordis-client-runner/src/client/slot-catalog.ts>
- 本机参考插件 `@hope_phenom/dsh-plugin-notify`：`C:\Users\<user>\.dsh\profiles\desktop\node_modules\@hope_phenom\dsh-plugin-notify`
