# 05 · 节点参考

> 节点定义是 Host 与 Client 的**单一事实来源**：`shared/node-types.js`。本文是它的可读规格；实现若与本文冲突，以本文为准并同步修改代码。
>
> 端口类型：`text` / `json` / `number` / `boolean` / `any`。
> 所有配置字段都必须可 JSON 序列化；未知字段保留但不参与执行。

## 1. 总表

| type | 名称 | 分类 | 输入端口 | 输出端口 | 是否执行 |
|---|---|---|---|---|---|
| `input` | Input | io | — | `value` | 是（读取运行输入） |
| `template` | Template | transform | `value` | `text` | 是 |
| `agent` | Agent | agents | `prompt`, `context` | `text`, `json` | 是（LLM） |
| `skill` | Skill | agents | `input`, `context` | `text`, `json` | 是（LLM） |
| `command` | Command | dsh | `input` | `text`, `json` | 是（可能不调 LLM） |
| `shell` | Shell | exec | `command`, `stdin` | `stdout`, `stderr`, `exitCode`, `text` | 是 |
| `file-read` | Read File | io | `path` | `text`, `info` | 是 |
| `condition` | Condition | control | `value` | `true`, `false` | 是 |
| `merge` | Merge | control | `a`, `b`, `c`, `d` | `value` | 是 |
| `output` | Output | io | `value` | — | 是（收集结果） |
| `note` | Note | note | — | — | 否（纯 UI） |

分类颜色（客户端 CSS 变量）：

| 分类 | 色 | 用途 |
|---|---|---|
| `io` | `#e7b75f` 琥珀 | 输入/输出，流程的“cue light” |
| `transform` | `#6fb7c8` 青 | 文本变换 |
| `agents` | `#b79ce0` 紫 | Agent / Skill |
| `dsh` | `#d98f5f` 暖橙 | DSH 命令 |
| `exec` | `#6fbf8f` 绿 | Shell / 文件 |
| `control` | `#c9a36a` 沙金 | 条件/合并 |
| `note` | `#8a94a6` 灰 | 批注 |

端口颜色按类型：`text` 青、`json` 紫、`number` 灰、`boolean` 绿、`any` 白。

## 2. 通用配置

每个节点实例都有：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | `n_` + base36，工作流内唯一 |
| `type` | string | 上表之一 |
| `title` | string | 显示名；默认取节点类型名 |
| `position` | `{x,y}` | 画布坐标；不参与执行 |
| `config` | object | 节点类型专属配置 |
| `disabled` | boolean | `true` 时不执行，输出为 `undefined` |

节点实例**不保存**尺寸、选中状态、运行状态；这些是 UI / run 的职责。

可失败节点（Agent / Skill / Command / Shell / Read File）还支持通用恢复字段：

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `retry` | number | `0` | 首次失败后的额外尝试次数，0–5 |
| `retryDelayMs` | number | `500` | 重试前等待，0–60000ms |
| `onError` | `fail` / `skip` | `fail` | `skip` 标记该节点 skipped 并继续；`fail` 终止 run |

## 3. 逐节点规格

### 3.1 Input

把一个运行输入暴露为图的值。运行对话框会为每个 Input 节点渲染一个字段；未填写时用 `defaultValue`。

**端口**

| 方向 | id | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| out | `value` | 由 `valueType` 决定 | — | 用户输入值 |

**配置**

| key | 类型 | 默认 | 说明 |
|---|---|---|---|
| `label` | string | `Input` | 运行对话框里的字段名 |
| `valueType` | `text json number boolean` | `text` | 输出端口类型 |
| `defaultValue` | string | `""` | 默认值；json 会 `JSON.parse`，number 会 `Number()` |
| `placeholder` | string | `""` | 输入占位符 |
| `required` | boolean | `true` | 为空时运行前校验失败 |
| `options` | string | `""` | 逗号分隔的可选值；非空时渲染为 select |

**执行**

1. 从 run.inputs[node.id] 取值；没有则用 `defaultValue`。
2. 按 `valueType` 转换；转换失败 → 节点错误（`INPUT_INVALID`）。
3. `required && 空字符串` → 运行前校验错误。
4. 输出 `{ value }`。

### 3.2 Template

把上游值和变量插值成文本。适合拼接 prompt、文件名、命令片段。

**端口**

| 方向 | id | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| in | `value` | any | 否 | `{{input}}` 的来源 |
| out | `text` | text | — | 插值结果 |

**配置**

| key | 类型 | 默认 | 说明 |
|---|---|---|---|
| `template` | string | `""` | 插值模板；为空时直接字符串化 `value` |
| `trim` | boolean | `true` | 去掉首尾空白 |

**插值语法**

- `{{input}}`：上游 `value`（字符串化）。
- `{{nodeId.portId}}`：任意已执行节点的输出；找不到 → 空字符串，并记一条 `template/missing` 日志。
- `{{vars.key}}`：运行级变量（MVP 保留，UI 暂不暴露）。
- `{{json nodeId.portId}}`：**不在 MVP**；遇到时按未知占位符保留原样，不做特殊处理。
- 未知占位符保留原样，避免静默吞掉用户意图。

**执行**

1. 解析模板；无模板时 `String(value ?? '')`。
2. `trim`。
3. 输出 `{ text }`。

### 3.3 Agent

让一个子代理执行提示词，返回文本与可选的 JSON。

**端口**

| 方向 | id | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| in | `prompt` | text | 否 | 优先于 `config.prompt` |
| in | `context` | any | 否 | 追加为 `<context>` 块 |
| out | `text` | text | — | 子代理最终文本 |
| out | `json` | json | — | `structured` 或解析出的 JSON；无则 `null` |

**配置**

| key | 类型 | 默认 | 说明 |
|---|---|---|---|
| `prompt` | string | `""` | 提示词；未连 `prompt` 时使用 |
| `instructions` | string | `""` | 追加到 prompt 前的流程约束 |
| `provider` | string | `""` | 传给 agentOptions；空则继承父 Agent |
| `model` | string | `""` | 同上 |
| `reasoningEffort` | string | `""` | 同上 |
| `agentPreset` | string | `""` | 传给 subagent 请求；空则继承父会话 |
| `outputSchema` | string | `""` | JSON Schema 文本；非空则请求结构化输出 |
| `parseJson` | boolean | `false` | 未提供 schema 时，尝试把文本解析为 JSON |
| `allowPartial` | boolean | `false` | `max-tokens` 时是否接受部分文本 |
| `timeoutMs` | number | `600000` | 节点级超时（10 分钟） |

**执行**

1. `prompt` 输入优先；否则 `config.prompt`。两者都空 → 配置错误。
2. 组装：
   ```text
   <workflow_instructions>…</workflow_instructions>
   <context>…</context>   // 仅当有 context
   <workflow_task>…</workflow_task>
   ```
3. 调 `ctx.subagents.startActivation({ provider: 'spawn'|'fork', delivery:'caller', ... })`。
4. `result.stopReason`：
   - `completed` → 成功；
   - `max-tokens` 且 `allowPartial` → 成功，`meta.partial = true`；
   - `aborted` → 节点 `cancelled`；
   - 其它 → 节点 `error`，`diagnostic` 作为错误详情。
5. 输出 `text`：`result.output` 中所有 `type === 'text'` 块拼接。
6. 输出 `json`：`result.structured`；否则 `parseJson` 时尝试 `JSON.parse(text)`；失败为 `null`（不报错，除非配置 `strictJson`，MVP 不提供）。

**失败示例**

- 无 live Agent：`CAPABILITY_MISSING: 需要至少一个 live DSH 会话作为父级。请先打开一个会话。`
- 无 subagent provider：`CAPABILITY_MISSING: 当前 DSH 没有可用的 subagent provider（期望 spawn 或 fork）。`

### 3.4 Skill

加载一个 DSH Skill，并把它的正文作为指令注入子代理。**不检查 `modelInvocable`**，因此仅用户可见的 Skill 也可以被工作流显式调用。

**端口**

| 方向 | id | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| in | `input` | text | 否 | 任务输入，追加到 `<workflow_task>` |
| in | `context` | any | 否 | 额外上下文 |
| out | `text` | text | — | 子代理最终文本 |
| out | `json` | json | — | 结构化/解析结果 |

**配置**

| key | 类型 | 默认 | 说明 |
|---|---|---|---|
| `skill` | string | `""` | Skill 名（kebab-case） |
| `instructions` | string | `""` | 额外流程约束 |
| `provider` / `model` / `reasoningEffort` | string | `""` | 同 Agent |
| `outputSchema` | string | `""` | 同 Agent |
| `parseJson` | boolean | `false` | 同 Agent |
| `timeoutMs` | number | `600000` | 同 Agent |

**执行**

1. `ctx.skills.get(skill, { cwd })`；不存在 → 节点错误 `SKILL_NOT_FOUND`，错误信息列出当前 catalog 中相近的名字（最多 3 个）。
2. 组装：
   ```text
   <skill_content name="...">…正文…</skill_content>
   <workflow_instructions>…</workflow_instructions>
   <workflow_task>…input…</workflow_task>
   <context>…</context>
   ```
3. 其余同 Agent（子代理执行、结果映射）。
4. 运行日志记录 `skill:loaded`，包含 `modelInvocable` / `userInvocable`，便于审计。

**注意**

- 这是“trusted caller”语义：工作流作者显式选择 Skill，等价于用户在 `/` 菜单选择它。
- Skill 正文里的相对资源路径不会被自动改写；MVP 只在日志中记录 `resourceBase`，不复制资源。

### 3.5 Command

执行一个 DSH 人类斜杠命令，不把命令发给模型。

**端口**

| 方向 | id | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| in | `input` | text | 否 | 命令的 rawInput（`/name` 之后的文本） |
| out | `text` | text | — | `CommandResult.text` |
| out | `json` | json | — | 若 text 是 JSON 则解析，否则 `null` |

**配置**

| key | 类型 | 默认 | 说明 |
|---|---|---|---|
| `command` | string | `""` | 命令名，不带 `/` |
| `fallbackInput` | string | `""` | 未连接 `input` 时使用 |
| `approval` | `ask` / `allow` / `deny` | `ask` | `ask` 需一次确认；`allow` 直接执行；`deny` 拒绝 |
| `timeoutMs` | number | `120000` | 命令执行超时（2 分钟） |

**执行**

1. 解析目标 Agent（同 Agent 节点）。
2. 构造 line：`/${command}` +（rawInput 非空则 ` ${rawInput}`）。
3. 优先 `ctx.commands.execute(agent, line, [], signal)`。
4. 返回 `undefined` → `COMMAND_NOT_FOUND`。
5. 读取结果：`execution.result`（兼容 `execution.text` / `execution` 本身）；`kind === 'error'` → 节点错误。
6. 若 `execute` 不存在或抛 `not a function`，回退 `find(agent, command)` + `handler({ commandId, agent, rawInput, attachments: [], signal })`，日志记 `adapter:fallback`。
7. 输出 `text`；`json` 尝试解析。

**限制**

- 必须有 live Agent；没有时运行前校验失败。
- 命令的 `command/run` / `command/done` 生命周期由 DSH 记录；CueFlow 自己的 run 日志只记录节点级摘要，不复制会话事件。

### 3.6 Shell

执行 shell 命令。通过 `ctx.shell`，继承 DSH 的 subprocess / sandbox 策略。

**端口**

| 方向 | id | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| in | `command` | text | 否 | 优先于 `config.command` |
| in | `stdin` | text | 否 | 写入 stdin |
| out | `stdout` | text | — | 标准输出 |
| out | `stderr` | text | — | 标准错误 |
| out | `exitCode` | number | — | 退出码；被信号杀死为 `null` |
| out | `text` | text | — | `stdout` +（stderr 非空时）`\n[stderr]\n…` |

**配置**

| key | 类型 | 默认 | 说明 |
|---|---|---|---|
| `command` | string | `""` | 未连接 `command` 时使用 |
| `workdir` | string | `""` | 工作目录；空则用 run.cwd |
| `approval` | `ask` / `allow` / `deny` | `ask` | `ask` 需一次确认；`allow` 直接执行；`deny` 拒绝 |
| `timeoutMs` | number | `120000` | 超时（2 分钟） |
| `failOnNonZero` | boolean | `true` | 非零退出是否让节点失败 |
| `maxOutputChars` | number | `20000` | 输出截断 |

**执行**

1. `ctx.shell.resolve({ command, workdir, timeoutMs, signal, stdin, stdoutMaxBytes })`。
2. `execution = await ctx.shell.execute(spec)`。
3. `result = await execution.result`（兼容 `execution.done`）。
4. `timedOut` → 节点错误 `SHELL_TIMEOUT`；`aborted` → `cancelled`。
5. `failOnNonZero && exitCode !== 0` → 节点错误 `SHELL_EXIT_NONZERO`，错误里包含 stderr 尾部。
6. 输出四个端口；`text` 按 `maxOutputChars` 截断并标记 `…[truncated]`。

**安全**

- 默认 `approval: ask`：运行到 Shell/Command 节点时 UI 暂停并显示命令/动作；批准只对本次执行有效，拒绝/超时/无审批通道都 fail-closed。
- `allow` 是显式的“我信任这张图/这条命令”，`deny` 用于禁止执行；它们都写进 workflow，便于审查。
- `command` 来自配置或上游 Template/Input，上游可以来自模型输出——这是用户显式连线造成的，UI 在 Shell 节点上显示警示色与说明。
- MVP 不提供 `env` / `dshEnv` 覆盖；避免绕过 DSH 的环境治理。

### 3.6.1 Subflow

运行一个已保存的 workflow，并把它的 `outputs` 作为本节点输出。

**端口**

| 方向 | id | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| in | `input` | json | 否 | 传给子 workflow 的输入对象；按 Input 节点 id 匹配 |
| out | `text` | text | — | `outputs` 的字符串形式 |
| out | `json` | json | — | 子 workflow 的 `outputs` |

**配置**

| key | 类型 | 默认 | 说明 |
|---|---|---|---|
| `workflowId` | string | `""` | 已保存的 workflow id |
| `retry` / `retryDelayMs` / `onError` | — | — | 同通用恢复字段 |

**执行**

1. 从 store 读取 `workflowId` 的 workflow；不存在 → `SUBFLOW_WORKFLOW_REQUIRED` / `SUBFLOW_NOT_FOUND`。
2. 用 `runNested` 直接执行（不占用全局队列，避免父 run 等待自己占用的槽）。
3. 子 run 记录写入 `runs/`；父节点输出子 run 的 `outputs`。
4. 嵌套深度上限 5；子 workflow 里的 Shell/Command `approval: ask` 没有 UI 审批面，会 fail-closed，需显式 `allow`。

### 3.6.2 Fan-out

对数组逐项运行同一个已保存 workflow，返回结果数组（顺序执行，受 `maxItems` 限制）。

**端口**

| 方向 | id | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| in | `items` | json | 是 | JSON 数组 |
| out | `results` | json | — | 每个子 run 的 outputs 数组；skip 的项为 `{error}` |
| out | `errors` | json | — | 失败项 `{index,item,code,message}` |
| out | `count` | number | — | 实际执行数量 |
| out | `text` | text | — | `results` 的字符串形式 |

**配置**：`workflowId`、`itemKey`（默认 `task`）、`maxItems`（默认 20，最大 100）、`concurrency`（1–8，默认 1）、`onItemError: fail | skip`，以及通用 retry/onError。

### 3.7 Read File

读取一个文本文件。通过 `ctx.fs`，继承 DSH 的文件策略。

**端口**

| 方向 | id | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| in | `path` | text | 否 | 优先于 `config.path` |
| out | `text` | text | — | 文件内容（截断） |
| out | `info` | json | — | `{ path, size, truncated }` |

**配置**

| key | 类型 | 默认 | 说明 |
|---|---|---|---|
| `path` | string | `""` | 相对 run.cwd 或绝对路径 |
| `maxChars` | number | `200000` | 最大字符数 |

**执行**

1. `target = await ctx.fs.resolve(path, { cwd })`。
2. `stat = await ctx.fs.stat(target)`；`type !== 'file'` → 错误 `NOT_A_FILE`。
3. `text = await ctx.fs.readText(target, signal)`；超过 `maxChars` 截断。
4. 输出 `text`、`info`。

### 3.7.1 Reroute

把输入原样传到输出，用于整理大图连线；不改变值、不做类型转换。

| 方向 | id | 类型 | 必填 |
|---|---|---|---|
| in | `value` | any | 是 |
| out | `value` | any | — |

### 3.8 Condition

按规则把输入路由到 `true` 或 `false` 分支。未走的分支输出 `undefined`，下游会因此跳过。

**端口**

| 方向 | id | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| in | `value` | any | 是 | 被判断的值 |
| out | `true` | any | — | 条件为真时输出原值 |
| out | `false` | any | — | 条件为假时输出原值 |

**配置**

| key | 类型 | 默认 | 说明 |
|---|---|---|---|
| `operator` | select | `truthy` | `truthy/falsy/equals/notEquals/contains/regex/gt/lt/always` |
| `compare` | string | `""` | 比较值；`regex` 时是正则源 |
| `caseSensitive` | boolean | `true` | `contains` / `equals` 是否区分大小写 |

**语义**

- `truthy`：`Boolean(value)`。
- `falsy`：`!Boolean(value)`。
- `equals` / `notEquals`：字符串比较（数字按数值比较，若两边都是数字）。
- `contains`：字符串包含。
- `regex`：`new RegExp(compare, caseSensitive ? '' : 'i')`；非法正则 → 节点错误。
- `gt` / `lt`：数值比较；非数字 → 节点错误。
- `always`：恒真。
- 输出 `{ true: value }` 或 `{ false: value }`；另一路不产生端口值。

### 3.9 Merge

把多个分支合成一个值。用于条件分支汇合。

**端口**

| 方向 | id | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| in | `a` | any | 否 | 第一个候选 |
| in | `b` | any | 否 | 第二个候选 |
| in | `c` | any | 否 | 第三个候选 |
| in | `d` | any | 否 | 第四个候选 |
| out | `value` | any | — | 合并结果 |

**配置**

| key | 类型 | 默认 | 说明 |
|---|---|---|---|
| `mode` | select | `first` | `first` / `array` / `concat` |
| `separator` | string | `"\n\n"` | `concat` 的分隔符 |

**语义**

- `first`：按 a→b→c→d 返回第一个非 `undefined` 且非 `null` 的值；全空 → `undefined`。
- `array`：返回所有非空值的数组；全空 → `[]`。
- `concat`：字符串化所有非空值并用 `separator` 连接；全空 → `''`。
- 上游被跳过（`undefined`）不视为错误。

### 3.10 Output

收集一个最终结果，显示在运行面板与 run.outputs 中。

**端口**

| 方向 | id | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| in | `value` | any | 是 | 最终值 |

**配置**

| key | 类型 | 默认 | 说明 |
|---|---|---|---|
| `name` | string | `Output` | 输出名 |
| `format` | select | `text` | `text` / `json` |
| `previewLines` | number | `12` | 节点内预览行数 |

**执行**

1. `value` 缺失 → 节点 `skipped`（不是错误；条件分支可能没走这里）。
2. `format === 'json'` 且值不是字符串 → `JSON.stringify(value, null, 2)`；字符串保持原样。
3. 写入 `run.outputs[node.id] = { name, format, value }`。
4. 节点预览显示前 `previewLines` 行。

### 3.10.1 Group

视觉分组框：不执行、无端口；用于把相关节点圈在一起。配置 `label`、`width`、`height`。选中 2+ 节点后可用画布工具条“分组”创建包围框。

### 3.11 Note

画布批注，不参与执行。用于解释流程、标记待办。

**端口**：无。

**配置**

| key | 类型 | 默认 | 说明 |
|---|---|---|---|
| `text` | string | `""` | 批注内容 |
| `color` | select | `amber` | `amber/gray/blue/green/rose` |

**执行**：跳过；状态始终 `idle`，不参与校验与拓扑。

## 4. 端口兼容矩阵

| from \ to | text | json | number | boolean | any |
|---|---|---|---|---|---|
| text | ✅ | ✅ | ✅ 仅可解析数字 | ✅ 仅 `true/false` | ✅ |
| json | ✅ 字符串化 | ✅ | ✅ 仅数字 | ✅ 仅布尔 | ✅ |
| number | ✅ | ✅ | ✅ | ❌ | ✅ |
| boolean | ✅ | ✅ | ❌ | ✅ | ✅ |
| any | ✅ | ✅ | ✅ | ✅ | ✅ |

规则：

- 同类型永远允许。
- `any` 与任何类型互相允许。
- 允许的转换在运行时执行（见 [执行引擎](07-execution-engine.md#4-值解析与类型转换)）；不可转换时节点错误，而不是静默变 `NaN`。
- UI 连线时用同一矩阵判断并给出提示；运行前校验再检查一次。

## 5. 默认配置生成

`shared/node-types.js` 的 `createNode(type, position, overrides)`：

- 复制 `defaults`；
- 生成 `id`（调用方传入或随机）；
- 标题 = `title`；
- `disabled: false`；
- 不接受未知 type（抛错）。

新节点放置位置由客户端决定：双击位置 / 视口中心 / 级联偏移（每新增一个 +24px）。

## 6. 节点扩展规则（后续）

新增节点必须：

1. 在 `shared/node-types.js` 增加类型定义（端口、配置字段、默认值、分类）。
2. 在 `lib/core/adapters.js` 增加执行分支；纯计算节点可放 `shared/` 并在 executor 内执行。
3. 在本文增加规格。
4. 增加单元测试：端口、默认配置、正常路径、错误路径。
5. 更新决策表（若引入新的 DSH 能力或安全边界变化）。

MVP 不允许第三方动态注册节点类型；这是为了让工作流可移植、可审查。
