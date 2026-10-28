# CueFlow · 主文档

> DSH 的 ComfyUI 式工作流编排插件。用节点图把 **输入 → Skill / Command / Agent / Shell → 输出** 串成可复用、可检查、可分享的编码与通用工作流。
>
> 插件名与仓库目录名一致：`dsh-plugin-cueflow`。
> 当前状态：**M1 设计完成，M2–M4 已实现并在从机 <test-host> 实机验证，M5 未开始**（2026-10-28）。
> 从机临时 profile 与 `desktop` profile 均已完成真实联调：Host 路由、catalog、workflow 保存、确定性图、Read File、Shell、Agent、user-only Skill、Command 与面板内运行均通过。主 `desktop` profile 已安装插件；临时 profile / 测试数据已清理。
> 文档已补齐使用（12）、设计阐明（13）、工作负载差距（14）与 API 参考（15）；实现差距见 14。

---

## 1. 这是什么

ComfyUI 把扩散模型的一整条推理链拆成有类型端口的节点，让“换模型、换采样器、复用流程、定位问题”变成画布上的操作。CueFlow 把同一套交互隐喻搬到 DSH：

- **节点** = 一次可独立观察与重试的工作单元（读输入、加载 Skill、调用 Command、跑 Agent、执行 Shell、条件分流、汇总输出）。
- **连线** = 有类型的数据依赖。只有兼容类型能连接，连线就是执行顺序与数据流的唯一事实。
- **画布** = 工作流的编辑、调试和分享界面。运行状态直接标在节点上，失败点一眼可见。
- **DSH 原生能力** = 节点不另造 Agent/Skill/Command 体系，而是调用 DSH 已有的 `ctx.skills`、`ctx.commands`、`ctx.subagents`、`ctx.shell`、`ctx.fs`。

它不是“让模型写一段脚本来编排”的替代品，而是给**人**一张可反复修改、可版本化、可审查的流程图；模型仍然可以在图里的 Agent 节点中工作。

## 2. 当前交付边界（MVP）

| 能力 | 状态 | 说明 |
|---|---|---|
| 在 DSH 左侧栏打开全屏 CueFlow 面板 | ✅ 真实 DSH 已验证 | 注册 `sidebar.panellist` + `main` keyed slot；面板可打开 |
| 画布：拖拽、缩放、平移、新建节点、连线、删除、撤销/重做 | ✅ 已实现 | 独立 UI 页 + 真实 DSH；拖拽/删除/重连已用 CDP 操作验证 |
| 节点：Input / Template / Agent / Skill / Command / Shell / Subflow / File Read / Condition / Merge / Output / Note | ✅ 从机实机已验证 | 确定性 / Shell / File / Agent / user-only Skill / Command / Subflow / UI 运行均通过 |
| Skill 节点支持模型可见与仅用户可见两类 Skill | ✅ 从机实机已验证 | trusted `ctx.skills.get()`；`code-review`（user-only）返回 `OK` |
| Command 节点调用 DSH 斜杠命令 | ✅ 从机实机已验证 | `ctx.commands.execute` 执行 `/remote-use status` 并返回文本 |
| 运行引擎：DAG 调度、并发、超时、取消、条件跳过、事件日志 | ✅ 已实现 + 测试 | 见 [执行引擎](07-execution-engine.md) |
| 工作流与运行记录持久化 | ✅ 真实 DSH 已验证 | `$DSH_HOME/storages/dsh-plugin-cueflow/`；真实保存/读取成功 |
| 独立 UI 测试页 + Mock Host | ✅ 已实现 | `pnpm ui` / `pnpm ui:shot`；不需要重启 DSH |
| 子工作流 / 循环 / 人工审批 / 任意 JS 代码节点 | 非 MVP | 见 [产品设计](03-product-design.md) 的非目标 |

## 3. 文档导航（主文档只做索引与摘要）

| 文档 | 回答的问题 |
|---|---|
| [01 · ComfyUI 研究](01-research-comfyui.md) | ComfyUI 的节点/连线/属性/执行模型是什么？它对 AI 视频工作流为什么有价值？哪些设计值得借，哪些不能照搬？ |
| [02 · DSH 研究](02-research-dsh.md) | DSH 插件如何打包、客户端如何加载、Slots 如何扩展、Skill/Command/Subagent/Shell/FS 的公开契约是什么？ |
| [03 · 产品设计](03-product-design.md) | 为谁做、解决什么问题、MVP 范围与非目标、成功标准。 |
| [04 · 系统架构](04-architecture.md) | Host / Client / 共享核心如何分层？数据如何流动？文件如何组织？ |
| [05 · 节点参考](05-node-reference.md) | 每个节点的端口、配置、执行语义与错误行为。 |
| [06 · UI 设计](06-ui-design.md) | 画布交互、布局、视觉语言、可访问性与独立测试页。 |
| [07 · 执行引擎](07-execution-engine.md) | 调度算法、值解析、条件分支、并发、超时、取消、事件与持久化。 |
| [08 · DSH 集成](08-dsh-integration.md) | 插件清单、Slot 注册、Host 路由、Skill/Command/Agent 适配细节与约束。 |
| [09 · 测试策略](09-testing-strategy.md) | 如何在不反复重启 DSH 的前提下验证逻辑、UI 与集成。 |
| [10 · 实施计划](10-implementation-plan.md) | 里程碑、验收标准、当前进度与后续迭代。 |
| [11 · 运维与安全](11-operations.md) | 安装、构建、配置、安全边界、故障排查、已知限制。 |
| [12 · 使用文档](12-user-guide.md) | 第一次安装、Hello World、节点速查、常用示例、运行对话框、排错与安全提示。 |
| [13 · 设计阐明](13-design-rationale.md) | 为什么是节点图、为什么是这 12 个节点、执行语义、会话模型、UI/安全取舍与备选方案。 |
| [14 · 工作负载差距](14-readiness-gaps.md) | 从“能跑”到“可承载工作负载”还差什么：审批、队列、预算、重试、恢复、表达力、工程化。 |
| [15 · API 参考](15-api-reference.md) | Host 路由、请求/响应、Workflow/Run 数据模型、错误码、限制、会话语义与 curl 示例。 |
| [16 · M6 计划](16-m6-plan.md) | 从可运行到可承载工作负载的 P0/P1 TODO、验收标准与实施顺序。 |
| [17 · 兼容性与发布](17-compatibility.md) | DSH/Node/OS 矩阵、发布检查、升级回滚、性能基线。 |
| [18 · M6 后续/延期项](18-deferred.md) | 认证身份、多实例锁、完整 ARIA、checkJs、npm 发布等明确延期。 |
| [19 · npm 发布结构](19-npm-release.md) | 发布文件清单、目录职责、DSH 识别方式与发布命令。 |
| [20 · 用户手册（带截图）](20-user-manual.md) | 面向第一次使用：界面地图、Hello World、审批、保存/版本、排错。 |
| [决策记录表](decisions.md) | 所有自主决策的编号、理由、替代方案与影响；后续调整以此表为入口。 |
| [设计自审](reviews/2026-10-27-design-review.md) | 文档自审清单、发现的问题与修正。 |
| [实现自审](reviews/2026-10-27-implementation-review.md) | 实现阶段发现的问题、修复与真实 DSH 联调记录。 |
| [从机实机验证](reviews/2026-10-28-remote-verification.md) | 从机 <test-host> 的安装、Shell/Skill/Command/UI 实测与修复。 |
| [M6 P0-1/P0-2 实测](reviews/2026-10-28-m6-p0-1-p0-2.md) | 真实 DSH 面板的审批门与 CSRF 防护结果。 |
| [M6 P0-3–P0-6 实测](reviews/2026-10-28-m6-p0-3-p0-6.md) | 队列、重试/跳过、局部重跑、心跳/接回、Shell/Agent 取消。 |

## 4. 一页架构

```text
┌──────────────────────────── DSH Web Client ────────────────────────────┐
│  sidebar.panellist(id=cueflow)  ──click──▶  main(key=cueflow)           │
│                                              CueFlowPanel               │
│                                    ┌─────────────┬──────────────────┐   │
│                                    │  Canvas     │  Inspector       │   │
│                                    │  nodes/links│  config/run/log  │   │
│                                    └─────────────┴──────────────────┘   │
│                                          │ fetch /api/dsh/cueflow/*    │
└──────────────────────────────────────────┼─────────────────────────────┘
                                           ▼
┌──────────────────────────── DSH Host (Cordis) ─────────────────────────┐
│  CueFlow Host plugin                                                   │
│   ├─ WorkflowStore     $DSH_HOME/storages/dsh-plugin-cueflow/*.json    │
│   ├─ RunManager        DAG scheduler + events + cancel                 │
│   ├─ Catalog           ctx.skills / ctx.commands / ctx.agents          │
│   └─ Node executors    agent → ctx.subagents                           │
│                        skill  → ctx.skills.get + agent                 │
│                        command→ ctx.commands.execute                   │
│                        shell  → ctx.shell                              │
│                        file   → ctx.fs                                 │
└────────────────────────────────────────────────────────────────────────┘
```

## 5. 关键设计决策（完整表见 [decisions.md](decisions.md)）

- **D-001**：插件名/包名 `dsh-plugin-cueflow`，Host 与 Client 同包，`dsh.bundle.patch` + `dsh.client`。
- **D-003**：面板放在 `main` 的 `cueflow` key，并由 `sidebar.panellist` 提供入口；不占用 Settings 页。
- **D-006**：运行状态用 **短轮询**（`GET /runs/:id?after=`）而非 SSE/WebSocket；MVP 更易测试、断线恢复简单。
- **D-007**：Skill 节点通过 `ctx.skills.get()` 直接装载正文并注入 Agent prompt；因此**仅用户可见**的 Skill 也能被工作流调用。
- **D-008**：Command 节点通过 `ctx.commands.execute()` 执行，保留 DSH 的命令生命周期日志；要求存在 live Agent。
- **D-009**：Agent/Skill 节点使用 `ctx.subagents.startActivation()` 的 `spawn`（优先）或 `fork` provider，`delivery: 'caller'`，不向父会话注入结算通知。
- **D-012**：MVP 不提供任意 JS 代码节点；可执行能力只通过白名单节点（Shell/FS/Skill/Command/Agent）暴露。
- **D-013**：客户端 UI 用 React（从 DSH module table `require('react')`），esbuild 打包为单文件 `lib/client.js`；不静态 import 任何 `@deepseek-ai/*`。
- **D-015**：独立 UI 测试页用 Vite + Mock Host 渲染**同一份** `src/client` 代码，避免“测试的是另一套 UI”。

## 6. 如何阅读 / 迭代

1. 先读本页与 [决策记录表](decisions.md)，了解边界与已定选择。
2. 改产品行为 → 先改 [03 产品设计](03-product-design.md) 与 [05 节点参考](05-node-reference.md)，再改实现。
3. 改交互/视觉 → 先改 [06 UI 设计](06-ui-design.md)。
4. 改执行/调度 → 先改 [07 执行引擎](07-execution-engine.md)。
5. 改 DSH 集成方式 → 先改 [08 DSH 集成](08-dsh-integration.md)，并在决策表新增/修订条目。
6. 每个里程碑结束更新 [10 实施计划](10-implementation-plan.md) 的进度与验收证据。

## 7. 已验证的事实（2026-10-28，从机 <test-host>）

- 临时 profile `cueflow-check`：`/health` → `ok:true`，`/catalog` 能列出 node types、skills、commands、live agents。
- 临时 profile：确定性图 → `hello!`；Read File → `remote-file-ok`；Shell `echo cueflow-remote-shell` → stdout（需给临时 profile 补 sandbox shim）。
- 从机 Subflow：父 workflow 运行子 workflow `wf_child_smoke`，输出 `nested!`。
- 临时 profile 发现并修复：Shell 必须按 session / workflow cwd 解析 `sandboxPolicy`；API 必须容忍 PowerShell 5.1 的 UTF-8 BOM。
- 主 `desktop` profile：插件安装成功；面板打开，3 节点 / 2 连线正常渲染；UI 运行 → `completed`，输出 `hello!`。
- 主 `desktop` profile：Command 节点执行 `/remote-use status` 返回文本；user-only Skill `code-review` 返回 `OK`；Shell `echo` 返回 stdout。
- 临时 profile 与测试数据已清理；主 `desktop` profile 保留插件安装。
- 从机实机截图：`remote-cueflow-panel-window.png`、`remote-cueflow-run-window.png`（`.screenshots/`）。

## 8. 外部参考

- ComfyUI 官方文档：<https://docs.comfy.org/basic-concepts/workflow>、<https://docs.comfy.org/basic-concepts/nodes>、<https://docs.comfy.org/basic-concepts/links>、<https://docs.comfy.org/basic-concepts/properties>
- DSH 官方文档：<https://deepseek-harness.github.io/deepseek-harness/>
- DSH 源码：<https://github.com/deepseek-ai/deepseek-harness>
- 本机 DSH 版本：`0.2.1-rc.3`；Web GUI：`http://127.0.0.1:2617`

---

*主文档刻意保持短小；细节一律放次级文档，避免每轮任务全量读取。*
