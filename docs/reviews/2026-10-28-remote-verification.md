# 从机实机验证 · 2026-10-28

> 目标机：`<test-host>`（`<test-hostname>`，Windows 10.0.26300，DSH `0.2.1-rc.3`）
> 目标：把 CueFlow 放到真实 Windows DSH 上，覆盖安装、面板、执行与 DSH 能力调用。

## 1. 结果总览

| 项目 | 结果 |
|---|---|
| 从机访问 | SSH 使用 `<remote-user>@<test-host>` + `<ssh-key-path>`；GUI 操作走 remote-use |
| 临时 profile | `cueflow-check`（web 模板，端口 2619）：health/catalog、确定性图、Read File、Shell、Skill、Command |
| 主 profile | `desktop`：`dsh plugin add` 安装成功；面板打开；3 节点 / 2 连线；UI 运行输出 `hello!` |
| 真实 Skill | `code-review`（user-only）→ `OK`，childId 创建/释放 |
| 真实 Command | `/remote-use status` → 返回 “remote-use is off for this session…” |
| 真实 Shell | `echo cueflow-remote-shell` → stdout，exitCode 0 |
| 截图 | `remote-cueflow-panel-window.png`、`remote-cueflow-run-window.png` |

## 2. 实机发现与修复

### P1 · 临时 profile 的 Shell 被 Windows ACL 拒绝

- **现象**：`SANDBOX_UNAVAILABLE`，`Windows ACL temp root must be outside the workspace: workspace=C:\Users\<user>; temp=C:\Users\<user>\AppData\Local\Temp`。
- **原因 1**：CueFlow 没有给 `ctx.shell.resolve` 传 `sandboxPolicy`，执行器用了默认 workspace root（DSH 进程 home）。
- **原因 2**：临时 profile 从 `web` 模板创建，没有 desktop profile 的 `runnerCommand` 沙箱 shim。
- **修复**：
  - `adapters.js` 增加 `resolveShellSandboxPolicy`：live session 用 `ctx.sandboxPolicy.resolve({session})`；无 session 时保留部署 mode，用 workflow cwd 作 workspace root。
  - `index.js` 注入 `sandboxPolicy`。
  - 临时 profile 补 `runnerCommand` shim（测试环境配置，不写进插件）。
- **验证**：从机临时/主 profile 的 `echo` 均成功。

### P2 · UTF-8 BOM 导致 `BAD_JSON`

- **现象**：从机 PowerShell 5.1 `Set-Content -Encoding UTF8` 写出的 JSON 带 BOM，API 返回 400 `BAD_JSON`。
- **修复**：`readJsonBody` 在 `JSON.parse` 前去除 `^\uFEFF`；新增 API 测试。
- **验证**：从机 curl/API 的 BOM body 通过。

### P3 · 从机临时 DSH 无法由一次性 SSH 命令常驻

- **现象**：`Start-Process` 启动的 DSH 在 SSH 会话结束后退出。
- **处理**：用**保持打开的 SSH 前台进程**（本地后台 job）承载 DSH；测试完 taskkill 该 PID。
- **注意**：以后从机长驻服务建议用任务计划/服务，或明确保持 SSH 会话。

### P4 · 主 DSH 的 CueFlow Host 路由在 loopback 端口 60167

- **观察**：desktop Electron 的 CueFlow route 不在 2619，而在 `127.0.0.1:60167`；`http://<test-host>:7331` 不是该 route。
- **影响**：从机 API smoke 必须用 `127.0.0.1:60167`；不能从局域网直接访问。
- **结论**：与 DSH desktop 的 IPC/HTTP 布局一致，不是插件 bug。

### P5 · 主 DSH 需要用户手动关闭/启动

- **流程**：用户关闭 DSH → SSH `dsh plugin --profile desktop add` 成功 → 用户启动 → 面板与 Host 均正常。
- **结论**：桌面 profile 由 Electron 独占，必须用户配合；已按此执行，未自动重启。

## 3. 主 profile 实测命令/结果

```text
GET  http://127.0.0.1:60167/api/dsh/dsh-plugin-cueflow/health      -> ok:true
POST /runs (deterministic Input->Template->Output)                -> completed, hello!
POST /runs (shell echo cueflow-remote-shell)                      -> completed, stdout
POST /runs (command remote-use status, input "status")            -> completed, status text
POST /runs (skill code-review, user-only)                         -> completed, OK
UI: CueFlow -> Remote UI deterministic -> 运行                     -> completed, hello!
```

## 4. 清理

- 删除从机临时 profile `cueflow-check` 与测试文件；停止临时 DSH 进程。
- 主 `desktop` profile 保留插件安装，用户可继续使用。
- 本地 `.screenshots/` 保留从机窗口截图作为证据；`.screenshots/` 不进入 git。

## 5. 仍未覆盖

- 真实取消中的子代理（单测覆盖 abort/dispose）。
- 极窄窗口下的拖拽 E2E。
- 真实受限 sandbox 的“主动拒绝”路径（本次是 policy 修复后成功执行）。
