# 插件管理器安装后启动失败：客户端 factory 注册重复

日期：2026-10-28  
环境：本机 DSH Desktop `0.2.1-rc.3`，profile `desktop`。

## 日志

`C:\Users\<user>\AppData\Roaming\@deepseek-ai\dsh-desktop\logs\crash-2026-10-28T08-21-26-869Z-web-boot.log`：

```text
web boot: 1 entry did not activate
@hope_phenom/dsh-plugin-cueflow: import failed (see console for the import error)

renderer console:
client-modules: duplicate factory registration for "dsh-plugin-cueflow"
(bundle executed twice without invalidate?)
```

插件管理器的 pnpm 日志显示 `@hope_phenom/dsh-plugin-cueflow 0.1.0` 安装成功，但 profile 的 `package.json` 没有保留该依赖，说明安装后在 web boot 阶段失败并被回滚。

## 根因

npm 包名已经改为 `@hope_phenom/dsh-plugin-cueflow`，但浏览器 bundle 的 `window.__ModuleLoader__.load({ id })` 仍使用旧 scoped 名称 `dsh-plugin-cueflow`。DSH client-modules 以 factory id 去重；同一个 id 的 bundle 被执行两次时，第二次注册报 duplicate。旧包/缓存或重复 bundle 都可能导致第二次执行。

## 修复

`src/client/entry.js` 的 factory id 改为 scoped 包名：

```js
window.__ModuleLoader__.load({
  id: '@hope_phenom/dsh-plugin-cueflow',
  ...
})
```

`lib/client.js` 重新构建；Host 插件 id / API 路径 / 存储目录仍保持 `dsh-plugin-cueflow`。

## 复装

重新打包/发布后，在 DSH 插件管理中卸载旧条目、重新安装，重启 DSH。不要同时安装旧 unscoped 包与 scoped 包；两者会共用同一 Host plugin id。
