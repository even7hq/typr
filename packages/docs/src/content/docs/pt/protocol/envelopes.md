---
title: Tipos de envelope
description: Valores de `kind` REQUEST, RESPONSE, EVENT e ERROR na rede.
---

Valores em string em maiúsculas para `kind`:

| Valor | Uso |
| --- | --- |
| `REQUEST` | Pedido que exige resposta do hospedeiro. |
| `RESPONSE` | Resposta ao pedido com o mesmo `correlationId`. |
| `EVENT` | Notificação unilateral (spinner, progresso, log, intro, outro, etc.). |
| `ERROR` | Falha estruturada com `code`, `message` e `payload` opcional. |

Campos comuns sugeridos: `timestamp` em ISO 8601 e `correlationId` quando aplicável.
