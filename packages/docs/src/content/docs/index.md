---
title: Introduction
description: Typr is an interaction protocol for terminal CLIs using NDJSON and pluggable UI backends.
---

Typr is a protocol for prompts, progress feedback, and logs in CLIs using NDJSON over stdin and stdout, with runtime modes that switch between interactive terminal use and automation.

## Goal

Let the same app use a rich UI when a TTY is present while, without changing business logic, running in machine mode when the process is driven by scripts, CI, or another parent process that speaks the protocol.

## Supported languages

- **TypeScript** (Node.js): reference implementation published as the **`@even7hq/js`** npm package (workspace `packages/js`).
- **JavaScript** (Node.js): same package; artifacts as declared in the package `package.json`.

Other languages may implement the NDJSON protocol below only; when an official SDK lives in this repository, it will be listed here.

## This site

These pages mirror the Typr repository README and expand them over time. The canonical protocol text also lives in the repo root `README.md` and `README.pt.md`.
