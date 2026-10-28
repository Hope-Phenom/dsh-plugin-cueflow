# 决策记录表

> 本表记录 CueFlow 开发中的**自主决策**，用于后续审查与调整。
> 状态：`accepted`（当前采用）、`provisional`（先用，待真实 DSH 验证）、`superseded`（被后续决策替代）。
> 调整方式：新增一行 `D-0xx` 并把旧行标为 `superseded`，不要直接删除历史；同步修改受影响文档与代码。

| ID | 日期 | 决策 | 理由 | 替代方案 | 影响 | 状态 |
|---|---|---|---|---|---|---|
| D-001 | 2026-10-27 | 插件名、包名、目录名统一为 `dsh-plugin-cueflow`；Host 与 Client 同包 | 用户要求“插件名同当前目录名”；单包安装最简单 | 拆分 host/client 两个包 | `package.json`、patch、`__ModuleLoader__.load` id | accepted |
| D-002 | 2026-10-27 | 文档采用“主文档 + 次级文档 + 决策表”结构，主文档只做索引/摘要 | 避免每轮全量读取；链接可追溯 | 单一大文档 | `docs/README.md` | accepted |
| D-003 | 2026-10-27 | 面板注册到 `main` 的 `cueflow` key，并由 `sidebar.panellist` 提供入口 | 与 DSH 插件管理器/Task Manager 的既有模式一致；全屏、稳定、可导航 | Settings 页；header action 弹窗；shell.overlay | `src/client/plugin.js` | accepted（L4 已验证） |
| D-004 | 2026-10-27 | 图模型采用有类型端口、单输入入边、DAG；不保存 UI 状态到 workflow | 可静态校验、可复现、可 diff | 自由文本连接；允许环；把画布状态存进 JSON | `shared/graph.js`、`validation.js` | accepted |
| D-005 | 2026-10-27 | MVP 节点集固定为 11 个：Input/Template/Agent/Skill/Command/Shell/Read File/Condition/Merge/Output/Note | 覆盖编码主链路，同时保持可审查 | 只做 Agent/Output；或一次做 30 个节点 | `shared/node-types.js` | accepted |
| D-006 | 2026-10-27 | 运行状态用 600ms 短轮询，不用 SSE/WebSocket | 实现简单、断线恢复天然、测试容易；MVP 节点数少 | SSE；WebSocket；长轮询 | `lib/core/api.js`、`src/client/api.js` | accepted（L4 已验证） |
| D-007 | 2026-10-27 | Skill 节点用 trusted `ctx.skills.get()` 直接加载正文，再注入子代理；不检查 `modelInvocable` | 支持“不面向 LLM/仅用户可见”的 Skill；与用户显式 `/skill` 调用语义一致 | 只允许 `modelInvocable`；让模型自己调 `skill` 工具 | `adapters.js`、catalog、审计日志 | accepted（真实执行待跑） |
| D-008 | 2026-10-27 | Command 节点优先 `ctx.commands.execute()`，失败回退 `find()+handler()`；必须有 live Agent | 保留 DSH 命令生命周期；回退保证版本兼容 | 只允许 `execute`；只允许 `handler` | `adapters.js` | provisional（真实执行待跑） |
| D-009 | 2026-10-27 | Agent/Skill 节点用 `ctx.subagents.startActivation()`，优先 `spawn`，次选 `fork`，`delivery:'caller'` | 不污染父会话；子代理结果直接返回；复用 DSH 权限/工具链 | 直接用 `ctx.agents.create()`；用 `ctx.workflowEngine` | `adapters.js` | accepted（Agent L4 已验证） |
| D-010 | 2026-10-27 | 不在客户端隐式取“当前会话”；运行对话框显式选择 live Agent，默认最后一个 | `main` 是 root scope，拿不到 session；显式选择更可预测 | 读 `useSessions` 猜当前；Host 按最近活动猜 | `src/client/inspector/RunDialog`、catalog | accepted |
| D-011 | 2026-10-27 | 自有 JSON 存储于 `$DSH_HOME/storages/dsh-plugin-cueflow/`，不用 `ctx.storage` | 少量文件、零依赖、插件禁用也能读；参考 notify | `ctx.storageDomain`；SQLite | `lib/core/store.js` | accepted |
| D-012 | 2026-10-27 | MVP 不提供任意 JS/Python 代码节点 | 安全与可审查性；避免 eval/动态执行 | 提供 JS 节点；用 Shell 代替 | 节点集、文档 | accepted |
| D-013 | 2026-10-27 | Client 用 React（loader `require`）+ esbuild 打成单文件 `lib/client.js`；`react` external | DSH module loader 只可靠提供 `react`；单文件避免相对 import | 无构建单文件手写；Vite 产物；Web Components | `scripts/build-client.mjs`、`entry.js` | accepted（L4 已验证） |
| D-014 | 2026-10-27 | 样式用原生 CSS + DSH token + CueFlow 变量；不引入 UI 组件库 | 体积小、主题跟随、无依赖 | Tailwind；CSS-in-JS；DSH 内部组件 | `styles.js` | accepted |
| D-015 | 2026-10-27 | 独立 UI 测试页复用**同一份** `src/client` 代码，Vite + Mock Host + Edge headless 截图 | 不重启 DSH 也能验证真实 UI；避免测试副本漂移 | 只在 DSH 里手工测；Playwright 全量 E2E | `ui/`、`scripts/screenshot-ui.mjs` | accepted |
| D-016 | 2026-10-27 | workflow 与 run 分离；run 保存完整 workflow 快照；默认保留 50 条 | 可复现、可比较；workflow 可继续编辑 | 只存 workflowId；把 run 写进会话日志 | `store.js`、`RunRecord` | accepted |
| D-017 | 2026-10-27 | 默认 fail-fast；条件分支用“未走端口无值 → 下游 skipped”，不用异常 | 行为可预测，图上可见 | 继续执行所有分支；用异常表达分支 | `executor.js` | accepted |
| D-018 | 2026-10-27 | MVP 不做文件写节点；写文件交给 Agent/Shell | 避免绕过 fs 观察策略；减少权限面 | 直接 `fs.writeFile`；用 `ctx.fs.writeText` | 节点集 | accepted |
| D-019 | 2026-10-27 | 节点类型名保留英文，UI 文案/按钮中英双语 | 与 ComfyUI 生态习惯一致；类型名是稳定标识 | 全中文节点名 | `locale/*.json` | accepted |
| D-020 | 2026-10-27 | 子图、循环、分组、Bypass、局部重跑不做进 MVP | 先验证“编辑-运行-观察”闭环 | 一次做全 | 实施计划 M5 | accepted |
| D-021 | 2026-10-27 | API 只挂在 DSH Web 服务器的 `/api/dsh/dsh-plugin-cueflow`，不另开端口 | 同源、复用认证、安装简单 | 独立 HTTP server | `lib/index.js` | accepted |
| D-022 | 2026-10-27 | 测试用 Node 内置 `node:test`，不引入 Vitest/Jest | 零依赖、启动快；CI 简单 | Vitest | `package.json` | accepted |
| D-023 | 2026-10-27 | 对 DSH 返回值做防御性读取，并在 fallback 时记日志 | DSH 版本演进；文档与实现可能有差异 | 强绑定某一版本 | `adapters.js` | accepted |
| D-024 | 2026-10-27 | 目标 DSH `>=0.2.0 <0.3.0`，本机验证 `0.2.1-rc.3` | 与当前环境一致；避免跨大版本承诺 | 不写 engines；追最新 | `package.json` | accepted |
| D-025 | 2026-10-27 | 视觉方向：深色制图台 + 提示卡 + cue light；单一强调色琥珀 | 与 ComfyUI 的可读性对齐，同时避免模板化 SaaS 风 | 亮色为主；多彩霓虹 | `06-ui-design.md`、`styles.js` | accepted |
| D-026 | 2026-10-27 | 撤销/重做用 workflow JSON 快照，最多 50 步；拖拽在 pointerup 合并为一步 | 实现简单、可靠；足够 MVP | 命令模式 diff；CRDT | `App.jsx` | accepted |
| D-027 | 2026-10-27 | 轮询间隔 600ms；页面隐藏时降频（若实现） | 平衡实时感与开销 | 200ms；SSE | `src/client/api.js` | accepted |
| D-028 | 2026-10-27 | 不把 CueFlow run 写入 DSH session log | 避免污染对话；运行记录独立 | 写 `session/event` | `index.js` | accepted |
| D-029 | 2026-10-27 | 输出截断：单节点 20k 字符、事件 2k 条、预览 4k 字符 | 防止内存/传输膨胀 | 不截断；更小 | `constants.js` | accepted |
| D-030 | 2026-10-27 | Shell 只走 `ctx.shell`，不提供 env 覆盖 | 继承 DSH subprocess/sandbox；减少绕过面 | 直接 `child_process`；暴露 env | `adapters.js` | accepted |
| D-031 | 2026-10-27 | 文件只读，且走 `ctx.fs` | 继承文件策略；MVP 足够 | 直接 `fs`；读写都做 | `adapters.js` | accepted |
| D-032 | 2026-10-27 | 含 Agent/Skill/Command 的图，没有 live Agent 时运行前校验失败 | 错误早于运行；文案明确 | 运行到节点再报错；自动建会话 | `validation`/`RunDialog` | accepted |
| D-033 | 2026-10-27 | Skill 节点日志记录 `modelInvocable/userInvocable` | 审计“为什么这个 user-only skill 被执行” | 不记录 | `adapters.js` | accepted |
| D-034 | 2026-10-27 | Workflow `schemaVersion: 1`；加载时保留未知字段，校验提示未知字段 | 向前兼容；便于后续迁移 | 严格丢弃未知字段 | `shared/validation.js` | accepted |
| D-035 | 2026-10-27 | MVP 不支持第三方动态注册节点类型 | 工作流可移植、可审查；避免任意代码 | 插件注册节点 | `shared/node-types.js` | accepted |
| D-036 | 2026-10-27 | 布局按 **CueFlow 面板自身宽度** 切换 compact/narrow，而不是 window 宽度 | DSH 左侧栏占用 280px，1440 窗口下面板只有 1160px；按 window 判断会剩 620px 画布 | 只用 CSS media query；固定 220px 节点库 | `App.jsx` ResizeObserver、`styles.js` `.compact/.narrow` | accepted |
| D-037 | 2026-10-27 | fit 最小缩放 0.6，模板节点位置压缩以便默认视图完整可见 | 1440 窗口 + DSH 侧栏下，0.72 会裁切首尾节点；0.6 保证图完整 | 强制 1.0；不 fit | `App.jsx`、`lib/core/templates.js` | accepted |
| D-038 | 2026-10-27 | `agentPreset` 只在 provider `capabilities.agentPreset` 为真时传入，否则明确报错 | DSH 会在 start 前校验请求能力，静默丢弃会让用户误解 | 不传、静默忽略 | `adapters.js` | accepted |
| D-039 | 2026-10-27 | `POST /runs` 在调度前校验必填 Input 的运行值 | 运行前失败比节点内 `INPUT_REQUIRED` 更便宜、更清晰 | 只靠 UI 校验；让 adapter 报错 | `shared/validation.js`、`api.js` | accepted |
| D-040 | 2026-10-27 | 轮询接口 `after` 省略时默认 -1，保证首屏包含 `run/start`（seq 0） | 事件序号从 0 开始；默认 0 会丢掉首条事件 | seq 从 1 开始；首屏单独请求 | `runs.js`、`api.js` | accepted |
| D-041 | 2026-10-27 | 真实 DSH 联调用临时 profile `cueflow-check`，不改当前 `desktop` profile | 避免重启/污染用户正在使用的 DSH；仍能验证真实模块加载与 API | 直接安装到 desktop 并重启 | 临时 profile（已删除） | accepted（后被 D-044 扩展） |
| D-042 | 2026-10-28 | Shell 节点必须显式传 `sandboxPolicy`：live session 用 session cwd/mode，无 session 用 workflow cwd 作 workspace root | 从机实测 `workspace-write` 默认 root 为 `C:\Users\<user>`，`%TEMP%` 在其内部导致 Windows ACL 拒绝 | 只依赖 shell executor 默认 policy；强制 danger-full-access | `adapters.js`、`index.js` | accepted（从机已验证） |
| D-043 | 2026-10-28 | HTTP body 解析容忍 UTF-8 BOM | PowerShell 5.1 `Set-Content -Encoding UTF8` 产生 BOM；真实测试出现 `BAD_JSON` | 要求客户端去 BOM；拒绝 BOM | `api.js` + API 测试 | accepted |
| D-044 | 2026-10-28 | 从机主 `desktop` profile 用 `dsh plugin add` 安装，临时 profile 只做无干扰冒烟；安装/重启由用户手动完成 | 保持用户日常 DSH 可控；仍获得真实桌面验证 | 自动结束/重启 DSH；只测临时 profile | 从机安装流程 | accepted |
| D-045 | 2026-10-28 | Workflow run 是 CueFlow Host 的独立 run，不是父 DSH 会话的 turn；Agent/Skill 默认 `spawn` 子会话，Command 在父会话执行，Shell/File 是 Host 能力 | 保持父会话干净、避免子代理继承整段上下文；Command 需要父会话生命周期；run 需要独立复现 | 所有节点塞进父会话；默认 `fork` 继承父上下文；每个节点单独一个顶层 Agent | `executor.js`、`adapters.js`、`12/13` 文档 | accepted |
| D-046 | 2026-10-28 | M6 会话模式采用语义名 `isolated / workflow / parent`，不向用户暴露 `spawn/fork` | 用户需要选择的是上下文边界；`workflow` 共享 child 是隔离与连续性的折中；`parent` 写回对话需显式警告 | 所有节点同会话；只暴露 provider 名；默认 parent | [16 · M6 计划](16-m6-plan.md) | accepted（P1 实施） |
| D-047 | 2026-10-28 | Shell/Command 的审批使用 CueFlow Host 自有队列，不复用 `ctx.approval.request()` | 该 API 要求 open turn，而 workflow run 在 Host、不在 DSH turn 内；复用会抛错或迫使伪造 turn | 伪造 DSH turn；默认 allow；只在 UI 做 pre-run 确认 | `executor.js`、`runs.js`、`api.js`、`ApprovalDialog.jsx` | accepted（P0-1） |
| D-048 | 2026-10-28 | API 写请求用 `X-CueFlow-Request: 1` + Origin/Sec-Fetch-Site + JSON body 做 CSRF 防护，不新增 CueFlow token | 自定义 header 不能被跨站表单设置，跨源 preflight 不放行；身份认证继续交给 DSH Web 表面 | 自建 token 登录；开放 CORS；只依赖 SameSite cookie | `api.js`、`src/client/api.js` | accepted（P0-2） |
| D-049 | 2026-10-28 | RunManager 使用有界全局队列 + 每 run budget；环境变量控制上限，默认 2 个 active run / 30min / 50 Agent calls / token 不限 | 防止连续长 run 耗尽 Host；Queue 比 429 对桌面用户更可控；token 上限是 best-effort，取决于 adapter usage | 无限制并发；只做单 run 超时；直接 429 | `runs.js`、`executor.js`、`index.js` | accepted（P0-3） |
| D-050 | 2026-10-28 | 节点 `retry` 默认 0，最多 5 次；`onError: fail \| skip` 先落地，暂不引入 branch | Shell/Command 非幂等，默认重试会放大副作用；skip 足以让可选步骤失败后继续；branch 需要新的错误端口契约 | 默认重试 3 次；只做 fail-fast；把 onError 做成任意 JS | `executor.js`、`shared/node-types.js` | accepted（P0-4a） |
| D-051 | 2026-10-28 | 长节点每 10s 发 `node/heartbeat`；`GET /runs` 合并内存 active/queued；UI bootstrap 自动接回 | 轮询只有 start/end 会让长 Agent 看起来卡死；落盘 queued 状态滞后会让运行中 run 从列表消失 | SSE；只靠 run id 查询；每次心跳落盘 | `executor.js`、`runs.js`、`App.jsx` | accepted（P0-5a） |
| D-052 | 2026-10-28 | 局部重跑用 `seedValues` + `fromNodeId` 上游闭包，新 run 不重跑成功祖先 | 保留上游输出、避免重复副作用；新 run 仍有独立审计记录 | 原地恢复同一 run；重跑整图 | `executor.js`、`api.js`、`App.jsx` | accepted（P0-4b） |
| D-053 | 2026-10-28 | Agent 取消时显式 `activation.dispose()` 并让它与 `activation.result` 竞速 | 真实测试发现只传 abort signal 不足以终止子代理；run 会一直 running | 等模型自然结束；只标记 cancelled 但后台继续 | `adapters.js` | accepted（P0-6） |
| D-054 | 2026-10-28 | 会话模式先开放 `isolated` / `inherit`，`workflow` / `parent` 不伪装可用 | `sendMessage` 只返回 inbox id，没有等待 child turn 结果的宿主 API；parent 没有向自身发 turn 的 seam | 暴露不可用选项；用轮询 session 事件猜结果 | `shared/constants.js`、`validation.js`、`adapters.js`、Inspector | accepted（P1-1a） |
| D-055 | 2026-10-28 | `settings.cancelPolicy` 支持 `abort-all` / `drain`，默认 abort-all | abort-all 适合危险操作/清场；drain 适合让当前节点完成再退出；由 workflow 显式选择 | 全局固定 abort-all；取消后静默继续 | `executor.js`、`Inspector`、validation | accepted（P0-6） |
| D-056 | 2026-10-28 | 增加 Windows GitHub Actions CI：install/test/build/ui:build/ui:shot/pack dry-run | 没有 CI 时构建产物和截图回归只能靠本地手工；Windows runner 覆盖平台差异 | 只做 Linux CI；只跑 test | `.github/workflows/ci.yml` | accepted（P1-5a） |
| D-057 | 2026-10-28 | Workflow 保存前归档旧版到 `workflows/.history`，保留 20 版，提供 list/read/restore API | 保存即覆盖会让误改不可回滚；文件级归档比数据库轻，适合当前 local-json store | 只保留一个备份；引入 SQLite | `store.js`、`api.js`、Inspector | accepted（P1-3a） |
| D-058 | 2026-10-28 | 草稿保存在浏览器 localStorage（700ms debounce），只在无 active run 时自动恢复 | 不引入后端 draft 端点/目录；刷新/崩溃可恢复；跨设备不保证 | 后端草稿文件；每次编辑自动保存正式版本 | `App.jsx` | accepted（P1-3b） |
| D-059 | 2026-10-28 | 用 Playwright `channel: msedge` 跑独立 UI harness 的窄窗口 E2E | 不下载 Chromium，CI Windows 与本地 Edge 一致；只测 UI，不依赖 DSH | 只用截图脚本；用 Jest+jsdom | `playwright.config.js`、`e2e/`、CI | accepted（P1-4a） |
| D-060 | 2026-10-28 | Subflow 节点用 `runNested` 直接执行已保存 workflow，绕过全局队列，深度上限 5 | 父 run 占着 active 槽，子 run 若排队会死锁；嵌套 run 仍写入 runs/ 可审计 | 子 run 入队；不支持子图 | `adapters.js`、`runs.js`、`node-types.js` | accepted（P1-2a） |
| D-061 | 2026-10-28 | Fan-out 顺序执行子 workflow，默认最多 20、上限 100 | 避免一次 fan-out 启动过多子 run；顺序实现先验证映射/结果聚合，并发可后续加 | 一次 Promise.all 100 个；不做上限 | `adapters.js`、`node-types.js` | accepted（P1-2b）并已从机验证 |
| D-062 | 2026-10-28 | Fan-out 增加 `concurrency`（1–8）与 `onItemError=fail|skip`；skip 结果记 `{error}`，汇总到 errors | 真实批处理既要并行，也要能跳过坏项并保留失败证据 | 全有或全无；并发固定 8 | `adapters.js`、`node-types.js` | accepted（P1-2c）并已从机验证 |
| D-063 | 2026-10-28 | 复制/粘贴只针对当前选中节点，用内部 clipboard ref，不接系统剪贴板 | 不引入权限/格式兼容；`Ctrl+C/V` 在输入框内保留原生命令 | 接系统 clipboard API；多选 | `App.jsx`、`e2e/` | accepted（P1-4b） |
| D-064 | 2026-10-28 | 给运行取消按钮加 `data-cue-action="cancel-run"`，并用 Playwright 覆盖运行/取消 | E2E 需要稳定选择器；真实用户仍点同一按钮，不影响语义 | 依赖文案选择器；只测 API 取消 | `Inspector.jsx`、`App.jsx`、`e2e/` | accepted（P1-5b） |
| D-065 | 2026-10-28 | ESLint flat config 只启 syntax/safety 规则，忽略 `h/Fragment/_*`；CI 跑 `pnpm lint` | 现有 JSDoc 无类型系统，强 lint 会制造噪音；先建立 0 warning 基线 | 立即迁移 TS；全量严格规则 | `eslint.config.js`、CI | accepted（P1-5c） |
| D-066 | 2026-10-28 | Workspace 隔离先做逻辑过滤：保存记录 `settings.workspace`，列表按 cwd 过滤，legacy 全局可见 | 不迁移现有文件布局，先阻止跨项目列表污染；物理隔离另做 | 直接迁移目录；不做隔离 | `store.js`、`api.js`、`App.jsx` | accepted（P1-3c） |
| D-067 | 2026-10-28 | 多选用 `selectedNodeIds` 数组，Shift/Ctrl 点击切换；复制/删除作用于整个选择集 | 单节点 inspector 保持 `selectedNodeId` 不变，降低改动面；框选后续再加 | 引入完整 selection model/框选 | `App.jsx`、`Canvas.jsx`、`e2e/` | accepted（P1-4c） |
| D-068 | 2026-10-28 | 加 Reroute 直通节点（any → any），不做类型转换 | 大图需要整理连线，但不应引入隐式执行/转换 | 用 Note 代替；做多端口 reroute | `node-types.js`、`adapters.js` | accepted（P1-4d） |
| D-069 | 2026-10-28 | 多选对齐只做左/上/右/下；不做分布/网格/自动布局 | 对齐是低风险、可测试的 80% 收益；自动布局需要图算法和新交互 | 立即做自动布局；只做单节点对齐 | `App.jsx`、`Canvas.jsx`、`e2e/` | accepted（P1-4e） |
| D-070 | 2026-10-28 | Workflow schema 迁移在 Host 启动时执行：缺失/0 → 当前 v1；未来版本不动 | 避免打开旧 workflow 时才失败；未来版本留给未来迁移器 | 惰性迁移；拒绝所有非 v1 | `store.js`、`index.js` | accepted（P1-3d） |
| D-071 | 2026-10-28 | 加 `pnpm bench`（200 节点/500 边 merge DAG），CI 执行；暂不发布 npm | 用数量级基线防回退；发布还缺干净环境/CI 安装验证，先不把 `private` 改掉 | 直接 npm publish；先做并发 run 压测 | `scripts/bench.mjs`、CI、CHANGELOG | accepted（P1-5d） |
| D-072 | 2026-10-28 | 框选用 Shift+拖拽画布空白，矩形与节点包围盒相交即选中 | 不引入新工具模式，复用 Shift 修饰键；框选用屏幕坐标换算 world | 增加选择工具按钮；只做全选 | `Canvas.jsx`、App、e2e | accepted（P1-4f） |
| D-073 | 2026-10-28 | Group 是视觉框（无端口/不执行），选中 2+ 节点后按钮生成包围框；拖动 Group 时按 members 同步移动成员 | 先满足大图可读性；members 是显式 id 数组，不做父子坐标/自动重排 | 做真正容器分组；自动布局 | `node-types.js`、`Canvas.jsx`、App、e2e | accepted（P1-4g） |
| D-074 | 2026-10-28 | run 增加 `triggeredBy`（body/header/UI），作为审计来源标记，不作为认证 | 多用户认证仍归 DSH；但 run 记录至少能区分 UI/API/自动化触发 | 伪造可信用户身份；无审计字段 | `executor.js`、`runs.js`、`api.js` | accepted（P1-3e） |
| D-075 | 2026-10-28 | Workspace 物理隔离：新 workflow 写入 `workspaces/<sha256(cwd)>/workflows`，读取优先 workspace 再回退 global legacy | 不破坏旧数据，同时阻止新项目跨 workspace 写入；legacy 仍可见是迁移策略 | 立即迁移所有旧文件；只做逻辑过滤 | `store.js`、`api.js`、`App.jsx` | accepted（P1-3f） |
| D-076 | 2026-10-28 | run 保留条数用 `CUEFLOW_RUN_RETENTION` 环境变量；包增加 repository/homepage/bugs/keywords/engines | 不给 UI 增加配置面；发布元数据先补齐，实际 npm publish 仍需账号/干净环境 | 固定 50；不做发布元数据 | `store.js`、`index.js`、`package.json` | accepted（P1-3g） |
| D-077 | 2026-10-28 | `workflow` 模式暂不开放：DSH receipt 不暴露 child handle，settle 后 `agents.get` 取不到；4 次从机实测 childId 均变化 | 当时宁可显式不开放，也不虚假通过 | 强行用每次新 child 假装复用 | `adapters.js`、validation、docs/reviews | superseded by D-078 |
| D-078 | 2026-10-28 | `workflow` 改走 `subagents.sendMessage(parent, childId, content, { signal })` 冷恢复，再等 child idle 并取 session events；从机 `<run-id>` 两节点 childId 一致 | 官方文档要求 `options.signal`；之前漏传导致冷恢复失败。保留 caller 结果语义，不向父会话注入消息 | 依赖 `agents.get` 在 settle 后返回；每次新 child | `adapters.js`、validation、docs/reviews | accepted（P1-1） |

---

## 关键决策详解

### D-003 为什么是 `main` + `sidebar.panellist`

DSH 的 `main` 是 keyed slot，sidebar 的 panellist 每个 `id` 对应一个 main key；插件管理器与 Task Manager 都用这个模式。相比 Settings 页，它给画布全屏空间；相比 header action 弹窗，它不绑定某个会话；相比 `shell.overlay`，它有稳定的导航语义。代价是 root scope 拿不到 session，因此需要 D-010。

### D-006 为什么先轮询

CueFlow 的 MVP 单次 run 节点数少（< 50），600ms 轮询足以让状态“看起来实时”。SSE 需要处理连接生命周期、代理缓冲、断线重连、DSH Web 服务器的长连接清理；这些都会增加测试面。轮询的接口同时是测试接口，L2 可以直接驱动。若后续节点/日志量增大，再切 SSE，客户端 API 层可保持不变。

### D-007 Skill 的“面向/不面向 LLM”

DSH 的 `SkillInvocationPolicy` 有两个独立布尔：`modelInvocable` 与 `userInvocable`。模型-facing 的 `skill` 工具会拒绝 `modelInvocable:false` 的 skill；但 `ctx.skills.get()` 是 trusted caller 接口，不检查这个标志。CueFlow 是“用户显式编排”的宿主，等价于用户从 `/` 菜单选择 skill，因此直接 `get()` 是合理的。

审计：节点日志记录 `{ name, source, modelInvocable, userInvocable }`，让用户能看出“这个 skill 本来是 user-only”。如果未来 DSH 改变 `get()` 的语义，适配器会失败并提示，而不是静默绕过。

### D-008 Command 的两种调用

`ctx.commands.execute()` 是官方生命周期入口，会记录 `command/run` / `command/done`；但它是 `@Remote` 方法，且不同 DSH 版本的返回形状可能不同。`find()+handler()` 更底层，绕过生命周期，但至少能执行。CueFlow 优先 `execute`，兼容失败时回退，并在日志中标注 `adapter:fallback`。这样既不放弃审计，也不会因版本差异完全不可用。

### D-009 为什么用 subagent 而不是 `ctx.agents.create()`

`ctx.agents.create()` 需要完整的 `CreateAgentOptions`（session meta、cwd、preset、persistence、setup），并且创建的是**顶级** Agent，不会自动进入父会话的 subagent catalog。`ctx.subagents.startActivation()` 是 DSH 为“父级委托”设计的公开 seam：它负责身份、容量、父子关系、cancellation、结果收集；`delivery:'caller'` 又避免向父会话注入通知。代价是必须有 live 父 Agent（D-010）。

**实测（2026-10-27）**：临时 DSH profile 中 Agent 节点返回 `OK`，耗时 842ms，`meta.childId = session-…`，`stopReason = completed`，无父会话通知。

### D-010 为什么不让 Host 猜“当前会话”

`main` 是 root-scoped slot，标准 props 只有 `useSessions` 等，没有 `sessionId`。Host 也无法从一次 HTTP 请求可靠地知道“用户当前在看哪个会话”。猜测会导致：运行跑到错误的会话、子代理出现在用户没预期的父级下。显式选择 + 默认最后一个 live agent，是更可解释的行为。

### D-013 为什么有构建步骤

DSH 的 client bundle 是单文件 CJS 工厂，不能可靠地加载相对 ESM import。把 UI 拆成多个源文件、用 esbuild 打成一个 IIFE，是兼顾可维护性与加载约束的最简单方案。`react` 保持 external，由 `factory(require)` 注入，避免把 React 打进 bundle 导致 hooks/context 不共享。

### D-015 独立 UI 测试页的边界

它**不是**另一个产品页面：它只提供 fake `ctx.slots`、fake `ctx.locale`、Mock Host 和一个容器，组件树仍然来自 `src/client`。这样可以：

- 在浏览器里快速迭代拖拽/连线/检查器；
- 用 Edge headless 截图检查明暗与窄屏；
- 不触碰 DSH 进程。

它不能验证：slot 是否真的注册成功、DSH 的真实主题 token、真实 Skill/Command/Agent。那些留给 L4。

### D-017 条件分支为什么用 `undefined`

如果未走分支抛异常或返回特殊错误，run 会失败，用户必须写“忽略错误”的逻辑；如果用 `null`，又难以区分“合法的空值”。`undefined` 在运行时表示“这个端口没有值”，调度器据此把必填下游标记 `skipped`，行为与 ComfyUI 的“未执行节点导致下游缺输入”一致。Merge 节点负责把可选分支汇合。

---

## 待验证清单（provisional 决策）

| 决策 | 需要验证 | 验证方式 | 状态 |
|---|---|---|---|
| D-007 | 真实 user-only Skill 的 `ctx.skills.get()` + 子代理执行 | 从机 `code-review` | ✅ 已验证：返回 `OK`，childId 创建/释放 |
| D-008 | `ctx.commands.execute` 的返回形状与可用性 | 从机 `/remote-use status` | ✅ 已验证：返回状态文本 |
| D-009 | `spawn`/`fork` 的 `childId` 规则、能力标志 | 本机/从机 Agent/Skill | ✅ 已验证：completed，childId 创建/释放 |
| D-006 | 轮询在真实 DSH 的延迟与资源 | 本机/从机面板内运行 | ✅ 已验证：事件轮询、completed |
| D-003 | `sidebar.panellist` 点击是否自动选 main key | 从机主 DSH | ✅ 已验证：点击 CueFlow 打开 main panel |
| D-013 | esbuild 产物能否被 module loader 接受 | 从机主 DSH | ✅ 已验证：面板渲染 |
| D-038 | provider 能力不匹配时的错误是否可读 | 用不支持 preset 的 provider 触发 | ⏳ 未跑（逻辑有单测） |

---

## 变更日志

| 日期 | 变更 |
|---|---|
| 2026-10-27 | 初版：D-001 ~ D-035 |
| 2026-10-27 | 实现后修订：D-003/D-006/D-009/D-013 经真实 DSH 验证；新增 D-036 ~ D-041；D-007/D-008 仍待真实执行 |
| 2026-10-28 | 从机 <test-host> 实机验证：D-007/D-008 已通过；新增 D-042（sandboxPolicy）、D-043（BOM）、D-044（从机安装流程）、D-045（run 与 DSH 会话边界） |
| 2026-10-28 | 文档补齐：12 使用文档、13 设计阐明、14 工作负载差距、15 API 参考；主文档与 README 导航同步 |
| 2026-10-28 | M6 启动：新增 16 M6 计划；D-046 会话模式、D-047 Host 审批队列；P0-1 审批链实现 |
