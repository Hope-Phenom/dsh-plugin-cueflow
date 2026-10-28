# 实现自审 · 2026-10-27

> 对象：`shared/`、`lib/`、`src/client/`、`ui/`、`scripts/`、`test/`，以及真实 DSH 临时 profile 联调。
> 记录实现阶段实际发现的问题、修复方式，以及仍然存在的缺口。

## 1. 验证结果摘要

| 层 | 结果 |
|---|---|
| L1 单元测试 | 55 个测试全部通过（graph/validation/template/executor/adapters/API/host apply/templates） |
| L2 API 集成 | workflow CRUD、validate、run 轮询、取消、400/404/409/422 均通过 |
| L3 独立 UI | dark/light/narrow/run 截图；CDP 合成拖拽、连线、删除、自连拒绝、保存、运行对话框均通过 |
| L4 真实 DSH | 临时 profile 启动、插件加载、面板打开、health/catalog、保存、确定性图、Shell、Read File、Agent、面板内运行全部通过 |
| 清理 | 临时 profile、测试 workflow/run 已删除；未改 `desktop` profile |

## 2. 发现的问题与修复

### P1 · JSX 编译后 `h` / `Fragment` 未定义（白屏）

- **现象**：独立 UI 页加载后 `#root` 为空，CDP 报 `ReferenceError: h is not defined`。
- **原因**：Vite/esbuild 配置 `jsxFactory: 'h'`，但 `ui/main.jsx` 没有 import `h`；`Icons.jsx` / `Canvas.jsx` 使用 `<>...</>` 但没有 import `Fragment`。
- **修复**：`ui/main.jsx` 增加 `import { h }`；`Icons.jsx`、`Canvas.jsx` 增加 `Fragment` import。
- **验证**：页面完整渲染，无异常。

### P2 · 点击节点也会写入撤销历史

- **现象**：只点一下节点（不拖动）也会产生 history 快照。
- **修复**：`onBeginNodeDrag` 从 pointerdown 移到第一次实际移动（>2px）；拖动开始才记录。
- **验证**：CDP 拖拽测试节点位置从 `40,80` 变为 `140,147`。

### P3 · ResizeObserver 在 loading 阶段挂载，永远观察不到面板

- **现象**：真实 DSH 面板宽度 1160，但 `compact` 类未生效，画布只剩 620px、缩放 60%。
- **原因**：观察 effect 的依赖为 `[]`，首次运行时组件还在 loading，`rootRef.current` 为空；loading 变 false 后 effect 不重跑。
- **修复**：effect 依赖 `[loading]`，loading 结束后再观察 `.cue-root`。
- **验证**：真实 DSH 面板 class 为 `cue-root compact`，画布 776px，fit 75%。

### P4 · compact 阈值按 window 而非面板宽度，DSH 下不触发

- **现象**：1440 窗口下 CueFlow 面板只有 1160px（DSH 侧栏占 280），但 `innerWidth > 1100`，仍使用 220px 节点库 + 320px 检查器。
- **修复**：改为容器驱动：`compact < 1250`、`narrow < 1000`；新增 `.cue-root.compact` / `.narrow` CSS；检查器默认在 narrow 下关闭，可手动打开为覆盖层。
- **验证**：真实 DSH 1440 窗口下画布 776px；独立 UI 1440 下仍为完整双栏。

### P5 · fit 默认缩放裁切首尾节点

- **现象**：1440 下 4 节点模板 fit 到 72%，首节点左侧被画布裁切。
- **修复**：fit 最小缩放改为 0.6；review/implement 模板的节点 x 位置压缩到 40/300/560/820；fit 后图完整可见。
- **验证**：dark/light 截图首尾节点完整。

### P6 · 图标组件丢弃 `style` 等 props

- **现象**：`Chevron` 的旋转 style 不生效；其他图标传入的属性也被 `svg()` 的解构丢掉。
- **修复**：`svg()` 使用 `...rest` 透传到 `<svg>`。
- **验证**：dock 展开箭头可旋转。

### P7 · `StatusDot` 对 `completed` 没有绿色样式

- **现象**：运行完成的 badge 仍是灰点。
- **修复**：CSS 增加 `.cue-status-dot.completed`。
- **验证**：run 截图 badge 为绿色。

### P8 · 运行时必填 Input 没有在 API 侧校验

- **现象**：直接 `POST /runs` 传空 required input，会进入 adapter 才报 `INPUT_REQUIRED`。
- **修复**：新增 `validateRunInputs()`，`POST /runs` 在调度前返回 422；UI 运行对话框仍做一次客户端校验。
- **验证**：单元/API 路径；UI 添加空 Input 后点击 Run 被阻止。

### P9 · `agentPreset` 未按 provider 能力门控

- **现象**：如果 provider 不支持 `agentPreset`，请求会在 DSH start 前被拒绝，错误信息不够直接。
- **修复**：`runAgentNode` 显式检查 `provider.capabilities.agentPreset`，给出 `AGENT_PRESET_UNSUPPORTED`。
- **验证**：单测覆盖基础路径；真实 DSH 未使用 preset。

### P10 · `after=0` 默认丢失 `run/start`（seq 0）

- **现象**：首屏事件从 seq 1 开始，看不到 run/start。
- **修复**：`runs.get` 默认 `after=-1`，API 省略参数时返回全部事件；客户端首屏用全部，后续按 lastSeq 增量。
- **验证**：真实 DSH 面板运行显示 16 条事件，包含 run/start。

### P11 · NodeLibrary 分类标题在 compact 下仍显示

- **现象**：图标栏里出现 “Input / Output” 文字，挤在图标上方。
- **原因**：分类标题 button 的内联 `display:flex` 覆盖了 CSS 的 `display:none`。
- **修复**：移除内联 display，把 flex 布局放到 CSS；compact 下隐藏。
- **验证**：narrow 截图只剩图标。

### P12 · compact 下搜索图标残留

- **现象**：图标栏顶部仍有一个放大镜。
- **修复**：给图标 span 加 `cue-library-search-icon`，compact 下隐藏。
- **验证**：真实 DSH compact 截图无残留。

### P13 · pnpm 12 默认拒绝 esbuild postinstall

- **现象**：`pnpm install` 报 `ERR_PNPM_IGNORED_BUILDS`，Vite/esbuild 无法工作。
- **修复**：`pnpm-workspace.yaml` 写入 `allowBuilds.esbuild: true`；移除 package.json 中已不被 pnpm 12 读取的 `pnpm` 字段。
- **验证**：`pnpm build` / `pnpm ui:build` 正常。

### P14 · 真实 DSH 面板宽度与 standalone 不一致

- **说明**：standalone 1440 没有 DSH 侧栏，CueFlow 面板 1440；真实 DSH 面板 1160。两者都通过同一 `compact` 逻辑适配。
- **验证**：真实 DSH 截图 `real-dsh-1440.png`。

## 3. 仍然存在的缺口

1. **真实 Skill 节点执行未跑**：`ctx.skills.get()` + 子代理路径有 mock 单测；tmp profile 只有系统 skill，未跑 user-only skill。
2. **真实 Command 节点执行未跑**：`ctx.commands.execute()` 的返回形状仍是 provisional；适配器有 execute/find+handler 两条路径。
3. **真实取消中的子代理未跑**：单元测试覆盖 cancel/abort，但真实 `dispose()` 时序未观测。
4. **真实受限 sandbox 的 Shell 拒绝路径未跑**：真实 Shell 在 temp profile 的默认策略下成功执行 `echo`。
5. **无 Playwright E2E**：用 CDP 合成事件 + 截图替代；M5 可补。
6. **Agent 标题为空**：catalog 的 `title` 从 session header 读不到时为空；不影响功能，后续可接 sessionTitle 服务。
7. **面板宽度 RWD 仅按容器**：极窄（< 600）时画布/头部仍可用但拥挤；M5 可做移动端布局。

## 4. 自审结论

- 关键路径已从“文档承诺”变为“真实 DSH 可运行”：面板、API、保存、确定性图、Shell、File、Agent、UI 轮询均通过。
- 发现的问题集中在**绑定层**（React 工厂、容器尺寸、DSH 面板宽度）而不是图/执行逻辑；L1 图算法测试没有出现回归。
- 未验证项被明确标注，没有把 mock 测试写成真实执行。
- 下一步优先级：真实 Skill/Command smoke → 取消时序 → Playwright/更多截图 → M5 局部重跑与子图。
