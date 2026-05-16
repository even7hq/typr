---
title: Eventos
description: Frames de evento para logs, streams e elementos de sessão.
---

Notificações de terminal usam `type: "event"` com `path: "terminal.emit"`. O campo `name` fica em maiúsculas, por exemplo `SPINNER_START`, `SPINNER_MESSAGE`, `SPINNER_STOP`, `PROGRESS_START`, `PROGRESS_ADVANCE`, `PROGRESS_STOP`, `INTRO`, `OUTRO`, `NOTE`, `CANCEL`, `LOG`, `STREAM`. O `payload` carrega dados específicos do evento (por exemplo `level`, `message` e `label` opcional em `LOG`, além de `channel`, `chunk`, `label` opcional e opções de stream em `STREAM`). `cid` é opcional para correlacionar streams.
