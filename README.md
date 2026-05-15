# Typr

**Interaction protocol built for humans and terminals.**

> Portuguese: [README.pt.md](./README.pt.md)

Typr is a protocol for prompts, progress feedback, and logs in CLIs using NDJSON over stdin and stdout, with runtime modes that switch between interactive terminal use and automation.

## Goal

Let the same app use a rich UI when a TTY is present while, without changing business logic, running in machine mode when the process is driven by scripts, CI, or another parent process that speaks the protocol.

## Supported languages

- **TypeScript** (Node.js): reference implementation published as the `typr` npm package.
- **JavaScript** (Node.js): same package; artifacts as declared in the package `package.json`.

Other languages may implement the NDJSON protocol below only; when an official SDK lives in this repository, it will be listed here.

## Documentation site

An [Astro](https://astro.build/) + [Starlight](https://starlight.astro.build/) site lives in [`packages/docs/`](./packages/docs/). From the repo root run `yarn docs:dev` to work on it locally.

## Transport

- One message per line, UTF-8, one JSON object per line (NDJSON).
- In JSON mode, the CLI process writes envelopes to stdout and reads envelopes from stdin.
- Use `correlationId` on every request that expects a response so it can be paired with the return line.

## Envelope kinds (`kind`)

Uppercase string values:

| Value | Meaning |
| --- | --- |
| `REQUEST` | Request that requires a host response. |
| `RESPONSE` | Response to the request sharing the same `correlationId`. |
| `EVENT` | One-way notification (spinner, progress, log, intro, outro, etc.). |
| `ERROR` | Structured failure with `code`, `message`, and optional `payload`. |

Suggested common fields: `timestamp` in ISO 8601 and `correlationId` when applicable.

## Prompt `REQUEST`

The `promptType` field identifies the prompt kind. The body lives in `payload` (object). Wire-friendly types used by the reference JS implementation include: `TEXT`, `PASSWORD`, `CONFIRM`, `DATE`, `MULTILINE`, `PATH`, `SELECT`, `SELECT_KEY`, `MULTISELECT`, `AUTOCOMPLETE`, `AUTOCOMPLETE_MULTISELECT`, `GROUP_MULTISELECT`, `TASKS`. Callback-driven prompts such as `GROUP` cannot be serialized over NDJSON and are rejected by the JSON transport. Dynamic autocomplete option suppliers (`options` as a function) are also rejected over NDJSON and in AUTO mode.

Payloads must be JSON-serializable; when using JSON transport, host-side validation replaces callback fields such as `validate`.

Optional per-call `autoPolicy` overrides the default policy for automatic mode.

## `RESPONSE`

It must repeat the same `correlationId` as the matching `REQUEST`. The prompt result is in `value` (type depends on the prompt).

## `EVENT`

The `event` field is uppercase, for example `SPINNER_START`, `SPINNER_MESSAGE`, `SPINNER_STOP`, `PROGRESS_START`, `PROGRESS_ADVANCE`, `PROGRESS_STOP`, `INTRO`, `OUTRO`, `NOTE`, `CANCEL`, `LOG`, `STREAM`. The `payload` holds event-specific data (for example `level`, `message`, and optional `label` for `LOG`, plus `channel`, `chunk`, optional `label`, and stream options for `STREAM`).

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

The `typr` npm package corresponds to the TypeScript and JavaScript entries above (interactive adapters, NDJSON transport, timeline parser, and related utilities). Interactive rendering is pluggable; the bundled **Clack** backend maps to [`@clack/prompts`](https://github.com/bombshell-dev/clack/tree/main/packages/prompts) and is not required for other language SDKs.
