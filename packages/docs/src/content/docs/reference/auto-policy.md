---
title: AUTO policy
description: Policies used when the runtime mode is AUTO.
---

Uppercase string values:

- `SAFE_DEFAULT`: use explicit defaults on prompts when present; without a safe default, the operation is cancelled in a typed way.
- `ALWAYS_YES`: confirmations tend to true and empty strings when no default exists.

Implementations in other languages should preserve these identifiers and this semantics.
