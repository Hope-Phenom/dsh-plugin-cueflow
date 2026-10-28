# 19 · npm 发布结构

## 1. 包身份

```text
name:    @hope_phenom/dsh-plugin-cueflow
version: 0.1.0
type:    module
main:    lib/index.js
```

`package.json` 已设置为可发布：

```json
"private": false
```

未实际执行 `npm publish`；发布仍需要 npm 账号与目标 registry。

## 2. 实际发布的 25 个文件

`npm pack --dry-run` 当前结果：

```text
CHANGELOG.md
LICENSE
README.md
README.zh.md
assets/icon.svg
cordis.patch.yml
lib/client.js
lib/client.js.map
lib/core/adapters.js
lib/core/api.js
lib/core/catalog.js
lib/core/executor.js
lib/core/runs.js
lib/core/store.js
lib/core/templates.js
lib/index.js
locale/en.json
locale/zh.json
package.json
shared/constants.js
shared/graph.js
shared/node-types.js
shared/template.js
shared/validation.js
shared/values.js
```

压缩后约 **171 KB**，解压约 **768 KB**。

## 3. 目录职责

```text
@hope_phenom/dsh-plugin-cueflow/   # npm 包名
├─ package.json          # dsh.bundle / dsh.client / exports / engines
├─ cordis.patch.yml      # DSH Host 插件行，id = dsh-plugin-cueflow
├─ lib/
│  ├─ index.js           # Host 插件入口：API、services、runs
│  ├─ client.js          # 浏览器 bundle（esbuild 产物）
│  ├─ client.js.map
│  └─ core/
│     ├─ api.js          # HTTP 路由、CSRF、run/approval/version
│     ├─ adapters.js     # Skill/Command/Agent/Shell/FS/Subflow/Fan-out
│     ├─ executor.js     # DAG、重试、预算、heartbeat
│     ├─ runs.js         # 全局队列、取消、嵌套 run
│     ├─ store.js        # workflow/run 持久化、版本、workspace
│     ├─ catalog.js      # node/skill/command/session 目录
│     └─ templates.js
├─ shared/               # Host 和浏览器共享的纯 JS
│  ├─ node-types.js
│  ├─ validation.js
│  ├─ graph.js
│  ├─ template.js
│  ├─ values.js
│  └─ constants.js
├─ assets/icon.svg
└─ locale/{en,zh}.json
```

## 4. 包名与插件 id

- npm 包名：`@hope_phenom/dsh-plugin-cueflow`；
- `cordis.patch.yml` 的 `id` 仍是 `dsh-plugin-cueflow`；
- Host API 路径和存储目录仍是 `dsh-plugin-cueflow`，不改，避免破坏已安装用户的数据与路由；
- `cordis.patch.yml` 的 `name` 使用 scoped 包名。

## 5. DSH 识别方式

`package.json`：

```json
"dsh": {
  "bundle": { "patch": "./cordis.patch.yml" },
  "client": { "platform": "web" }
}
```

- `cordis.patch.yml` 提供 Host 行；
- `dsh.client` 让 DSH 发现 `lib/client.js`；
- `lib/index.js` 通过 `dsh.bundle.patch` 被加载；
- 不需要把 `src/`、`test/`、`docs/`、`scripts/` 发到 npm。

## 6. 发布命令

```bash
# 1. 确认工作区干净
git status --short

# 2. 构建 + 检查
pnpm build
pnpm lint
pnpm test
pnpm verify:pack
pnpm verify:install

# 3. 版本（private 已为 false）
npm version patch

# 4. 发布（scoped 包）
npm publish --access public
```

`prepublishOnly` 会再次执行 `build + verify:pack`，防止发布未构建的 `lib/client.js`。

## 7. 发布后验证

在干净的 DSH profile 中：

1. 通过 DSH 的插件/profile 安装 `@hope_phenom/dsh-plugin-cueflow`；
2. 重启 DSH；
3. 确认 CueFlow 面板出现；
4. 新建一个 Shell 节点，使用 `approval=allow` 跑一次；
5. 确认 `lib/client.js` 和 `cordis.patch.yml` 都被加载。

不要在已经损坏的旧会话上验证 parent 模式；用新会话。
