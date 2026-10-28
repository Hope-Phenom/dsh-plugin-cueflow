# 17 · 兼容性与发布

## 1. 版本矩阵

| 组件 | 支持范围 | 验证版本 |
|---|---|---|
| DSH | `>=0.2.0 <0.3.0` | `0.2.1-rc.3` |
| Node.js | `>=20` | 24.x（本机/从机 CLI） |
| OS | Windows 10/11 优先；macOS/Linux 未做真实 DSH 验证 | Windows 10.0.26300 |
| 浏览器 E2E | Edge（Playwright `channel: msedge`） | Edge on Windows |
| 包格式 | DSH plugin bundle（`cordis.patch.yml` + `lib/index.js` + `lib/client.js`） | local checkout |

## 2. 发布状态

- 当前 `private: true`，未发布 npm；
- `pnpm verify:pack` 已验证包含 `lib/shared/assets/locale/cordis.patch.yml/README/LICENSE/CHANGELOG`，且没有打包 `test/src/docs`；
- 发布前需要：
  1. 补 `repository/homepage/bugs`；
  2. 决定是否把 `private` 改为 false；
  3. 版本号与 CHANGELOG 同步；
  4. 在干净 Windows/DSH 环境安装验证；
  5. 记录 DSH/Node 兼容矩阵。

## 3. 升级/回滚

- 新 workflow 存在 `workflows/`（无 workspace）或 `workspaces/<hash>/workflows/`；旧 workflow 保持全局并仍可见；
- 升级前：workflow 每次保存会自动归档旧版（最近 20 版）；
- 旧 schema（缺失/0）在 Host 启动时规范化为 v1；
- 回滚：通过工作流面板“版本历史 → 恢复”，或把 `.history/<id>/<version>.json` 复制回 `workflows/<id>.json`；
- 运行记录保留 50 条；workflow 快照在 run JSON 内。

## 4. 平台注意事项

- Windows sandbox `workspace-write` 要求 `%TEMP%` 在 workspace 外；CueFlow 按 session/workflow cwd 解析 `sandboxPolicy`。
- 桌面 DSH 的 loopback 端口每次重启可能变化，测试时按进程查端口，不能写死。
- `file://`/Electron 的 Origin 可能是 `file://` 或 `null`；CSRF 依赖 `X-CueFlow-Request` 自定义头，公开 Web 部署仍需 DSH 认证。
- 从机真实测试记录见 `docs/reviews/`。

## 5. 性能基线

`pnpm bench`：200 节点 / 500 边（merge DAG）在开发机上的基线：

```text
nodes: 200
edges: 500
valid: true
issues: 0
parseMs: ~1.2
validateMs: ~157
indexMs: ~0.15
```

阈值：脚本在 validate 失败或总耗时 > 2000ms 时退出非零。该基线用于发现数量级回退，不作为绝对 SLA。

并发 run 基线：

```text
pnpm bench:runs
10 runs, maxActiveRuns=2
peakActive=2, peakQueue=8
~370ms (25ms fake node each)
all completed
```
