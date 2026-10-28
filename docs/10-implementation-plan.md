# 10 · 实施计划

> 文档先行，代码按本文推进。每个里程碑结束更新“状态/证据”列；未完成项不标完成。

## 1. 里程碑

| 里程碑 | 目标 | 交付物 | 验收 | 状态 |
|---|---|---|---|---|
| **M0 · 调研** | 理解 ComfyUI 与 DSH 的契约 | `01`、`02` 文档 | 能回答“为什么这样设计”与“哪些 API 可用” | 已完成 |
| **M1 · 设计** | 产品/架构/节点/UI/执行/集成/测试文档 + 决策表 | `03`–`09`、`decisions.md`、`reviews/` | 文档自审通过；关键决策有记录 | 已完成 |
| **M2 · 核心** | 共享图模型、校验、插值、执行器、存储 | `shared/*`、`lib/core/*`、L1 测试 | `pnpm test` 全绿（不依赖 DSH） | ✅ 已完成 |
| **M3 · Host** | REST API、catalog、适配器、持久化 | `lib/index.js`、`lib/core/api.js`、`catalog.js`、`adapters.js`、L2 测试 | Mock 服务下 API 全流程通过 | ✅ 已完成 |
| **M4 · Client** | DSH 面板、画布、检查器、运行 UI | `src/client/*`、`lib/client.js`、`ui/*` | 独立 UI 页可编辑/运行/截图；真实 DSH smoke | ✅ 已完成（Skill/Command 真实执行未跑） |
| **M5 · 打磨** | 局部重跑、子图、分组、Bypass、SSE、E2E | 后续迭代 | 按新文档验收 | 未开始 |

## 2. M2 详细任务

- [x] `shared/constants.js`：类型、状态、限制、默认值。
- [x] `shared/node-types.js`：11 个节点定义 + `createNode` + `getNodeType`。
- [x] `shared/graph.js`：拓扑序、环检测、入边索引、端口值解析、节点尺寸估算。
- [x] `shared/validation.js`：结构/端口/类型/必填/限制 + 运行输入校验。
- [x] `shared/template.js`：`{{...}}` 插值。
- [x] `lib/core/executor.js`：调度、并发、超时、取消、事件、状态。
- [x] 对应测试：`graph` / `validation` / `template` / `executor`。

## 3. M3 详细任务

- [x] `lib/core/store.js`：目录、原子读写、列表、保留策略、崩溃恢复。
- [x] `lib/core/catalog.js`：skills/commands/agents/nodeTypes/templates。
- [x] `lib/core/adapters.js`：Agent/Skill/Command/Shell/File/Condition/Merge/Output。
- [x] `lib/core/api.js`：路由、body、错误码、轮询。
- [x] `lib/index.js`：Cordis apply、可选注入、路由注册、dispose。
- [x] `test/adapters.test.js`、`test/api.test.js`、`test/index.test.js`、`test/templates.test.js`。
- [x] `cordis.patch.yml`、`package.json`、locale、icon。

## 4. M4 详细任务

- [x] `scripts/build-client.mjs`：esbuild 打包 `src/client/entry.js` → `lib/client.js`，`react` external。
- [x] `src/client/react.js` / `plugin.js` / `entry.js`。
- [x] `src/client/App.jsx`：数据加载、保存、运行、快捷键、布局。
- [x] `src/client/Canvas.jsx`：视口、节点、端口、连线、搜索面板、右键菜单。
- [x] `src/client/Inspector.jsx`：节点配置、工作流、运行、日志。
- [x] `src/client/api.js`：fetch + 轮询。
- [x] `src/client/styles.js`：完整 CSS + 明暗主题。
- [x] `ui/*`：Vite + Mock Host + 截图脚本。
- [x] 构建并截图检查；修复视觉/交互问题。
- [x] 真实 DSH smoke（临时 profile，不影响当前 DSH）。

## 5. 验收标准（与产品文档一致）

| 编号 | 标准 | 证据 |
|---|---|---|
| A1 | DSH 左侧栏入口 + 全屏面板 | L4 截图/记录 |
| A2 | Input → Agent → Output 可编辑保存 | L3 截图 + L4 |
| A3 | 兼容端口可连，不兼容/成环被拒 | L1 测试 + L3 |
| A4 | 纯确定性图可运行并输出 | L1/L2 测试 |
| A5 | user-only Skill 可运行 | L1 mock（真实执行未跑） |
| A6 | Command 节点可运行 | L1 mock（真实执行未跑） |
| A7 | 运行中可取消，状态/日志更新 | L1/L3；真实 UI 运行完成轮询 |
| A8 | 刷新/重启后 workflow 仍在 | L2 + L4（真实保存/读取） |
| A9 | 运行前校验 | L1/L2 |
| A10 | 不重启 DSH 完成 L1–L3 | `pnpm test` / `pnpm build` / `pnpm ui:shot` |

## 6. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| DSH 的 `ctx.commands.execute` / `ctx.shell` 返回形状与文档有差异 | 运行时失败 | 适配器防御性读取 + fallback + L4 smoke |
| `spawn`/`fork` 的 `childId` 规则不明确 | Agent 节点无法启动 | L1 mock 验证参数；真实环境优先 `spawn`，失败给出诊断；必要时改为 `ctx.agents.create()` |
| root-scope 面板拿不到当前会话 | 用户选错父会话 | 运行对话框显式选择；catalog 列出 live agents |
| Client bundle 较大 / HMR 不生效 | 开发慢 | esbuild 单文件；L3 独立页面迭代；HMR 只用于最终确认 |
| 画布交互复杂，容易出现拖拽状态 bug | 体验差 | 交互逻辑拆纯函数 + 截图 + 手工操作；MVP 不做框选/多选 |
| 真实 DSH 重启成本高 | 迭代慢 | L1–L3 为主；L4 集中在里程碑 |

## 7. 本轮完成定义（Definition of Done）

本轮（2026-10-27）结束时：

- 文档：`docs/` 主文档 + 11 篇次级文档 + 决策表 + 设计/实现自审记录。
- 代码：插件骨架、共享核心、Host API、Client 画布/检查器、构建产物。
- 测试：L1 全绿；L2 关键路径通过；L3 dark/light/narrow/run 四张截图；L4 真实 DSH 通过。
- 未完成：真实 Skill / Command 节点执行（避免额外模型/命令副作用），以及 M5 功能。
- 文档状态表如实标注，不把“未验证”写成“已完成”。

## 8. 实际验证记录（2026-10-27）

| # | 方式 | 结果 |
|---|---|---|
| V1 | `pnpm test`（52 个测试） | 全部通过：graph/validation/template/executor/adapters/API/host apply/templates |
| V2 | `pnpm build` | `lib/client.js` 生成，约 476 KiB 含 sourcemap |
| V3 | `pnpm ui:shot` | dark/light/narrow/run 四张截图生成；无运行时异常 |
| V4 | 临时 profile `cueflow-check` + `dsh --profile cueflow-check --no-open --port 2618` | DSH 正常启动，CueFlow 路由注册 |
| V5 | `GET /health` / `GET /catalog` | `ok:true`；11 node types、skills、commands、1 live agent |
| V6 | `POST /workflows` + 真实 DSH UI 保存 | workflow JSON 落盘；toast “已保存” |
| V7 | 确定性图（Input → Template → Output） | `completed`，输出 `hello!` |
| V8 | Shell 节点（`echo cueflow-shell`） | `completed`，stdout `cueflow-shell` |
| V9 | Read File 节点 | `completed`，输出文件内容 |
| V10 | Agent 节点（“Reply with exactly OK”） | `completed`，输出 `OK`，`childId` 已创建/释放 |
| V11 | 真实 DSH 面板内运行确定性图 | `completed`，输出 `hello!`，16 条事件轮询 |
| V12 | 清理 | 删除临时 profile、测试 workflow/run；未改动 `desktop` profile |

**未验证**：真实 Skill 节点（user-only skill）执行、真实 Command 节点执行、Shell 在受限 sandbox 下的拒绝路径。它们有适配器单测与 Mock 覆盖，但需要在有明确需求时做一次真实 smoke。
