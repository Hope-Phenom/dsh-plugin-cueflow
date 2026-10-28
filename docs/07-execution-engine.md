# 07 · 执行引擎

## 1. 目标

给定一个通过校验的 `WorkflowDocument` 和 `inputs`，执行节点图，产出：

- 每个节点的最终状态与输出；
- 一份按时间排序的事件日志；
- 一组 Output 节点结果；
- 可复现的 run 记录（含 workflow 快照）。

约束：

- 不执行任意用户代码；
- 可在任意节点取消，取消后不再启动新节点；
- 单个节点失败默认终止整个 run；
- 条件分支用 `undefined` 表达“未走”，不用异常；
- 同一输入 + 同一 workflow 的执行顺序确定（并发只影响时间，不影响依赖关系）。

## 2. 运行状态机

```text
                 ┌────────────┐
                 │  created   │
                 └─────┬──────┘
                       │ start()
                 ┌─────▼──────┐
        ┌────────│  running   │────────┐
        │        └─────┬──────┘        │
        │ cancel()     │ all settled   │ fatal error
        │        ┌─────▼──────┐        │
        │        │ completed  │        │
        │        └────────────┘        │
        │        ┌────────────┐        │
        └───────▶│ cancelled  │◀───────┘
                 └────────────┘
```

- `created`：API 已接受，尚未开始调度。
- `running`：至少一个节点在运行或等待。
- `completed`：所有节点 `success` / `skipped`。
- `error`：某个节点失败且 `failFast`（默认）。
- `cancelled`：用户取消或插件卸载。

节点状态：

| 状态 | 含义 |
|---|---|
| `idle` | 尚未轮到 |
| `queued` | 依赖已满足，等待并发槽 |
| `running` | 正在执行 |
| `success` | 完成，有输出（或 Output 节点收集成功） |
| `error` | 执行失败 |
| `skipped` | 依赖未产出（条件未走/上游跳过/disabled） |
| `cancelled` | 因 run 取消或超时取消 |

> `skipped` 不是错误；下游如果必需输入缺失，也会被标记 `skipped`。

## 3. 调度算法

### 3.1 预处理

1. `validateWorkflow`：结构、端口、类型、单入边、DAG。
2. 计算拓扑序 `topoIndex`（Kahn，队列按 `position.x`、`position.y`、`id` 排序，保证确定性）。
3. 构建：
   - `incoming[nodeId][portId] = edge | undefined`
   - `outgoing[nodeId] = edge[]`
   - `nodeById`
4. 初始化所有节点状态为 `idle`。
5. 初始化 `values = {}`；`values[nodeId][portId]` 只在节点成功后写入。

### 3.2 主循环

```text
while pending not empty:
  if aborted: mark pending cancelled; break
  ready = pending nodes where every upstream node is settled (success/error/skipped/cancelled)
  for each ready node in topo order:
     inputs = resolveInputs(node)
     if node.disabled or inputs.requiredMissing:
        settle(node, skipped, reason)
        continue
     if runningCount < concurrency:
        start(node, inputs)   // async
     else:
        mark queued
  if no node settled and no node started and pending:
      // 不应发生：DAG 中必有可运行节点；防御性标记 error
  await Promise.race(runningPromises) or short tick
```

实际实现可以用 Promise 驱动：

- 每次节点完成时，重新计算 ready 集合并启动新节点；
- 用一个 `Promise` 链 + `waitForSlot` 控制并发；
- 当 `runningCount === 0 && pending` 且没有 ready 节点时，说明图有问题（校验已排除环），标记剩余节点 `skipped` 并记录 `scheduler/deadlock` 错误。

### 3.3 就绪判定

节点就绪 = 所有**上游节点**都已 settle（不论成功/跳过），而不是只看入边数量。原因：条件分支的未走分支没有值，但下游必须知道“上游已结束”才能决定跳过。

- 上游 `success`：其输出端口可能有值，也可能没有（Condition 的未走分支）。
- 上游 `skipped` / `cancelled` / `error`：视为该上游所有端口 `undefined`。
- 如果节点没有上游：立即就绪。

### 3.4 输入解析

对每个输入端口：

1. 若有入边：
   - 源节点必须 `success`；
   - 取 `values[source.node][source.port]`；
   - 若值为 `undefined` → 输入缺失。
2. 否则若端口有 `default` → 用默认值。
3. 否则：
   - `required` → 缺失；
   - 可选 → `undefined`。
4. 类型转换（见 §4）。

**缺失处理**：

- 任一必填输入缺失 → 节点 `skipped`，事件 `node/skip`，原因 `missing-input:<port>`。
- 所有输入可选且缺失 → 节点仍执行，adapter 决定是否报配置错误（例如 Agent 的 prompt 空）。

### 3.5 并发

- `settings.concurrency` 默认 2，范围 1–8。
- 只有互不依赖的节点会并行；同一分支自然串行。
- 完成顺序不影响结果，但事件顺序会反映真实时间。
- 运行日志中记录 `node/start` 的并发槽信息（`running: n/concurrency`）。

### 3.6 超时

每个节点有 `timeoutMs`（节点配置或类型默认）：

- 通用：`Promise.race([executeNode, timeout])`；超时触发内部 `AbortController.abort('timeout')`。
- Agent/Skill/Command：把 signal 传给 adapter；adapter 应取消子代理/命令。
- Shell：把 `timeoutMs` 传给 `ctx.shell.resolve`，由 shell seam 处理；同时保留通用超时兜底。
- 超时后节点 `error`，`code = NODE_TIMEOUT`，错误信息包含节点标题与超时值。

### 3.7 取消

- `RunManager.cancel(runId)` 调用 `run.controller.abort()`。
- 调度器在每个循环检查 `signal.aborted`；不再启动新节点。
- 运行中的节点：adapter 收到 signal，应尽快停止；若 adapter 不响应，通用超时最终会结束。
- 所有未 settle 的节点标记 `cancelled`；run 状态 `cancelled`；写 run 记录。
- 取消是幂等的；已结束的 run 返回 409 `RUN_CONFLICT`。

## 4. 值解析与类型转换

```js
function coerce(value, fromType, toType) {
  if (value === undefined) return undefined
  if (toType === 'any' || fromType === 'any') return value
  if (fromType === toType) return value
  switch (`${fromType}->${toType}`) {
    case 'number->text': return String(value)
    case 'boolean->text': return value ? 'true' : 'false'
    case 'json->text': return typeof value === 'string' ? value : JSON.stringify(value)
    case 'text->number': { const n = Number(value); if (!Number.isFinite(n)) throw new TypeError(...); return n }
    case 'text->boolean': if (value === 'true' || value === 'false') return value === 'true'; throw ...
    case 'json->number': if (typeof value === 'number' && Number.isFinite(value)) return value; throw ...
    case 'json->boolean': if (typeof value === 'boolean') return value; throw ...
    case 'text->json': try JSON.parse(value) catch { return value } // 宽松：文本就是 JSON 字符串值
    default: throw new TypeError(...)
  }
}
```

说明：

- `text->json` 宽松处理：如果解析失败，返回原字符串（很多节点只关心文本）。
- `number->boolean` / `boolean->number` 不允许。
- 转换失败 → 节点 `error`，`code = TYPE_COERCION_FAILED`，信息包含端口、源类型、目标类型、值预览。
- 同一对端口在 UI 连线时用静态矩阵判断；运行时再做值级检查。

## 5. 条件分支语义

Condition 节点：

- 只向命中的输出端口写值；另一路不写（`undefined`）。
- 下游节点如果必填输入连到未命中端口 → `skipped`。
- 下游如果是 Merge / 可选输入 → 继续执行。
- `disabled` 的 Condition 节点：两个输出都不写，所有下游按缺失处理（相当于整段关闭）。

这是“分支”而不是“异常”的关键：用户可以在图上看到哪条路被跳过，而不会让 run 失败。

## 6. 失败策略

默认 `failFast = true`：

1. 节点 `error`；
2. 调度器停止启动新节点；
3. 正在运行的节点等待完成或取消？MVP：**不主动取消**，让它们自然结束（避免半截副作用），但不再启动新节点；如果用户取消，则全部取消。
4. 所有未启动节点标记 `skipped`，原因 `upstream-failed`；**不主动取消**已经在运行的节点（避免半截副作用）；只有用户取消或插件卸载才取消全部；
5. run `error`，`error` 指向第一个失败节点。

后续可加 `settings.onNodeError = 'fail' | 'continue' | 'skip-downstream'`；MVP 只实现 `fail`，但数据结构预留。

## 7. 事件模型

每个 run 维护 `events: RunEvent[]`，`seq` 从 0 单调递增：

```ts
type RunEvent = {
  seq: number
  time: number
  type:
    | 'run/start' | 'run/end' | 'run/cancel' | 'run/error'
    | 'node/queued' | 'node/start' | 'node/log'
    | 'node/end' | 'node/skip' | 'node/error'
    | 'validation/warn'
  nodeId?: string
  message: string
  data?: unknown
}
```

- `node/log` 用于 adapter 的细粒度信息（skill 装载、命令 fallback、截断提示）。
- `node/end` 的 `data` 包含 `{ status, durationMs, outputsPreview }`，不包含完整输出。
- 事件上限 2000；超过后丢弃最旧的 `node/log`（保留 run/node 边界事件）。
- 轮询接口返回 `events.filter(e => e.seq > after)`；客户端按 seq 去重、追加。

## 8. 输出与截断

- 每个节点输出先写内存；`run.nodeStates[nodeId].outputs` 保存截断后的值（`maxOutputChars`，默认 20000）。
- 完整值只在内存中存在到 run 结束；如果 Output 节点需要完整值，在 run 内保留；结束后只存截断值。
- `preview`：优先 `text` 端口；否则 `JSON.stringify`；截断到 4000 字符。
- 截断标记：`…[truncated N chars]`。

## 9. 持久化时机

| 时机 | 动作 |
|---|---|
| run 创建 | 内存记录；可选写 `runs/<id>.json` 的 `running` 草稿（用于崩溃恢复） |
| run 结束/失败/取消 | 原子写完整 run 记录；更新 `runs/index.json`（按结束时间倒序，最多 50） |
| 启动时 | 读取 index；把遗留的 `running` 草稿标记为 `interrupted`（不自动续跑） |
| 删除 workflow | 不删除历史 run（run 有 workflowSnapshot，可独立查看） |

## 10. 确定性

- 节点启动顺序：拓扑序 + `position.x` + `position.y` + `id`。
- 并发只影响完成时间；依赖关系不允许乱序。
- 事件顺序是真实时间顺序，不适合作为断言依据；测试断言应基于最终状态与节点输出。
- 随机 ID 只用于新节点/边；运行本身不使用随机数。
- 时间戳仅用于展示与持久化，不参与逻辑。

## 11. 运行内存与清理

- `RunManager` 保留最近 20 个 run 的完整内存记录；更旧的只保留磁盘摘要。
- 每个 run 的 `AbortController` 在结束后释放。
- 插件 dispose 时：
  1. 遍历 active runs，`abort('plugin-disposed')`；
  2. 等待最多 5s 让 adapter 清理；
  3. 写 `cancelled` 记录；
  4. 清空内存。

## 12. 测试要点

单元测试（不依赖 DSH）：

- 线性图 Input→Template→Output；
- 并行分支与并发上限；
- Condition 真/假分支跳过；
- Merge 三种模式；
- 必填输入缺失 → skipped；
- 类型转换成功/失败；
- 节点错误 → run error，后续 skipped；
- 取消 → running/queued 状态正确；
- 超时 → NODE_TIMEOUT；
- 事件 seq 单调、after 过滤正确；
- disabled 节点 → skipped，下游缺失处理。

Mock adapter 测试：

- Agent/Skill/Command/Shell/File 的调用参数与返回值映射；
- 缺少 live Agent / skill / command / shell / fs 时的错误码；
- adapter 抛错 / 返回 malformed 结果时的诊断。
