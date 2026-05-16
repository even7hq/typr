---
title: Tipos de frame no wire
description: Frames NDJSON Typr v1 usam type, versão typr e ts em cada linha.
---

Cada linha é um objeto JSON. Todos os frames incluem:

- `typr`: deve ser `1` neste contrato.
- `type`: discriminante em minúsculas (`request`, `response`, `error` ou `event`).
- `ts`: carimbo de data/hora em ISO 8601.

| Valor | Direção típica | Uso |
| --- | --- | --- |
| `request` | CLI para o hospedeiro | Chamada RPC com `id`, `path` e `input` opcional. |
| `response` | Hospedeiro para o CLI | Sucesso para o mesmo `id` com `result` opcional. |
| `error` | Hospedeiro para o CLI | Falha para o mesmo `id` com `error` (`code`, `message`, `data` opcional). |
| `event` | CLI para o hospedeiro | Notificação unilateral (ver Eventos). |

Emparelhe chamadas RPC com o resultado usando o mesmo `id` em `request`, `response` e `error`.
