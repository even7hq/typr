---
title: Transporte
description: Enquadramento NDJSON, stdio e identificadores Typr v1.
---

- Uma linha por mensagem, UTF-8, um objeto JSON por linha (NDJSON).
- Em modo JSON, o processo CLI escreve frames no stdout e lê frames no stdin.
- Todo frame traz `typr: 1` e `ts` (ISO 8601) para o parser rejeitar versões desconhecidas do protocolo.
- Use o mesmo `id` em `request`, `response` e `error` para emparelhar chamadas RPC com as respostas do hospedeiro.
