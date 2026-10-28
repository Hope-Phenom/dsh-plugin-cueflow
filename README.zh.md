# CueFlow

**DeepSeek Harness（DSH）的 ComfyUI 式工作流编排插件。**

CueFlow 在 DSH 内打开一张全屏节点画布：把有类型端口的节点连成 DAG，运行后直接看到每个节点的状态与输出。节点调用 DSH 的原生能力：

- **Agent / Skill**：启动子代理；Skill 节点既支持模型可见的 Skill，也支持仅用户可见的 Skill。
- **Command**：对 live 会话执行 DSH 斜杠命令。
- **Shell / Read File**：通过 `ctx.shell` / `ctx.fs` 执行，继承 DSH 的策略。
- **Input / Template / Condition / Merge / Output / Note**：确定性的胶水节点。

## 状态

MVP 已实现。已在**临时** DSH profile（`cueflow-check`，端口 2618）完成真实联调：Host 路由/catalog、workflow 保存、确定性图、Shell、Read File、Agent 节点，以及从面板运行工作流。临时 profile 与测试数据已删除，未改动当前 `desktop` profile。

真实 **Skill** 与 **Command** 节点的执行只有单元/Mock 覆盖，未在 live 会话中运行（避免模型/命令副作用）。状态见 [`docs/README.md`](docs/README.md)，决策见 [`docs/decisions.md`](docs/decisions.md)，证据见 [`docs/10-implementation-plan.md`](docs/10-implementation-plan.md)。

## 本地安装

```powershell
pnpm install
pnpm build
# 先退出 DSH：运行中的 DSH 会锁住 profile 目录
dsh plugin --profile desktop add "F:\WorkSpace\dsh-plugin-cueflow"
```

启动 DSH，点击左侧栏的 CueFlow 图标。

## 不重启 DSH 的开发方式

```powershell
pnpm test       # Node 单元/集成测试：图、校验、执行器、适配器、API
pnpm build      # esbuild 打包浏览器 bundle
pnpm ui         # Vite + Mock Host，http://127.0.0.1:5199
pnpm ui:shot    # 无头截图（需要 Edge/Chrome）
```

独立 UI 测试页复用 `src/client` 的真实组件，只替换 Host 与 slot 容器。

## 文档

| 文档 | 内容 |
|---|---|
| [主文档](docs/README.md) | 总览与导航 |
| [ComfyUI 研究](docs/01-research-comfyui.md) | 节点图为什么有效 |
| [DSH 研究](docs/02-research-dsh.md) | 插件、Slots、Skill/Command/Subagent |
| [节点参考](docs/05-node-reference.md) | 端口、配置、语义 |
| [测试策略](docs/09-testing-strategy.md) | 四层测试 |
| [决策记录](docs/decisions.md) | 自主决策与待验证项 |

## 许可

MIT
