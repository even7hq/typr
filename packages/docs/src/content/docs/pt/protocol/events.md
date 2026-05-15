---
title: Eventos
description: Nomes de EVENT e payloads para logs, streams e cromo de sessão.
---

Campo `event` em maiúsculas, por exemplo `SPINNER_START`, `SPINNER_MESSAGE`, `SPINNER_STOP`, `PROGRESS_START`, `PROGRESS_ADVANCE`, `PROGRESS_STOP`, `INTRO`, `OUTRO`, `NOTE`, `CANCEL`, `LOG`, `STREAM`. O `payload` carrega dados específicos do evento (por exemplo `level`, `message` e `label` opcional em `LOG`, além de `channel`, `chunk`, `label` opcional e opções de stream em `STREAM`).
