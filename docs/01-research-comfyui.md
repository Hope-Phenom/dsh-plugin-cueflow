# 01 · ComfyUI 研究：节点图为什么有效

> 调研日期：2026-10-27。资料来自 ComfyUI 官方文档（Basic Concepts / Developer）与其公开仓库。本文只提炼对 CueFlow 有决策价值的部分。

## 1. ComfyUI 的核心对象

| 对象 | 定义 | 对 CueFlow 的映射 |
|---|---|---|
| **Workflow** | 一张保存为 JSON 的节点图，描述“做什么”而不包含权重本身 | CueFlow 的 `WorkflowDocument` |
| **Node** | 一个独立功能单元，接收输入、产出输出；有标题、类型、参数区域、状态 | `NodeInstance`（type + config + position） |
| **Link** | 从一个输出端口到一个输入端口的连接，携带数据 | `Edge`（from node/port → to node/port） |
| **Property / Widget** | 节点参数；可手动填写，也可被上游连线驱动 | `config` 字段 + 端口输入；连线优先于 config 默认值 |
| **Data type** | 端口类型，决定哪些线可以连、线的颜色 | `text / json / number / boolean / any` |
| **Prompt / Queue** | 前端把图序列化成后端可执行的 prompt，提交队列；后端按依赖执行 | CueFlow Host 的 `RunManager` + DAG 调度 |

ComfyUI 官方文档明确把 workflow 比作 recipe：节点是步骤，属性是参数，连线是数据流。节点是“函数算子”（function operator）：接收数据、做一件事、产出数据。

## 2. 执行模型（我们借用的部分）

ComfyUI 的图是**有向无环图**。前端负责编辑与序列化，后端按依赖关系执行；一个节点的输出可以被多个下游消费，但一个输入端口只能接一条线（需要多路时用显式的合并/路由节点）。节点状态（normal / running / error / missing）直接画在节点上，错误定位是“图上定位”而不是“日志里猜”。

CueFlow 采用同样的基本约束：

- 单输入端口最多一条入边；输出可扇出。
- 运行时按依赖就绪调度，而不是按数组顺序盲目执行。
- 节点的运行状态、输入缺失、错误信息都回写到节点视图。
- 图在运行前做静态校验（类型、环、缺失端口、未知节点）。

**不照搬**的部分：

- ComfyUI 的后端是 Python 进程 + 模型加载器 + 队列；CueFlow 的后端是 DSH 的 Agent/Skill/Command/Shell/FS 能力，运行在 Host 进程内。
- ComfyUI 的“模型 / latent / conditioning”是重数据类型；CueFlow 的通用数据是 text/json，再加 number/boolean/any。
- ComfyUI 有大量“加载模型/保存图像”这类重资产节点；CueFlow 的对应物是 Input/Output、Skill/Command、Shell/File。
- ComfyUI 的节点包生态极大；CueFlow MVP 只内置一层受控节点，第三方节点包是后续路线，不在 MVP。

## 3. 交互设计中真正有价值的部分

1. **双击画布搜索并放置节点**：比“先点工具栏再点画布”快得多；这是 ComfyUI 最值得保留的手感。
2. **从端口拖线，松手在空白处弹出候选节点**：把“我要一个能接这个类型的东西”变成一次动作。CueFlow MVP 先做“拖到空白处取消 + 右键菜单搜索”，候选节点作为后续增强。
3. **端口颜色即类型**：用户不需要读文档就知道能不能连；错误在拖线时就阻止，而不是运行后报错。
4. **节点内联预览**：输出文本/状态直接显示在节点上，减少“点开日志”的来回。
5. **Reroute / 分组 / 子图**：复杂图的可读性工具；MVP 先不做，但数据结构预留 `note` 节点与未来 group 的位置。
6. **保存/分享 JSON**：工作流是独立于运行结果的文件；CueFlow 也把 workflow 存成可读 JSON，便于 diff 与分享。
7. **节点模式（Always / Never / Bypass）**：调试时临时禁用一段图；CueFlow MVP 提供 `disabled`（等价 Never）与条件分支，Bypass 留到后续。
8. **运行前检查缺失节点/类型**：CueFlow 在工具栏上直接显示校验结果数量，点击定位到节点。

## 4. 对 AI 视频工作的意义（以及为什么这套隐喻能迁移到编码）

ComfyUI 对 AI 视频的价值不只是“可视化”，而是把视频生成中**长链路、多模型、强依赖**的工程问题变成了可管理的图：

- **可复现**：视频生成通常包含文本编码、首帧/关键帧、采样、插帧、超分、编码封装等多段；把每段固定成节点与参数，才能复现一条片子。
- **可替换**：换 checkpoint、换 sampler、换 ControlNet、换插帧模型，只改一个节点，不用重写整条脚本。
- **可调试**：视频链路贵且慢；节点级状态让“哪一段爆了/哪一段输出不对”立刻可见，而不是从一整段 Python 里找。
- **可复用/可分享**：工作流 JSON 可以在社区传播，形成“流程资产”；模型权重仍然独立。
- **可批量/可排队**：同一张图换输入批量跑，是生产级视频工作流的基本要求。
- **可控性**：ControlNet、mask、关键帧、prompt 组合等控制信号可以显式接线，而不是藏在某个函数的参数里。

这些价值与“编码工作流”高度同构：

| 视频工作流 | 编码工作流 |
|---|---|
| 文本编码 / 参考图 | 任务描述、issue、diff、仓库上下文 |
| ControlNet / 关键帧 | 约束、测试、lint、代码规范 |
| 采样 / 多模型 | 规划 Agent、实现 Agent、审查 Agent |
| 插帧 / 超分 | 格式化、测试、构建、静态检查 |
| 保存视频 | 写文件、提交、生成报告 |
| 批量换 seed | 批量换输入/分支 |

所以 CueFlow 的节点不是“把 Agent 包一层”，而是把**编码过程中本来就存在的多阶段依赖**显式化：先取 diff，再让审查 Skill 跑，再按条件决定是否让实现 Agent 修，再跑测试，最后汇总。每一步都可单独重跑、替换、审查。

## 5. 我们从 ComfyUI 明确吸收/拒绝的清单

| 吸收 | 拒绝/延后 | 原因 |
|---|---|---|
| DAG + 类型化端口 + 单入边 |  | 保证图可静态检查、可预测 |
| 双击搜索、拖拽放置、端口拖线 |  | 直接决定编辑效率 |
| 节点内联状态与预览 |  | 调试闭环最短 |
| 工作流 JSON 独立保存 |  | diff / 分享 / 版本化 |
| 节点颜色按类别、端口颜色按类型 |  | 降低学习成本 |
| 运行前静态校验 |  | 比运行后报错便宜 |
|  | 任意 Python/JS 代码节点 | 安全边界；MVP 只暴露白名单能力 |
|  | 子图 / 循环 / 动态节点包 | 复杂度高；先验证核心编辑-运行闭环 |
|  | Bypass 模式 | 语义容易误解；MVP 用 disabled + condition 覆盖 |
|  | 后端模型加载/队列管理 | 由 DSH 的 Agent/Skill/Command 体系承担 |

## 6. 对 CueFlow 的具体设计约束

由此文档直接推导出的约束（已在其他文档落地）：

1. 每个节点必须有稳定的 `type`、静态端口表、可序列化 `config`。
2. 端口类型检查必须在**连线时**和**运行前**各做一次。
3. 图必须是 DAG；成环在保存/运行前拒绝。
4. 节点状态是运行态的一等公民，不能只写日志。
5. 工作流文件必须人类可读、可 diff；不要把 UI 状态（选中、缩放）混进 workflow 文档。
6. 运行记录与工作流分离：同一个 workflow 可以有多次 run。
7. 节点执行要可取消、可超时；长任务不能卡死整个面板。

## 7. 参考资料

- Workflow: <https://docs.comfy.org/basic-concepts/workflow>
- Nodes: <https://docs.comfy.org/basic-concepts/nodes>
- Links: <https://docs.comfy.org/basic-concepts/links>
- Properties: <https://docs.comfy.org/basic-concepts/properties>
- Custom Nodes: <https://docs.comfy.org/basic-concepts/custom-nodes>
- ComfyUI 源码: <https://github.com/Comfy-Org/ComfyUI>
