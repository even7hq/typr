---
title: Runtime modes
description: TUI, JSON, and AUTO modes plus Typr-prefixed environment variables.
---

Uppercase string values:

- `TUI`: native terminal prompts (depends on implementation and language).
- `JSON`: NDJSON protocol only over stdio.
- `AUTO`: automatic choice between interactive and non-interactive based on policy and environment.

Common environment signals in the reference implementation: `TYPR_TRANSPORT=JSON` forces `JSON`. `TYPR_TRANSPORT=AUTO` or `TYPR_MODE=AUTO` forces `AUTO`. `LEMON_TUI_MODE=AUTO` is still read for compatibility with older Lemon-based projects. Without these signals, behavior tends to `TUI` unless explicitly overridden in configuration.

The exact precedence order (environment variables versus API options) is defined by the implementation; the behavior above is the documented contract for cross-process compatibility.
