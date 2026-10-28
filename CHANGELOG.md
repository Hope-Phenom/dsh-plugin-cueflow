# Changelog

## 0.1.0 — 2026-10-28

首个可运行版本，覆盖 M1–M4 与 M6 P0/P1 的主要硬化项。

### Added

- DSH 全屏 CueFlow 面板：typed ports、DAG 连线、检查器、运行 dock。
- 节点：Input / Template / Agent / Skill / Command / Shell / Subflow / Fan-out / Read File / Reroute / Condition / Merge / Output / Note。
- Skill 支持 model-invocable 与 user-only；Command 走 `ctx.commands.execute`。
- Shell/Command 一次性审批门（`ask` / `allow` / `deny`）。
- 全局运行队列、wall-clock / Agent-call / Token 预算。
- retry / onError=skip / 从失败节点局部重跑。
- 长节点 heartbeat、active run 自动接回。
- Shell 与 Agent 真实取消；`abort-all` / `drain` 策略。
- Subflow 子工作流、Fan-out 并发/失败跳过、Reroute、多选/复制/对齐。
- Workflow 版本归档/恢复、localStorage 草稿恢复、旧 schema 迁移。
- 逻辑 workspace 过滤（`settings.workspace`）。
- Windows CI、ESLint 0 warning、Playwright E2E、200 节点/500 边 benchmark。

### Security

- API CSRF/Origin/JSON 防护。
- Shell/Command 默认 `ask`，无审批通道 fail-closed。
- 公开 Web 部署仍需 DSH 自身认证。

### Known limitations

- `workflow` / `parent` 会话模式未开放（缺 Host child-turn 结果 API）。
- 物理 workspace 隔离、审计身份、发布/多用户权限未做。
- TypeScript checkJs 暂缓。
