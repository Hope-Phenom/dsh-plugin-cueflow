# CueFlow

ComfyUI-style workflow orchestration for **DeepSeek Harness (DSH)**.

CueFlow opens a full-screen node canvas inside DSH. Wire typed nodes into a DAG, run it, and watch node-level status and output. Nodes call DSH capabilities directly:

- **Agent** / **Skill** — run a subagent; Skill nodes can load model-invocable *and* user-only skills.
- **Command** — run a DSH slash command against a live session.
- **Shell** / **Read File** — execute through DSH's `ctx.shell` / `ctx.fs`, inheriting its policies.
- **Input / Template / Subflow / Fan-out / Reroute / Condition / Merge / Output / Group / Note** — deterministic glue.

## Status

MVP implemented and verified on a **second Windows machine** (<test-host>):
- temporary `cueflow-check` profile: health/catalog, deterministic graph, Read File, Shell (with sandbox shim), Skill, Command;
- main `desktop` profile: panel opens, 3 nodes / 2 links render, UI run → `hello!`;
- real `code-review` (user-only Skill), `/remote-use status` Command, and Shell `echo` all passed.

Two real-machine fixes landed: Shell now resolves `sandboxPolicy` per call (session cwd or workflow cwd), and the API accepts UTF-8 BOM bodies.

Still untested: cancelling a live subagent, drag E2E at extremely narrow widths. See [`docs/README.md`](docs/README.md) for status, [`docs/decisions.md`](docs/decisions.md) for decisions, and [`docs/10-implementation-plan.md`](docs/10-implementation-plan.md) for evidence.

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
pnpm e2e        # Playwright narrow-canvas E2E (Edge)
pnpm lint       # ESLint baseline
pnpm bench      # 200-node / 500-edge graph benchmark
pnpm bench:runs # concurrent run queue benchmark
pnpm verify:pack # package content check
```

The independent UI test page imports the same `src/client` code used in DSH; only the Host and slot container are mocked.

## Docs

| Document | Contents |
|---|---|
| [Main](docs/README.md) | Overview and navigation |
| [ComfyUI research](docs/01-research-comfyui.md) | Why the node-graph metaphor works |
| [DSH research](docs/02-research-dsh.md) | Plugin, slots, skills, commands, subagents |
| [Node reference](docs/05-node-reference.md) | Ports, config, semantics |
| [User guide](docs/12-user-guide.md) | Install, first workflow, examples, troubleshooting |
| [Design rationale](docs/13-design-rationale.md) | Why the graph, nodes, execution and session model |
| [Readiness gaps](docs/14-readiness-gaps.md) | What is still missing for production workloads |
| [API reference](docs/15-api-reference.md) | Host routes, data model, errors, limits |
| [M6 plan](docs/16-m6-plan.md) | P0/P1 workload-readiness TODO and acceptance |
| [Compatibility](docs/17-compatibility.md) | DSH/Node/OS matrix, release checks, benchmark |
| [Changelog](CHANGELOG.md) | Version history |
| [Testing](docs/09-testing-strategy.md) | Four-layer strategy |
| [Decisions](docs/decisions.md) | Autonomous design decisions |

## License

MIT




