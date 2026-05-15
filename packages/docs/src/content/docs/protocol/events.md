---
title: Events
description: EVENT names and payloads for logs, streams, and session chrome.
---

The `event` field is uppercase, for example `SPINNER_START`, `SPINNER_MESSAGE`, `SPINNER_STOP`, `PROGRESS_START`, `PROGRESS_ADVANCE`, `PROGRESS_STOP`, `INTRO`, `OUTRO`, `NOTE`, `CANCEL`, `LOG`, `STREAM`. The `payload` holds event-specific data (for example `level`, `message`, and optional `label` for `LOG`, plus `channel`, `chunk`, optional `label`, and stream options for `STREAM`).
