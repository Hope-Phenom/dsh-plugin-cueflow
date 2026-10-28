# 20 · CueFlow 用户手册

> 面向第一次打开 CueFlow 的人：先认识界面，再用 5 分钟搭出第一条流程，最后知道运行、审批、保存和排错在哪里。
>
> 节点完整参数见 [05 · 节点参考](05-node-reference.md)；安装/发布见 [19 · npm 发布结构](19-npm-release.md)。

![CueFlow 总览，数字对应下面的界面地图](assets/manual/01-overview.png)

## 1. 它是什么

CueFlow 是 DSH 里的“可视化工作流画布”。

你可以把它想成一条流水线：

```text
输入 → 处理节点 → 处理节点 → 输出
```

每个节点只做一件事，节点之间用线连接。点击“运行”后，CueFlow 按连线顺序执行，最后在底部输出结果。

常见用途：

- 把一段文字交给 Agent 总结/审查；
- 运行一个 DSH Skill；
- 执行 Shell 命令并把输出交给 Agent；
- 把一个工作流复用到另一个工作流（Subflow）；
- 对数组逐项执行（Fan-out）。

## 2. 安装与打开

### 从 DSH 插件管理安装

在 DSH 的插件管理中搜索并安装：

```text
@hope_phenom/dsh-plugin-cueflow
```

安装后重启 DSH。左侧栏出现 **CueFlow** 图标，点击即可打开。

> 如果安装后 DSH 启动失败，先确认版本是 **0.1.1 或更高**。0.1.0 的浏览器 factory id 没有改成 scoped 包名，会报 `duplicate factory registration`。详见 [安装失败记录](reviews/2026-10-28-plugin-manager-duplicate-client.md)。

### 从本地目录安装（开发用）

```powershell
cd F:\WorkSpace\dsh-plugin-cueflow
pnpm install
pnpm build
dsh plugin --profile desktop add "F:\WorkSpace\dsh-plugin-cueflow"
```

### 打开后的检查

- 顶部能看到 workflow 选择器；
- 左侧有节点库；
- 右侧有“节点 / 工作流 / 运行 / 问题”四个 tab；
- 如果显示 `Host API unavailable`，说明 Host 路由没有加载，先重启 DSH，不要继续搭图。

## 3. 界面地图

对照总览图上的数字：

| 数字 | 区域 | 用途 |
|---|---|---|
| 1 | 顶部命令栏 | 选择/新建 workflow、撤销/重做、校验、保存、运行/取消 |
| 2 | 左侧节点库 | 搜索节点；点击或拖拽到画布 |
| 3 | 中间画布 | 放节点、拖线；拖空白平移，滚轮缩放，双击空白搜索节点 |
| 4 | 右侧检查器 | 选中节点后改配置；也放 workflow 设置、运行历史、问题 |
| 5 | 底部 dock | 最近运行、事件日志、输出；可折叠 |

### 两个最常用的动作

- **添加节点**：左侧节点库点击，或双击画布空白处搜索；
- **连接节点**：从节点右侧的**输出端口**按住，拖到另一个节点左侧的**输入端口**。

## 4. 五分钟 Hello World

目标：`Input → Template → Output`，运行后得到 `hello!`。

### 第 1 步：新建空白工作流

点击顶部 **新建工作流**，选择 **Blank workflow**。

![模板选择](assets/manual/02-templates.png)

选择后画布是空的：

![空白画布](assets/manual/03-blank.png)

### 第 2 步：添加 Input

在画布空白处**双击**，弹出节点搜索：

![双击画布搜索节点](assets/manual/04-add-node.png)

输入 `Input`，点击第一个结果。节点会出现在双击的位置。

> 也可以从左侧节点库直接点击或拖入 Input。

### 第 3 步：添加 Template 和 Output

同样双击空白处：

1. 搜索 `Template` 并添加；
2. 搜索 `Output` 并添加。

把三个节点大致摆成：

```text
Input  →  Template  →  Output
```

### 第 4 步：连线

1. 从 Input 右侧的 `value` 端口拖到 Template 左侧的 `value`；
2. 从 Template 右侧的 `text` 拖到 Output 左侧的 `value`。

端口有类型：如果线拖不上去，通常是类型不兼容，或者这个输入已经有连线。

### 第 5 步：配置

点击 Input，在右侧检查器设置：

- **Default value**：`hello`

点击 Template，设置：

- **Template**：`{{input}}!`

点击 Output，确认：

- **Name**：例如 `结果`
- **Format**：`text`

选中节点后，检查器会显示该节点的字段、端口连接状态和最近一次运行状态。

### 第 6 步：保存

点击顶部 **保存**。顶部 workflow 名称旁会从“未保存”变成“已保存”。

### 第 7 步：运行

点击顶部 **运行**，弹出运行对话框：

![运行对话框](assets/manual/05-run-dialog.png)

- **会话**：Agent/Skill/Command 需要一个 live DSH 会话；
- **工作目录**：Shell、Read File 等节点默认在这里执行；
- **Task/输入**：Input 节点的值；空白且 required 时会阻止运行。

点击 **开始运行**。

### 第 8 步：看输出

运行完成后，底部 dock 的 **输出** tab 应显示：

```text
hello!
```

![运行完成与输出](assets/manual/07-run-output.png)

右上检查器的 **运行** tab 还能看到：

- 整次运行状态；
- 每个节点的状态和耗时；
- 输出；
- 事件日志。

## 5. 端口、类型和连线规则

- 节点左侧是输入，右侧是输出；
- 线只能从输出拖到输入，不能反向；
- 端口颜色代表类型，例如 text / json / number / boolean / any；
- 一个输入通常只能接一条线；需要合并时用 **Merge**；
- 必填输入没连线或没值时，运行前/校验时会阻止；
- 删除线：点击线选中，按 `Delete`；
- 删除节点：选中后按 `Delete`，关联线会一起删除。

## 6. 常用节点

| 节点 | 什么时候用 | 关键配置 |
|---|---|---|
| Input | 把一次运行的参数暴露出来 | Label、Value type、Default value、Required |
| Template | 拼接文本、引用上游输出 | `{{input}}`、`{{nodeId.portId}}` |
| Agent | 让子 Agent 执行一段任务 | Prompt、Instructions、Provider/Model、超时、重试 |
| Skill | 运行 DSH Skill | Skill 名称、Instructions |
| Command | 运行 DSH slash command | Command、Approval |
| Shell | 执行命令 | Command、Working directory、Approval |
| Read File | 读取文本文件 | Path、Max characters |
| Condition | 按条件分到 true/false | Operator、Compare |
| Merge | 把多个分支合成一个值 | Mode、Separator |
| Subflow | 复用另一个已保存 workflow | Workflow ID、输入/输出映射 |
| Fan-out | 对数组逐项运行子 workflow | items、maxItems、concurrency |
| Output | 收集最终结果 | Name、Format、Preview lines |
| Note | 画布注释，不执行 | Text、Color |
| Group | 视觉分组框，不执行 | Label、Width、Height |
| Reroute | 整理连线，原样传递 | 无配置 |

完整字段与端口定义见 [05 · 节点参考](05-node-reference.md)。

## 7. 运行状态与审批

### 状态

| 状态 | 含义 |
|---|---|
| idle | 还没运行，或已清空结果 |
| queued | 在全局队列里等待 |
| running | 正在执行 |
| waiting-approval | Shell/Command 需要你批准 |
| completed | 成功完成 |
| error | 有节点失败 |
| cancelled | 被取消 |
| skipped | 节点被跳过（onError=skip 或 disabled） |

### 审批

Shell、Command 节点默认 `approval=ask`。运行到该节点时会暂停并弹出：

![Shell 审批](assets/manual/06-approval.png)

- **批准一次**：只允许这一次执行；
- **拒绝**：该节点失败，按 onError 决定整条 run 是否停止；
- **取消运行**：中止整次 run。

审批详情里会显示节点、动作、命令、工作目录。**不要在不理解的命令上点批准。**

## 8. 保存、版本、工作区

- **保存**：顶部“保存”或 `Ctrl/Cmd+S`；
- **未保存标记**：workflow 名称后的黄点/“未保存”；
- **版本历史**：检查器 → **工作流** tab → **版本历史** → 列出/恢复；
- **运行历史**：检查器 → **运行** tab，或底部“最近运行”；
- **草稿恢复**：编辑后刷新/重开面板，若没有 active run，会恢复未保存草稿；
- **工作区**：workflow 保存时记录当前 cwd；列表按 workspace 过滤，避免多项目串稿。

> 版本保存在 `.history/<workflow id>/`，最多保留最近 20 版。

## 9. 快捷键

| 操作 | 快捷键 |
|---|---|
| 保存 | `Ctrl/Cmd + S` |
| 运行 | `Ctrl/Cmd + Enter` |
| 撤销 / 重做 | `Ctrl/Cmd + Z` / `Ctrl/Cmd + Shift + Z`（或 `Ctrl+Y`） |
| 复制 / 粘贴选中节点 | `Ctrl/Cmd + C` / `Ctrl/Cmd + V` |
| 删除选中节点/线 | `Delete` / `Backspace` |
| 关闭弹窗/菜单 | `Escape` |
| 缩放 / 适配 | 画布右下角 `- / % / + / Fit` |

## 10. 多选、分组和对齐

- **多选**：Shift/Ctrl + 点击节点；
- **框选**：Shift + 拖拽画布空白；
- **复制多个**：选中后 `Ctrl/Cmd+C`，再 `Ctrl/Cmd+V`；
- **对齐**：多选后画布顶部出现对齐工具条；
- **分组**：多选后点“分组”，会生成 Group 框；拖动 Group 会同步移动成员；
- **Reroute**：用直通节点整理长连线。

## 11. 常见问题

### 面板显示 Host API unavailable

Host 插件没加载。检查：

1. 插件是否安装到了当前 profile；
2. DSH 是否重启过；
3. 是否有旧版本同时安装；
4. 看 DSH 的 `crash-*-web-boot.log`。

### 运行提示需要 live session

Agent / Skill / Command 需要先打开一个 DSH 会话。打开会话后再点运行。

### 审批窗口没出现

- 确认节点 `approval=ask`；
- 检查 run 是否停在 `waiting-approval`；
- 审批是 one-shot，拒绝或超时后不会自动出现第二次。

### 插件安装后 DSH 启动失败

典型日志：

```text
duplicate factory registration for "dsh-plugin-cueflow"
```

使用 **0.1.1 或更高版本**；0.1.1 已把浏览器 factory id 改成 scoped 包名。卸载旧包后重装并重启。

### 运行失败但不知道哪个节点

打开底部 dock 的 **日志**，或检查器 **运行** tab 的节点状态；错误会带 nodeId/节点标题。

## 12. 安全边界

- Shell/Command 默认需要审批；
- `approval=allow` 会跳过审批，只应在可信工作流使用；
- CueFlow 的 API 是 CSRF 防护，不是用户认证；不要把 DSH Web 直接暴露到公网；
- 多用户/团队使用需要 DSH 自身的认证与权限。
