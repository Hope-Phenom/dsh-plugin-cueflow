# CueFlow

ComfyUI-style workflow orchestration for **DeepSeek Harness (DSH)**.

CueFlow opens a full-screen node canvas inside DSH. Wire typed nodes into a DAG, run it, and watch node-level status and output. Nodes call DSH capabilities directly:

- **Agent** / **Skill** — run a subagent; Skill nodes can load model-invocable *and* user-only skills.
- **Command** — run a DSH slash command against a live session.
- **Shell** / **Read File** — execute through DSH's `ctx.shell` / `ctx.fs`, inheriting its policies.
- **Input / Template / Condition / Merge / Output / Note** — deterministic glue.

## Status

MVP implemented. Real-DSH smoke passed in a **temporary** profile (`cueflow-check`, port 2618): host route/catalog, workflow save, deterministic graph, Shell, Read File, Agent node, and running a graph from the panel. The temporary profile and test data were removed; the user's `desktop` profile was not modified.

Real **Skill** and **Command** node executions are unit/mock-tested but were not run against a live session to avoid model/command side effects. See [`docs/README.md`](docs/README.md) for status, [`docs/decisions.md`](docs/decisions.md) for decisions, and [`docs/10-implementation-plan.md`](docs/10-implementation-plan.md) for evidence.

## Install (local checkout)

```powershell
pnpm install
pnpm build
# quit DSH first: the profile directory is locked while it runs
dsh plugin --profile desktop add "F:\WorkSpace\dsh-plugin-cueflow"
```

Open DSH, click the CueFlow icon in the left sidebar.

## Development without restarting DSH

```powershell
pnpm test       # pure Node tests: graph, validation, executor, adapters, API
pnpm build      # esbuild the browser bundle
pnpm ui         # Vite + Mock Host at http://127.0.0.1:5199
pnpm ui:shot    # headless screenshots, if Edge/Chrome is available
```

The independent UI test page imports the same `src/client` code used in DSH; only the Host and slot container are mocked.

## Docs

| Document | Contents |
|---|---|
| [Main](docs/README.md) | Overview and navigation |
| [ComfyUI research](docs/01-research-comfyui.md) | Why the node-graph metaphor works |
| [DSH research](docs/02-research-dsh.md) | Plugin, slots, skills, commands, subagents |
| [Node reference](docs/05-node-reference.md) | Ports, config, semantics |
| [Testing](docs/09-testing-strategy.md) | Four-layer strategy |
| [Decisions](docs/decisions.md) | Autonomous design decisions |

## License

MIT
