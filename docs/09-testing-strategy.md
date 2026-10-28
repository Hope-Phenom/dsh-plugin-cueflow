# 09 · 测试策略

> 核心约束：**大部分插件改动不应要求重启 DSH**。DSH 重启慢、会打断当前会话，而且插件替换同包通常需要重启。因此测试分成四层，越靠下越不依赖 DSH。

## 1. 测试金字塔

```text
        ┌──────────────────────────────┐
   L4   │ 真实 DSH 手工 smoke（少量）  │  安装、slot、真实 Skill/Command/Agent
        ├──────────────────────────────┤
   L3   │ 独立 UI 测试页 + 截图        │  Vite + Mock Host + 同一份 client 代码
        ├──────────────────────────────┤
   L2   │ Host API 集成测试            │  fake ctx + 真 node:http + 真 JSON 文件
        ├──────────────────────────────┤
   L1   │ 纯单元测试                   │  graph / validation / template / executor
        └──────────────────────────────┘
```

| 层 | 依赖 | 频率 | 覆盖 |
|---|---|---|---|
| L1 `node --test` | 无 | 每次改动 | 图算法、校验、插值、调度、适配器参数映射 |
| L2 `node --test` + HTTP | Node | 每次 Host 改动 | 路由、JSON、持久化、错误码、轮询 |
| L3 Vite + 浏览器 | 浏览器（Edge/Chrome） | 每次 UI 改动 | 画布、连线、检查器、运行态、明暗主题 |
| L4 真实 DSH | DSH 进程 | 里程碑/发布 | slot 注册、catalog、真实能力调用 |

## 2. L1：纯单元测试

### 2.1 图与校验

`test/graph.test.js`：

- 线性图 → 拓扑序正确；
- 分叉/汇合；
- 环检测（自环、2 节点环、长环）；
- 端口解析：单入边、扇出、缺失端口；
- `nodeSize` / 端口坐标估算（如果实现）；
- 条件分支的“未走”输出不参与下游值。

`test/validation.test.js`：

- 未知节点类型；
- 重复节点 id；
- 边指向不存在的节点/端口；
- 同一输入多条入边；
- 类型不兼容；
- 必填输入未连接（有/无默认值）；
- `schemaVersion` 不支持；
- 空 workflow / 只有 note；
- 节点数/边数超限；
- 错误 issue 带 `nodeId`/`port`。

### 2.2 插值

`test/template.test.js`：

- `{{input}}`；
- `{{nodeId.port}}`；
- 未知占位符保留；
- json 值字符串化；
- 循环引用不导致无限递归（值查找是扁平的，不存在递归）；
- `trim` 开关；
- 空模板 → 字符串化输入。

### 2.3 执行器

`test/executor.test.js` 使用 **fake adapter**（不依赖 DSH）：

```js
const execute = async (node, inputs, ctx) => {
  if (node.type === 'template') return { outputs: { text: `${inputs.value}!` } }
  if (node.type === 'condition') return { outputs: { true: inputs.value } }
  ...
}
```

用例：

- Input → Template → Output；
- 并发上限：3 个独立慢节点 + concurrency=2，最大并发不超过 2；
- 条件真/假分支：未走分支下游 `skipped`；
- Merge 三种模式；
- 必填缺失 → skipped；
- 类型转换成功/失败；
- 节点抛错 → run error，后续 skipped；
- 取消：运行中节点收到 signal，queued 变 cancelled；
- 超时：慢节点 → `NODE_TIMEOUT`；
- disabled 节点；
- 事件 seq 单调、`after` 过滤正确；
- 输出截断标记。

### 2.4 适配器

`test/adapters.test.js` 使用 mock services：

- Agent：正确构造 `startActivation` 参数；`delivery:'caller'`；`dispose` 被调用；`stopReason` 映射；
- Skill：`skills.get` 被调用，`modelInvocable:false` 仍执行；找不到时错误信息含相近名；
- Command：优先 `execute`；`execute` 不存在时回退 `find+handler`；`kind:'error'` 映射；
- Shell：`resolve`/`execute` 参数；非零退出；超时/aborted；
- File：`resolve`/`stat`/`readText`；非文件；截断；
- 缺少服务时的 `CAPABILITY_MISSING`。

**原则**：适配器只依赖注入对象，测试不需要 DSH。所有对 DSH 返回形状的兼容分支都至少有一个用例。

## 3. L2：Host API 集成测试

`test/api.test.js`：

1. 建临时目录作为 `DSH_HOME`；
2. 用 `createStore` / `createRunManager` / `createRoute` 组装；
3. 启动一个真实 `node:http` server，把请求交给 route handler；
4. 用 `fetch` 驱动：
   - `GET /health`；
   - `GET /catalog`（fake skills/commands/agents）；
   - `POST /workflows` → `GET /workflows` → `GET /workflows/:id`；
   - `POST /validate` 错误图 → 422；
   - `POST /runs` 纯确定性图 → 轮询 `GET /runs/:id?after=` 直到完成；
   - `POST /runs/:id/cancel`；
   - `DELETE /workflows/:id`；
   - 404 / 400 / 409 / 422 错误码；
   - 路径遍历 id 被拒绝；
   - 请求体过大被拒绝。

不启动 DSH，不依赖 Web GUI。测试结束后删除临时目录。

## 4. L3：独立 UI 测试页

### 4.1 结构

`ui/index.html`：

```html
<!doctype html>
<html>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.jsx"></script>
  </body>
</html>
```

`ui/main.jsx`：

```jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { createCueflowClient } from '../src/client/plugin.js'
import { installMockHost } from './mock-host.js'

installMockHost() // 拦截 fetch，返回固定 catalog/workflow/run
const { apply } = createCueflowClient(name => React)
// fake ctx.slots / locale，捕获 CueFlowPanel
// 用 createRoot 渲染捕获到的组件
```

- 关键：**使用与生产相同的 `src/client` 代码**，只替换 Host 与 slot 容器。
- Mock Host 支持：
  - 固定 3 个模板、2 个已保存 workflow；
  - 运行模拟：按 400–900ms 推进节点状态，产生 `node/start`、`node/end`；
  - “失败”按钮：让第三个节点 `error`；
  - “取消”：让 run 进入 `cancelled`；
  - 可切换 catalog 是否有 skills/commands/agents。
- UI 顶部工具条（仅测试页）：
  - 主题：dark / light
  - 宽度：1440 / 1100 / 800
  - 模拟运行 / 失败 / 取消
  - 显示当前选中节点/边数量

### 4.2 截图

`scripts/screenshot-ui.mjs`：

1. 启动 Vite（或使用已构建的 `.ui-dist` + 静态 server）；
2. 找到本机 Edge/Chrome（`msedge.exe` / `chrome.exe`）；
3. 用 headless 模式截图：
   - `dark-1440.png`
   - `light-1440.png`
   - `narrow-900.png`
   - `run-1440.png`
4. 检查文件存在且非空；人工/模型查看截图。

不引入 Playwright（避免大依赖）；Edge headless 足够验证布局。若 Edge 不可用，退化为 `ui:build` + 说明。

### 4.3 UI 断言（可选）

纯逻辑的 UI 辅助函数（坐标转换、连线路径、端口命中、撤销栈）放 `shared/` 或 `src/client/lib/`，用 Node 测试：

- `worldToScreen` / `screenToWorld` 互逆；
- `bezierPath` 起点/终点正确；
- `canConnect` 与 `validateEdge` 一致；
- `pushHistory` 上限与 undo/redo；
- `layoutNode` 端口坐标。

React 组件的 DOM 断言不强制引入 jsdom；用截图 + 手工验证覆盖视觉与交互。

## 5. L4：真实 DSH smoke

只在里程碑或发布前做。**不要直接重启当前正在使用的 DSH**；用临时 profile 做 L4，避免影响用户会话。

1. 构建 client：`pnpm build`；
2. 用临时 profile 安装本地目录（不改 `desktop`）：
   ```powershell
   dsh --profile cueflow-check --from-default-profile web --dump-config
   dsh plugin --profile cueflow-check add "F:\WorkSpace\dsh-plugin-cueflow"
   dsh --profile cueflow-check --no-open --port 2618 --host 127.0.0.1
   ```
3. 打开临时 DSH URL，左侧栏 → CueFlow；
4. 跑 smoke：
   - **确定性**：Input → Template → Output；
   - **Shell**：`echo cueflow-shell`；
   - **Read File**：读一个临时文件；
   - **Agent**：Agent 节点输入 “Reply with exactly OK”；
   - **Skill**：Skill 节点选择任意可见 skill（真实执行未跑，见缺口）；
   - **Command**：Command 节点执行安全命令（真实执行未跑，见缺口）；
5. 检查：
   - 面板无控制台错误；
   - 运行状态实时更新；
   - 取消可用；
   - 刷新后 workflow 仍在；
   - 父会话没有额外 subagent 结算通知（caller delivery）。
7. 记录结果到 [10 实施计划](10-implementation-plan.md) 的验收表。

> 如果当前 DSH 会话正在被本插件开发使用，**不要**在本轮强制重启；把 L4 留到用户确认的时间窗口。L1–L3 必须全绿。

## 6. 测试命令

```powershell
pnpm test          # node --test test/*.test.js
pnpm build         # esbuild src/client/entry.js -> lib/client.js
pnpm ui            # Vite 独立 UI 测试页 http://127.0.0.1:5199
pnpm ui:build      # 构建静态测试页
pnpm ui:shot       # Edge headless 截图（若可用）
```

## 7. 测试矩阵

| 变更类型 | L1 | L2 | L3 | L4 |
|---|---|---|---|---|
| 图算法/校验/插值 | ✅ 必跑 | — | — | — |
| 执行器/适配器 | ✅ 必跑 | 建议 | — | 里程碑 |
| Host 路由/存储 | 部分 | ✅ 必跑 | — | 里程碑 |
| Client 组件/样式 | 辅助函数 | — | ✅ 必跑 + 截图 | 里程碑 |
| Slot/DSH 集成 | — | — | — | ✅ 必跑 |
| 节点类型新增 | ✅ | ✅ | ✅ | 建议 |

## 8. 反模式（不要做）

- 为了测试 UI 而每次重启 DSH。
- 在单元测试里 import `@deepseek-ai/*`（profile 环境解析不到）。
- 用真实 LLM 跑单元测试（慢、贵、不稳定）。
- 只断言日志文本，不断言最终状态/输出。
- 用 `setTimeout` 猜测异步完成；用轮询 + 明确终态。
- 把 UI 测试页写成另一套组件（必须复用 `src/client`）。
- 测试依赖本机绝对路径；用临时目录与环境变量。

## 9. 已知测试缺口（MVP）

- 没有真实浏览器中的拖拽 E2E（只有截图 + 辅助函数测试）；M5 可引入 Playwright。
- 没有真实 DSH 的自动化测试框架；L4 用临时 profile + remote-use 手工/脚本 smoke。
- 真实取消中的子代理仍未跑（单元测试覆盖 cancel/abort）。
- 极窄面板（DSH 窗口 800px）下节点缩放较小，可用但需要缩放/平移。

## 10. 实际执行结果（2026-10-28）

| 层 | 命令/方式 | 结果 |
|---|---|---|
| L1 | `node --test test/*.test.js` | 80 个测试全部通过（graph/validation/template/executor/adapters/API/host apply/templates/approval/CSRF/queue/budget/retry/heartbeat/session-mode） |
| L2 | 同上的 `test/api.test.js` + `test/index.test.js` | 路由、CRUD、422、404、400、取消、Host apply、BOM 请求均通过 |
| L3 | `pnpm ui:shot` | dark/light/narrow/run/approval 五张截图，无运行时异常 |
| L3 交互 | CDP 合成 pointer/keyboard 事件 | 节点拖拽、删除连线、重连、自连拒绝、保存、打开运行对话框均通过 |
| L4 临时 profile | 从机 <test-host>，`cueflow-check` 端口 2619 | 插件加载、health/catalog、确定性图、Read File、Shell（补 sandbox shim）、Skill、Command 均通过 |
| L4 主桌面 | 从机 <test-host>，`desktop` profile 端口 60167 | 面板打开、3 节点/2 连线渲染、UI 运行输出 `hello!`、Command `/remote-use status`、user-only Skill `code-review`、Shell `echo` 全部通过 |
| L4 限制 | 未跑 | 真实取消中的子代理；极窄窗口下的拖拽 E2E |

截图位置：`.screenshots/`。从机主桌面截图：`remote-cueflow-panel-window.png`、`remote-cueflow-run-window.png`。








