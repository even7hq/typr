---
title: Resposta e erro
description: Como o hospedeiro responde a pedidos Typr em NDJSON.
---

Em caso de sucesso, o hospedeiro envia `type: "response"` com o mesmo `id` do `request` correspondente. O resultado do procedimento fica em `result` (tipo conforme o `path`).

Em caso de falha, o hospedeiro envia `type: "error"` com o mesmo `id` e um objeto `error` estruturado: `code`, `message` e `data` opcional.
