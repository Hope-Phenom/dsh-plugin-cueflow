# P1-1 parent 模式：新会话真实验证

日期：2026-10-28  
环境：从机 `<test-host>`，新会话 `<session-id>`，DSH `0.2.1-rc.3`。

## 结果

```text
<run-id>
status=completed
p1=success
child=<session-id>
mode=parent
text=PARENT_OK
```

## 根因与修复

第一次 parent 测试报错：

```text
Failed to deserialize ... messages[4]: missing field role
```

并导致旧会话在 seq 154 被判 corrupt。  
官方 Core 文档：`Agent.followup(message: UserMessage)`，消息必须是带 `id/role/content/source` 的 UserMessage，而不是 `{content, source}`。

修复：

```js
parent.followup({
  role: 'user',
  content: [{ type: 'text', text: promptText }],
  source: { kind: 'user' },
})
```

只在新会话验证，未再触碰旧损坏会话。parent 仍会向当前对话写入消息，只建议在专用/空会话使用。
