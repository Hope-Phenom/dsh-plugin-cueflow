# 06 · UI 设计

## 1. 设计意图

CueFlow 的界面不是“又一个后台仪表盘”，而是一张**舞台提示表（cue sheet）**：

- 节点像一张张**提示卡**，左侧有一条分类色脊，右上角有一颗“cue light”状态灯；
- 画布是深色制图台，网格是坐标纸；运行时只有状态灯和连线在动；
- 其余 chrome（工具栏、检查器、日志）保持安静、紧凑、可扫读。

关键词：**制图台 / 提示卡 / cue light / 精确 / 不喧哗**。

避免：紫蓝渐变 SaaS 风、玻璃拟态、每张卡同样的圆角和阴影、装饰性大标题、全大写小标签。

## 2. 视觉 token

### 2.1 颜色

| 名称 | 深色 | 浅色 | 用途 |
|---|---|---|---|
| `--cue-canvas` | `#0d1015` | `#e9edf2` | 画布底 |
| `--cue-grid` | `#1b222c` | `#d4dbe4` | 网格线 |
| `--cue-panel` | `#141920` | `#f7f9fb` | 工具栏/检查器 |
| `--cue-panel-2` | `#1a212a` | `#eef2f6` | 次级面板 |
| `--cue-node` | `#1c232d` | `#ffffff` | 节点卡 |
| `--cue-node-head` | `#242d39` | `#f3f6f9` | 节点标题栏 |
| `--cue-border` | `#2b3542` | `#cfd7e1` | 边框 |
| `--cue-text` | `#e7edf5` | `#141a22` | 主文本 |
| `--cue-muted` | `#93a1b4` | `#5d6b7c` | 次文本 |
| `--cue-faint` | `#647184` | `#8b97a7` | 弱文本/占位 |
| `--cue-amber` | `#e7b75f` | `#b5791f` | 主强调、cue light |
| `--cue-cyan` | `#6fb7c8` | `#2f7f91` | text 端口、链接 |
| `--cue-violet` | `#b79ce0` | `#7655a8` | agent/json |
| `--cue-green` | `#6fbf8f` | `#2f7d52` | success/shell |
| `--cue-red` | `#e07a72` | `#b23a34` | error |
| `--cue-orange` | `#e0a06f` | `#a55a26` | warning/condition |
| `--cue-blue` | `#6fa8dc` | `#2f6b9e` | file |

- 画布始终是“工作区”，深色为主；浅色主题下画布变成冷灰纸，不变成奶油色。
- 面板、节点尽量复用 DSH 的 `--dsw-alias-*` token；CueFlow 变量作为兜底。
- 端口颜色与类型一一对应；同一类型在节点、线、检查器中使用同一颜色。

### 2.2 字体

- UI：`"Segoe UI Variable Text", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`
- 节点元数据 / 端口 / 日志 / ID：`"Cascadia Code", "JetBrains Mono", "SFMono-Regular", Consolas, monospace`
- 标题：与 UI 同族，字重 600；不引入装饰性 display 字体。
- 字号：11 / 12 / 13 / 15 / 18；节点标题 13，端口 11，检查器正文 12.5，面板标题 15。
- 行高：正文 1.5；日志 1.65；节点端口 1.2。
- 不用全大写 label；需要强调用字重与颜色，不用 letter-spacing 伪装“高级感”。

### 2.3 形状与间距

- 圆角：节点 10px；输入/按钮 6px；面板 0（贴边）或 8px（浮层）。
- 边框：1px（半透明）；选中 2px amber；运行中 1px amber + 呼吸光。
- 阴影：只给浮层/右键菜单，`0 12px 32px rgba(0,0,0,.28)`；节点不用阴影，用边框和色脊区分。
- 间距基数 4px；面板 padding 12/16px。
- 节点宽 264px；标题栏高 36px；端口行高 22px；body padding 10px 12px。

## 3. 布局

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 顶部命令栏 (44px)                                                            │
│ CueFlow  [workflow ▾]  ● unsaved   [Validate] [Save] [Run ▾]   [fit] [zoom]  │
├──────────────┬───────────────────────────────────────────────┬───────────────┤
│ 节点库 (220) │ 画布                                           │ 检查器 (320)  │
│              │                                               │               │
│ 搜索…        │   ┌─────────┐        ┌─────────┐              │ [Node]        │
│ ▸ Input      │   │ Input   │───────▶│ Agent   │              │ 标题 / 类型   │
│ ▸ Agent      │   │ Task    │        │ Review  │              │ 配置字段      │
│ ▸ Skill      │   └─────────┘        └────┬────┘              │ 输出预览      │
│ ▸ Command    │                           │                   │               │
│ ▸ Shell      │                      ┌────▼────┐              │ [Run] [Log]   │
│ ▸ Control    │                      │ Output  │              │               │
│              │                      └─────────┘              │               │
├──────────────┴───────────────────────────────────────────────┴───────────────┤
│ 底部 dock (200px, 可折叠)：运行日志 / 节点输出 / 校验问题                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

- 顶部命令栏固定；左侧节点库可折叠为 48px 图标栏；右侧检查器可折叠。
- 底部 dock 默认折叠为 32px 状态条；运行时自动展开到 200px。
- 窗口 < 1100px 时隐藏节点库文字，检查器变为覆盖抽屉；< 800px 时检查器全屏覆盖。
- 面板顶部留 `--dsh-frame-top-clearance`（约 48px），避免被 DSH 窗口 chrome 遮挡；用 `padding-top: max(12px, var(--dsh-frame-top-clearance, 0px))`。

## 4. 画布交互

| 操作 | 行为 |
|---|---|
| 拖拽空白 | 平移（空格 + 拖拽也可） |
| 滚轮 | 以光标为中心缩放（0.25–2.0） |
| 中键拖拽 | 平移 |
| 双击空白 | 打开节点搜索面板，位置=双击点 |
| 右键空白 | 同一搜索面板（分类 + 搜索） |
| 右键节点 | 菜单：重命名、复制、禁用/启用、删除 |
| 拖拽节点标题 | 移动节点；`pointerup` 提交一次历史 |
| 拖拽输出端口 | 拉线；落到兼容输入端口即连接 |
| 拖拽输入端口 | 拉线到输出端口（反向连接） |
| 点击线 | 选中；`Delete` 删除 |
| 点击节点 | 选中；`Delete` 删除节点及其边 |
| Shift + 点击 | 多选（M5；MVP 为单选） |
| 拖拽框选 | 多选（M5） |
| `Ctrl/Cmd + Z` | 撤销 |
| `Ctrl/Cmd + Shift + Z` / `Ctrl+Y` | 重做 |
| `Ctrl/Cmd + S` | 保存 |
| `Ctrl/Cmd + Enter` | 运行 |
| `Escape` | 取消连线/关闭菜单/取消选中 |
| `Delete/Backspace` | 删除选中 |
| `?` | 打开快捷键帮助（M5） |

### 4.1 新建节点

- 节点库点击：在视口中心放置；同类型连续点击按 +24px 级联。
- 双击画布：搜索面板按分类分组；输入过滤 type/title/description；Enter 放置第一个结果；Esc 关闭。
- 从端口拖到空白：MVP 只显示“松开取消”；M5 增加“推荐节点”菜单。
- 新节点自动选中，检查器切到 Node。

### 4.2 连线

- 拖线时显示贝塞尔曲线；兼容端口高亮，不兼容端口降暗并显示 `not-allowed`。
- 只允许一个输入端口一条入边；已有入边时，新连接替换旧边（ComfyUI 行为），并在撤销栈中可回退。
- 拒绝自连、成环、类型不兼容；toast 说明原因。
- 删除节点时删除所有相关边；删除边不影响节点。

### 4.3 节点卡

```text
┌──────────────────────────────────────┐
│▌ ●  Agent                    ⋯  ×    │  ← 左侧色脊 + cue light + 菜单
│  Review current diff                 │  ← 标题（可双击重命名）
├──────────────────────────────────────┤
│ ○ prompt        required       text ○│  ← 输入左、输出右
│ ○ context                      json ○│
├──────────────────────────────────────┤
│ model: deepseek-flash                │  ← 配置摘要（mono）
│ ▸ last output preview…               │  ← 运行后显示
└──────────────────────────────────────┘
```

- 左侧 3px 色脊按分类着色，是节点最显眼的识别信号。
- cue light：8px 圆点；`idle` 灰、`queued` 蓝、`running` 琥珀呼吸、`success` 绿、`error` 红、`skipped` 深灰斜杠、`cancelled` 橙。
- 运行中：cue light 呼吸 + 节点边框 1px amber；不要整卡发光。
- 错误：cue light 红 + 卡片底部一条 2px 红色细线；错误文本在节点内截断，检查器看全文。
- 端口：左侧输入、右侧输出；端口点 10px，hover 放大到 12px；必填输入标签后加 `*`。
- 节点内预览：最近一次 `text` 输出前 3 行，等宽；无输出显示 `—`。

### 4.4 连线样式

- 三次贝塞尔，控制点水平偏移 = `max(40, |dx| * 0.5)`。
- 线宽 1.6px；hover 2.2px；选中 2.4px + 端点圆环。
- 颜色取源端口类型色；运行时从源到目标做 1.2s 的 dashed 流动（`stroke-dashoffset`），非运行态静止。
- 端口未连接时显示短“桩”，不画虚线。

### 4.5 画布网格

- 24px 小格 + 120px 大格；用两层 repeating-linear-gradient。
- 网格随视口平移/缩放（背景 `background-position` 与 `background-size` 同步），但缩放时保持线宽 1px（用 CSS 变量计算）。
- 画布右下角显示缩放百分比 + “Fit” 按钮；左下角显示节点/边数量与校验状态。

## 5. 检查器

三个 tab：

### Node

- 标题（可编辑）、类型 badge、分类色条。
- 配置字段按 `shared/node-types.js` 的 `fields` 顺序渲染：
  - `text` / `textarea` / `number` / `boolean` / `select` / `json`（等宽 textarea + “格式化”按钮）/ `skill` / `command` / `agent-session`。
- 字段下方显示 `hint`；错误字段红框 + 行内错误。
- 端口列表：名称、类型、是否连接、上游/下游数量。
- “运行此节点”按钮（M5；MVP 显示但禁用并提示“先整图运行”）。
- 删除节点按钮（危险色，二次确认可选）。

### Workflow

- 名称、描述、并发（1–8）、默认 cwd、默认 provider/model。
- 校验结果列表：点击定位到节点（画布居中 + 选中）。
- 导入/导出 JSON：导出下载；导入文件选择 + 覆盖确认。

### Run

- 状态、开始/结束时间、耗时、目标会话。
- 节点列表：状态、耗时、错误摘要；点击定位。
- 输出：按 Output 节点分组；text 用 `<pre>`，json 用格式化。
- 日志：倒序/正序切换，级别过滤（info/warn/error），自动滚动开关。
- 取消按钮（运行中）。

## 6. 运行输入对话框

```text
┌─ Run workflow ──────────────────────────────┐
│ Target session  [session-… (deepseek-flash)▾]│
│ Working dir     [F:\WorkSpace\…           ] │
│                                             │
│ Task *                                      │
│ ┌─────────────────────────────────────────┐ │
│ │ Implement the parser fix…               │ │
│ └─────────────────────────────────────────┘ │
│ Diff (optional)                             │
│ ┌─────────────────────────────────────────┐ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Cancel]                         [Run]      │
└─────────────────────────────────────────────┘
```

- 只列 Input 节点；按节点 y 坐标排序。
- 必填校验在客户端与 Host 各做一次。
- 没有 live agent 且图里含 Agent/Skill/Command → 顶部黄色提示 + Run 禁用，附“打开一个会话”说明。
- 运行开始后对话框关闭，底部 dock 展开，节点状态实时更新。

## 7. 空态与错误

- **无 workflow**：画布中央显示三张模板卡（不是营销大标题）：
  - “Review a diff” — Shell `git diff` → Agent 审查 → Output
  - “Implement a task” — Input → Agent 规划 → Agent 实现 → Output
  - “Blank canvas” — 直接开始
- **无 node**：画布中央一行提示 “Double-click anywhere to add a node.”，不放大插画。
- **Host 不可用**：顶部细条 `Host API unavailable`，画布只读；检查器显示重试按钮。
- **校验失败**：顶部 `3 issues` 按钮，点击打开底部 dock 的 Issues tab；节点红框标记。
- **运行失败**：节点红 + dock 自动展开 + 日志定位到该节点；错误文案包含“下一步怎么做”。

## 8. 可访问性

- 所有交互元素可键盘聚焦，`:focus-visible` 使用 2px amber 外环。
- 画布节点支持 Tab 遍历（按拓扑/位置排序），Enter 选中，Delete 删除。
- 颜色不是唯一信息：状态同时用文字/图标（cue light 的 title 与 aria-label）。
- 端口 hover/选中不仅靠颜色，还加粗 + 外环。
- 支持 `prefers-reduced-motion`：关闭呼吸与虚线流动。
- 对比度：正文 ≥ 4.5:1；端口标签 ≥ 3:1（小字尽量 4.5:1）。
- 对话框使用原生 `<dialog>` 或带 `role="dialog"` + focus trap；Esc 关闭。

## 9. 独立 UI 测试页

`ui/index.html` + Vite：

- 用 `createCueflowClient(name => React)` 拿到与生产相同的插件工厂；
- fake `ctx.slots` 捕获 `CueFlowPanel`，fake `ctx.locale` 提供字典；
- Mock Host 拦截 `fetch`，返回固定的 catalog/workflows/templates/run 事件；
- 页面顶部提供：
  - 主题切换（dark/light）
  - 视口宽度切换（1440/1100/800）
  - “模拟运行”按钮（按时间推进节点状态与事件）
  - “制造错误”按钮（让某个节点失败）
- 用 Edge/Chrome headless 截图对比，检查布局、节点、连线、检查器、明暗主题。

测试页不复制 UI 代码，只提供数据与容器；这是“UI 可独立验证”的关键。

## 10. 文案风格

- 动词开头、说结果：`Run workflow`、`Cancel run`、`Save changes`、`Fit canvas`。
- 错误给下一步：`Shell 节点缺少命令。填写 command，或连接一个输出文本的节点。`
- 空态给动作：`Double-click anywhere to add a node.`
- 不用感叹号、不用“Oops”、不道歉；不把系统内部名直接丢给用户（例如不要显示 `CAPABILITY_MISSING`，除非在详情里）。
- 中英双语：默认跟随 DSH 语言；节点类型名保留英文（与 ComfyUI 类似），说明与按钮本地化。
