---
title: Pedidos de prompt
description: Valores de promptType e payloads serializáveis em JSON no modo NDJSON.
---

O campo `promptType` identifica o tipo de prompt. O corpo útil fica em `payload` (objeto). Tipos usados pela implementação JS de referência incluem: `TEXT`, `PASSWORD`, `CONFIRM`, `DATE`, `MULTILINE`, `PATH`, `SELECT`, `SELECT_KEY`, `MULTISELECT`, `AUTOCOMPLETE`, `AUTOCOMPLETE_MULTISELECT`, `GROUP_MULTISELECT`, `TASKS`. Prompts como `GROUP`, que dependem de funções no cliente, não são suportados em NDJSON. Autocomplete com `options` como função também é rejeitado em NDJSON e no modo AUTO.

Payloads devem ser serializáveis em JSON; em transporte JSON, validações do tipo `validate` ficam a cargo do hospedeiro.

`autoPolicy` opcional por chamada sobrepõe a política padrão do modo automático.
