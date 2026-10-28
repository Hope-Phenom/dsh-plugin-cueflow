# 04 · 系统架构

## 1. 分层

```text
┌──────────────────────────────────────────────────────────────────────┐
│ shared/          纯 JS，无 React / 无 Node API                        │
│  node-types.js   节点类型、端口、配置字段、默认值、分类/颜色           │
│  graph.js        图遍历、环检测、拓扑序、端口解析、节点尺寸估算        │
│  validation.js   保存/运行前校验                                      │
│  template.js     {{...}} 插值                                        │
│  constants.js    类型、状态、限制                                     │
└───────────────┬──────────────────────────────────┬───────────────────┘
                │ Host 直接 import                  │ Client 打包时 import
┌───────────────▼──────────────────┐  ┌────────────▼───────────────────┐
│ lib/ (Host, ESM, Node builtins)  │  │ src/client/ (React, bundled)   │
│  index.js       Cordis 插件入口   │  │  entry.js  __ModuleLoader__    │
│  core/store.js  workflow/run 文件 │  │  plugin.js slots + locale      │
│  core/executor.js DAG 调度器      │  │  App.jsx   面板壳              │
│  core/adapters.js DSH 能力适配    │  │  canvas/*  画布/节点/连线       │
│  core/api.js    HTTP 路由         │  │  inspector/* 配置/运行/日志     │
│  core/catalog.js 技能/命令/会话   │  │  api.js    fetch + polling      │
└──────────────────────────────────┘  └────────────────────────────────┘
                │                                  │
                └────────── /api/dsh/dsh-plugin-cueflow ───────────────┘
```

**依赖规则**

- `shared/` 不依赖任何 DSH 包、React、Node API；可在浏览器与 Node 中直接跑。
- `lib/` 只 import Node builtins、`shared/`、自身文件；不 import `@deepseek-ai/*`。
- `src/client/` 只 import `react`（通过 `createCueflowClient(require)` 注入）、`shared/`、自身文件；不 import `@deepseek-ai/*`。
- Host 与 Client 不共享可变状态；所有跨进程数据通过 JSON API。

## 2. 目录结构（目标）

```text
dsh-plugin-cueflow/
├─ package.json
├─ cordis.patch.yml
├─ README.md
├─ README.zh.md
├─ docs/                      # 本目录
├─ shared/
│  ├─ constants.js
│  ├─ node-types.js
│  ├─ graph.js
│  ├─ validation.js
│  └─ template.js
├─ lib/
│  ├─ index.js                # Host 插件入口（Cordis apply）
│  ├─ client.js               # 构建产物：浏览器 bundle
│  └─ core/
│     ├─ store.js
│     ├─ catalog.js
│     ├─ adapters.js
│     ├─ executor.js
│     └─ api.js
├─ src/client/
│  ├─ entry.js
│  ├─ plugin.js
│  ├─ react.js
│  ├─ styles.js
│  ├─ api.js
│  ├─ App.jsx
│  ├─ canvas/…
│  └─ inspector/…
├─ ui/                        # 独立 UI 测试页（Vite + Mock Host）
│  ├─ index.html
│  ├─ main.jsx
│  └─ mock-host.js
├─ scripts/
│  └─ build-client.mjs
├─ test/
│  ├─ graph.test.js
│  ├─ validation.test.js
│  ├─ template.test.js
│  ├─ executor.test.js
│  ├─ api.test.js
│  └─ adapters.test.js
├─ locale/{en,zh}.json
└─ assets/icon.svg
```

## 3. 数据模型

### 3.1 WorkflowDocument（持久化）

```json
{
  "schemaVersion": 1,
  "id": "wf_2f5c1a",
  "name": "Review current diff",
  "description": "git diff → review → output",
  "createdAt": 1761570000000,
  "updatedAt": 1761570000000,
  "nodes": [
    {
      "id": "n_1",
      "type": "input",
      "title": "Task",
      "position": { "x": 80, "y": 160 },
      "config": { "label": "Task", "valueType": "text", "defaultValue": "" },
      "disabled": false
    }
  ],
  "edges": [
    {
      "id": "e_1",
      "from": { "node": "n_1", "port": "value" },
      "to": { "node": "n_2", "port": "prompt" }
    }
  ],
  "settings": {
    "concurrency": 2,
    "cwd": "",
    "defaultProvider": "",
    "defaultModel": ""
  }
}
```

约定：

- `id` 由客户端生成：`wf_` + 8 位 base36；节点 `n_`，边 `e_`。
- 不保存画布缩放/选中/滚动位置到 workflow；这些是 UI 本地状态。
- `config` 必须是 JSON 可序列化；未知字段在加载时保留（向前兼容），但校验会提示未知字段。
- `disabled: true` 的节点不执行，输出视为 `undefined`；下游必填输入会跳过。

### 3.2 RunRecord（持久化 + 内存）

```json
{
  "schemaVersion": 1,
  "id": "run_9a3d",
  "workflowId": "wf_2f5c1a",
  "workflowName": "Review current diff",
  "workflowSnapshot": { "...": "完整 workflow，保证复现" },
  "status": "running",
  "inputs": { "n_1": "..." },
  "sessionId": "session-...",
  "cwd": "F:\\WorkSpace\\...",
  "createdAt": 1761570000000,
  "startedAt": 1761570000000,
  "endedAt": null,
  "nodeStates": {
    "n_1": {
      "status": "success",
      "startedAt": 1761570000000,
      "endedAt": 1761570000010,
      "attempts": 1,
      "outputs": { "value": "..." },
      "preview": "…",
      "error": null
    }
  },
  "events": [
    { "seq": 0, "time": 1761570000000, "type": "run/start", "message": "Run started" }
  ],
  "outputs": { "n_7": "final text" },
  "error": null
}
```

- 内存中的 `RunRecord` 由 `RunManager` 持有；结束后写 `runs/<id>.json`。
- 事件日志上限 2000 条；节点输出预览上限 4000 字符；完整输出在 `outputs` 中按 `maxOutputChars`（默认 20000）截断。
- `workflowSnapshot` 是运行时的不可变副本；即使 workflow 后续被编辑，run 仍可复现。

### 3.3 值模型

节点之间传递的值是 JSON 可序列化的 JS 值：

- `text` → string
- `json` → any JSON
- `number` → number
- `boolean` → boolean
- `any` → 任意

运行时会做最小强制转换（见 [执行引擎](07-execution-engine.md)）。不做隐式对象展开；需要拆分时用 Template / Condition。

## 4. 运行时序

### 4.1 打开面板

1. DSH 加载 Client bundle，`factory` 返回 `{ inject: ['slots','locale'], apply }`。
2. `apply` 注册 `sidebar.panellist` 与 `main` slot，注册 locale 字典。
3. 用户点击侧栏 CueFlow 图标 → DSH 切换 main key 到 `cueflow`。
4. `CueFlowPanel` 挂载，`fetch('/api/dsh/dsh-plugin-cueflow/catalog')` 与 `GET /workflows`。
5. 若没有 workflow，显示空态 + 模板入口；否则打开最近编辑的一个。

### 4.2 运行

```text
UI                Host API              RunManager            Adapter
│ POST /runs        │                      │                    │
├──────────────────▶│ validate + snapshot  │                    │
│                   ├─────────────────────▶│ create run         │
│                   │ 202 + run snapshot   │ schedule loop      │
│◀──────────────────┤                      │                    │
│ GET /runs/:id?after=<seq> (poll 600ms)   │                    │
├──────────────────▶│                      │ node ready         │
│                   │                      ├───────────────────▶│
│                   │                      │                    │ skill.get / subagent.start
│                   │                      │◀───────────────────┤ result
│                   │                      │ update node state  │
│◀──────────────────┤ snapshot + events    │                    │
│ ...               │                      │ all settled        │
│◀──────────────────┤ run end              │ persist run        │
```

- 轮询在 run 进入终态后停止；页面隐藏时降频到 2s（可选）。
- 取消：`POST /runs/:id/cancel` → `AbortController.abort()`；运行中的 adapter 收到 signal；排队节点标记 `cancelled`。

### 4.3 保存

1. UI 发送完整 workflow（含 `updatedAt` 由 Host 覆盖）。
2. Host `normalizeWorkflow` + `validateWorkflow`；错误返回 422，不落盘。
3. 原子写 `workflows/<id>.json`；更新 `workflows/index.json`（可选；MVP 直接扫描目录）。
4. 返回规范化后的 workflow；UI 清 dirty 标记。

## 5. Host 模块职责

| 模块 | 职责 | 不做什么 |
|---|---|---|
| `core/store.js` | 目录解析、原子读写、workflow/run 列表、清理旧 run | 不校验图语义 |
| `core/catalog.js` | 汇总 skills/commands/agents 与能力标志 | 不执行 |
| `core/adapters.js` | 把节点执行请求映射到 DSH 服务；防御性读取返回值 | 不做调度 |
| `core/executor.js` | DAG 调度、输入解析、状态机、事件、取消、超时 | 不直接访问 DSH 服务 |
| `core/api.js` | HTTP 路由、JSON body、错误映射 | 不持有业务状态（由 RunManager/Store 注入） |
| `index.js` | Cordis 生命周期、注入、注册路由、状态装配 | 不写业务逻辑 |

## 6. Client 模块职责

| 模块 | 职责 |
|---|---|
| `entry.js` | 调用 `window.__ModuleLoader__.load`，把 loader `require` 传给插件工厂 |
| `plugin.js` | `setReact(require('react'))`、locale、slot 注册、面板组件出口 |
| `react.js` | `setReact` / `h` / hooks 代理 / Fragment |
| `App.jsx` | 面板骨架、数据加载、保存/运行、键盘快捷键 |
| `canvas/*` | 视口、节点卡、端口、连线、拖拽、选择、右键菜单 |
| `inspector/*` | 节点配置表单、运行输入、运行状态、日志 |
| `api.js` | 所有 fetch、错误规范化、轮询 |
| `styles.js` | 全部 CSS（含明暗主题变量） |

## 7. 错误模型

所有 Host API 返回：

```json
{ "ok": false, "error": "人类可读消息", "code": "VALIDATION_FAILED", "details": { ... } }
```

| code | HTTP | 含义 |
|---|---|---|
| `BAD_REQUEST` | 400 | JSON 结构错误 / 缺字段 |
| `VALIDATION_FAILED` | 422 | 图校验失败，`details.issues` 是问题列表 |
| `NOT_FOUND` | 404 | workflow/run 不存在 |
| `CAPABILITY_MISSING` | 409 | 缺少 `skills`/`commands`/`agents`/`shell`/`fs` |
| `RUN_CONFLICT` | 409 | run 已结束/已取消，不能重复取消 |
| `RUN_FAILED` | 500 | 运行内部错误 |
| `INTERNAL` | 500 | 未分类错误 |

节点错误统一包装为：

```json
{
  "message": "节点「Review」执行失败：...",
  "nodeId": "n_2",
  "nodeTitle": "Review",
  "phase": "adapter",
  "cause": "..."
}
```

## 8. 安全边界

- **不执行任意用户代码**：没有 JS/Eval 节点；Shell 节点只执行用户显式填写的命令，且通过 `ctx.shell`（继承 DSH 的 subprocess / sandbox 策略）。
- **文件读取走 `ctx.fs`**：不直接 `fs.readFile`，避免绕过 DSH 的 fs 策略与观察规则。
- **命令走 `ctx.commands`**：不直接构造 shell 调用斜杠命令。
- **Skill 走 `ctx.skills.get`**：不读取任意路径的 Markdown；只加载 registry 中已发现的 skill。
- **API 同源**：路由挂在 DSH Web 服务器下，依赖 DSH 的 Connection/认证；不额外开放端口。
- **路径**：workflow/run 文件名由 Host 生成，拒绝 `..` 与路径分隔符；不使用用户提供的 id 直接拼路径。
- **大小限制**：请求体 1 MB；workflow 节点数 200、边数 500；单节点输出 20000 字符；run 事件 2000 条。

## 9. 生命周期与 HMR

- `apply(ctx)` 中创建 `Store` / `RunManager` / `Catalog`，并通过 `ctx.effect` 注册路由。
- `RunManager` 的 `dispose()`：取消所有 active run，等待 adapter 清理，持久化未完成 run 为 `cancelled`。
- 插件禁用/重载：所有注册随 fiber 卸载；正在运行的 run 被取消并记录 `plugin-disposed`。
- Client HMR：`ctx.slots.register` 随插件卸载；面板组件重新挂载后重新拉取 catalog/workflows。若 HMR 未生效，刷新页面；新安装包通常需要重启 DSH。

## 10. 与 DSH 版本的关系

CueFlow 只依赖 `ctx` 上文档化的服务；对可能变化的返回值做防御性读取：

- `command execution`：优先 `execution.result`，兼容 `execution.text` / `execution`。
- `shell execution`：优先 `execution.result` Promise，兼容 `execution.done`。
- `subagent provider`：能力标志缺失时按 false 处理，只传最小请求。
- 所有兼容分支在运行日志中记录 `adapter:fallback`，便于定位。

目标 DSH：`>=0.2.0 <0.3.0`；本机验证版本 `0.2.1-rc.3`。
