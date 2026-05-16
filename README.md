# Typr

**Interaction protocol built for humans and terminals.**

> Portuguese: [README.pt.md](./README.pt.md)

Typr is a protocol for prompts, progress feedback, and logs in CLIs using NDJSON over stdin and stdout, with runtime modes that switch between interactive terminal use and automation.

## Goal

Let the same app use a rich UI when a TTY is present while, without changing business logic, running in machine mode when the process is driven by scripts, CI, or another parent process that speaks the protocol.

## Supported languages

- **TypeScript** (Node.js): reference implementation published as the **`@even7hq/js`** npm package (workspace `packages/js`).
- **JavaScript** (Node.js): same package; artifacts as declared in the package `package.json`.

Other languages may implement the NDJSON protocol below only; when an official SDK lives in this repository, it will be listed here.

## Documentation site

An [Astro](https://astro.build/) + [Starlight](https://starlight.astro.build/) site lives in [`packages/docs/`](./packages/docs/). From the repo root run `yarn docs:dev` to work on it locally.

## Transport

- One message per line, UTF-8, one JSON object per line (NDJSON).
- In JSON mode, the CLI process writes frames to stdout and reads frames from stdin.
- Every frame carries `typr: 1` and `ts` (ISO 8601) so parsers can reject unknown protocol versions.
- Pair RPC calls with responses using the same string `id` on `request`, `response`, and `error`.

## Frame types (`type`)

Lowercase string discriminant:

| Value | Typical direction | Meaning |
| --- | --- | --- |
| `request` | CLI to host | RPC call with `id`, `path`, and optional `input`. |
| `response` | Host to CLI | Success for the same `id` with optional `result`. |
| `error` | Host to CLI | Failure for the same `id` with structured `error` (`code`, `message`, optional `data`). |
| `event` | CLI to host | One-way notification (spinner, progress, log, intro, outro, and so on). |

## RPC `request`

The `path` field names the procedure with dot segments, for example `adapter.text` or `adapter.confirm`. The optional `input` object carries JSON-serializable arguments (the same shape the reference adapter used to put under `payload`).

Reference paths used by **`@even7hq/js`**: `adapter.text`, `adapter.password`, `adapter.confirm`, `adapter.date`, `adapter.multiline`, `adapter.path`, `adapter.select`, `adapter.selectKey`, `adapter.multiselect`, `adapter.autocomplete`, `adapter.autocompleteMultiselect`, `adapter.groupMultiselect`, `adapter.tasks`. Callback-heavy prompts such as `group` cannot run over NDJSON and are rejected by the JSON transport. Dynamic autocomplete option suppliers (`options` as a function) are also rejected over NDJSON and in AUTO mode.

Payloads must be JSON-serializable; when using JSON transport, host-side validation replaces callback fields such as `validate`.

Optional per-call `autoPolicy` overrides the default policy for automatic mode.

## `response`

It repeats the same `id` as the matching `request`. The procedure result is in `result` (type depends on the path).

## `error`

It repeats the same `id` as the matching `request`. The host sends `error.code`, `error.message`, and optional `error.data`.

## `event`

Terminal notifications use `path: "terminal.emit"`, `name` in uppercase, for example `SPINNER_START`, `SPINNER_MESSAGE`, `SPINNER_STOP`, `PROGRESS_START`, `PROGRESS_ADVANCE`, `PROGRESS_STOP`, `INTRO`, `OUTRO`, `NOTE`, `CANCEL`, `LOG`, `STREAM`. The `payload` holds event-specific data (for example `level`, `message`, and optional `label` for `LOG`, plus `channel`, `chunk`, optional `label`, and stream options for `STREAM`). `cid` is optional for correlating streams.

## Runtime modes

Uppercase string values:

- `TUI`: native terminal prompts (depends on implementation and language).
- `JSON`: NDJSON protocol only over stdio.
- `AUTO`: automatic choice between interactive and non-interactive based on policy and environment.

Common environment signals in the reference implementation: `TYPR_TRANSPORT=JSON` forces `JSON`. `TYPR_TRANSPORT=AUTO` or `TYPR_MODE=AUTO` forces `AUTO`. `LEMON_TUI_MODE=AUTO` is still read for compatibility with older Lemon-based projects. Without these signals, behavior tends to `TUI` unless explicitly overridden in configuration.

The exact precedence order (environment variables versus API options) is defined by the implementation; the behavior above is the documented contract for cross-process compatibility.

## `AUTO` mode policy

Uppercase string values:

- `SAFE_DEFAULT`: use explicit defaults on prompts when present; without a safe default, the operation is cancelled in a typed way.
- `ALWAYS_YES`: confirmations tend to true and empty strings when no default exists.

Implementations in other languages should preserve these identifiers and this semantics.

## Reference implementation

The **`@even7hq/js`** npm package corresponds to the TypeScript and JavaScript entries above (interactive adapters, NDJSON transport, timeline parser, and related utilities). Interactive rendering is pluggable; the bundled **Clack** backend maps to [`@clack/prompts`](https://github.com/bombshell-dev/clack/tree/main/packages/prompts) and is not required for other language SDKs.

### Workspaces

| Package | Role |
| --- | --- |
| `@even7hq/js` | Library under `packages/js` |
| `@even7hq/docs` | Starlight site under `packages/docs` |

Install dependencies with [nayr](https://github.com/callmeteus/nayr) from this directory: `nayr install` (writes `nayr.lock`). Yarn Classic can still run workspace scripts, for example `yarn build` and `yarn docs:dev`.

### Migration from the `typr` package name

The library workspace is now **`@even7hq/js`** (folder `packages/js`). Update `package.json` dependencies and TypeScript imports from `typr` to `@even7hq/js` when you consume this monorepo or a published tarball under the new name.
