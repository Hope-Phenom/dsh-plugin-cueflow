# 11 · 运维与安全

## 1. 安装（本地开发）

前提：DSH 已安装，profile 名为 `desktop`（按实际环境替换）。

```powershell
# 先退出 DSH 桌面应用：它会锁住 profile 目录
cd F:\WorkSpace\dsh-plugin-cueflow
pnpm install
pnpm build
dsh plugin --profile desktop add "F:\WorkSpace\dsh-plugin-cueflow"
```

启动 DSH，左侧栏出现 CueFlow 图标。若没有：

1. 检查 `C:\Users\<you>\.dsh\profiles\desktop\package.json` 的 `dsh.profile.bundles` 是否包含 `dsh-plugin-cueflow`；
2. 检查 `cordis.patch.yml` 是否被应用：`dsh --profile desktop --dump-config`；
3. 查看 DSH Host 日志中是否有 `dsh-plugin-cueflow` 加载错误；
4. 确认 `lib/client.js` 存在且是构建产物，不是空文件。

### 1.1 已验证的临时 profile 安装（不干扰当前 DSH）

```powershell
dsh --profile cueflow-check --from-default-profile web --dump-config
dsh plugin --profile cueflow-check add "F:\WorkSpace\dsh-plugin-cueflow"
dsh --profile cueflow-check --no-open --port 2618 --host 127.0.0.1
```

2026-10-27 实测：`--dump-config` 出现 `# == dsh-plugin-cueflow` 行；端口 2618 启动后 `/api/dsh/dsh-plugin-cueflow/health` 返回 `ok:true`；面板可打开。测试结束后删除 `cueflow-check` profile 与 `storages/dsh-plugin-cueflow/` 测试数据，未改 `desktop` profile。

## 2. 构建

```powershell
pnpm install
pnpm build       # esbuild src/client/entry.js -> lib/client.js
pnpm test        # 单元/集成测试
```

- `lib/client.js` 已提交到仓库，安装本地目录时不需要在用户机器上构建。
- 修改 `src/client/**` 后必须重新 `pnpm build`；DSH 的 HMR 只监听构建产物。
- `react` 不打包进 bundle；DSH 的 module loader 提供 `require('react')`。

## 3. 数据位置

```text
$DSH_HOME/storages/dsh-plugin-cueflow/
├─ workflows/
│  ├─ wf_2f5c1a.json
│  └─ ...
└─ runs/
   ├─ run_9a3d.json
   └─ ...
```

- `$DSH_HOME` 默认 `%USERPROFILE%\.dsh`。
- 写文件使用 temp + rename 原子替换；损坏的 JSON 不会覆盖其他文件。
- `runs/` 默认保留最近 50 个；可在后续版本加配置。
- 删除 workflow 不删除历史 run；run 内含 `workflowSnapshot`，可独立查看。

## 4. 配置

MVP 没有独立设置页；可配置项都在工作流文档里：

| 配置 | 位置 | 说明 |
|---|---|---|
| `settings.concurrency` | workflow | 1–8，默认 2 |
| `settings.cwd` | workflow | 运行默认工作目录；空则用 DSH 进程 cwd |
| `settings.defaultProvider/model` | workflow | 节点未填时的默认路由（预留） |
| 节点超时 | 节点 config | 缺省值见节点参考 |
| 输出截断 | Host 常量 | 单节点 20000 字符，事件 2000 条 |
| 全局运行上限 | `CUEFLOW_MAX_ACTIVE_RUNS` | 默认 2；超出的 run 排队 |
| 单 run 墙钟预算 | `CUEFLOW_MAX_RUN_MS` | 默认 30 分钟；超时 `RUN_BUDGET_EXCEEDED` |
| 单 run Agent 调用上限 | `CUEFLOW_MAX_AGENT_CALLS` | 默认 50 |
| 单 run Token 上限 | `CUEFLOW_MAX_TOKENS` | 默认 0（不限制）；仅在 adapter 返回 usage 时统计 |

环境变量在 DSH 启动前设置。后续如果需要全局设置，会增加 `settings.section`；MVP 先用环境变量。

## 5. 安全边界

| 能力 | 边界 |
|---|---|
| Skill | 只加载 `ctx.skills` 中已发现的 Skill；不读任意 Markdown 路径 |
| Command | 只执行 `ctx.commands` 中已注册的命令；不拼接 shell |
| Agent | 通过 `ctx.subagents` 启动受管子代理；不直接创建/伪造 Agent |
| Shell | 通过 `ctx.shell`；继承 DSH 的 subprocess / sandbox 配置；不提供 env 覆盖 |
| File Read | 通过 `ctx.fs`；继承 DSH 文件策略；MVP 不写文件 |
| HTTP | 只注册 DSH Web 服务器上的同源路由；不额外监听端口 |
| 任意代码 | 不支持；无 eval / Function / 动态 import |
| 路径 | workflow/run 文件名由 Host 生成并白名单校验；拒绝 `..`、`/`、`\` |

**用户需要理解的风险**：Shell 节点会执行命令；如果命令来自模型输出（例如上游 Agent → Template → Shell），模型可以影响命令内容。UI 在 Shell 节点上显示风险提示，运行日志记录完整命令。不要把不可信输入直接接到 Shell。

## 6. 权限与审批

- Shell/Command 节点有 CueFlow 自己的 one-shot 审批：默认 `ask`，`allow` 才直接执行，`deny` 直接失败。`ask` 在 UI 显示命令/动作，批准只对本次执行有效。
- 这不是 DSH `ctx.approval` 的复用：workflow run 不在 DSH turn 内，`ctx.approval.request()` 要求 open turn。CueFlow 的审批队列是 Host 独立实现，审批记录写入 run JSON。
- `ctx.shell` / `ctx.fs` 仍受当前 composition 的 sandbox 策略约束；如果 profile 使用 `danger-full-access`，Shell 节点也会拥有该权限——这是 DSH 的配置，不是 CueFlow 的提升。
- Agent 节点启动的子代理继承父会话的权限与工具策略；`delivery: 'caller'` 只影响通知，不提升权限。
- 所有写请求要求 `X-CueFlow-Request: 1` + `application/json`，并拒绝跨站 `Origin`/`Sec-Fetch-Site`；这是 CSRF 防护（M6-P0-2），不是身份认证。
- 公开 Web 部署仍需 DSH 的登录/连接认证；不要把 CueFlow 路由绕过 DSH 直接暴露到不可信网络。

## 7. 故障排查

| 现象 | 可能原因 | 处理 |
|---|---|---|
| 左侧栏没有 CueFlow | patch 未应用 / client bundle 缺失 | 检查 dump-config 与 `lib/client.js` |
| 面板空白 | client bundle 运行时报错 | 打开浏览器 DevTools 看 console；检查 `require('react')` |
| `Host API unavailable` | `webServer` 未组合 / 路由未注册 | 检查 Host 日志；确认 DSH Web 模式 |
| catalog 为空 | 没有 live Agent / 服务未组合 | 打开一个会话；检查 DSH 插件组合 |
| Skill 节点报找不到 | Skill 名拼错 / cwd 不对 | 在 catalog 下拉里选；检查项目 `.dsh/skills` |
| Command 节点报没有 Agent | 没有 live 会话 | 先打开一个会话 |
| Shell 节点失败 | 命令不存在 / 非零退出 / sandbox | 看 stderr 与退出码；在终端先验证命令 |
| 运行卡住 | 子代理/命令未返回 | 检查超时；点 Cancel；看 Host 日志 |
| 保存 422 | 图校验失败 | 打开 Issues tab，按节点定位 |
| 刷新后 workflow 没了 | 未点 Save / 写文件失败 | 看 dirty 标记与 Host 日志 |
| HMR 不生效 | 只改了源码没 build / 新包需重启 | `pnpm build`；必要时重启 DSH |

## 8. 日志

- Host 日志前缀：`[dsh-plugin-cueflow]`。
- 运行日志在 UI 的 Run/Log tab；同时写入 run 记录。
- 不在日志中打印 Skill 正文、文件内容、命令的完整环境变量；只打印名称、长度、截断预览。
- 错误对象记录 `message` 与 `code`，不记录凭据。

## 9. 升级

1. 退出 DSH；
2. `git pull` / 替换目录；
3. `pnpm install && pnpm build && pnpm test`；
4. 重新 `dsh plugin --profile desktop add <path>`（同包替换通常需要重启）；
5. 启动后跑一次 L4 smoke。

## 10. 已知限制（MVP）

- 只有 live Agent 才能运行 Agent/Skill/Command 节点；不能从面板新建会话。
- 没有局部重跑、循环、子图、Bypass、分组、Reroute。
- 运行状态用轮询，最短 600ms；不是 token 级流式。
- 不把运行结果写入会话日志。
- 不提供全局设置页；配置在工作流里。
- 没有第三方节点注册。
- 画布多选/框选未实现（单选 + 快捷键）。
- 真实 DSH 的自动化 E2E 缺失；L4 用临时 profile 手工/脚本 smoke。
- 真实 Skill / Command 已在从机主 `desktop` profile 验证；真实取消中的子代理、极窄窗口拖拽 E2E 仍未跑。
- Agent catalog 的 `title` 可能为空（会话标题服务未接）；ID 仍然可用。
- Shell 依赖 `ctx.sandboxPolicy`：无 live session 时用 workflow cwd 作为 workspace root；若 workspace root 与 `%TEMP%` 重叠，Windows ACL 会拒绝，需换项目目录或使用 danger-full-access。
