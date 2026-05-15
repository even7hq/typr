---
title: Transporte
description: Enquadramento NDJSON, stdio e identificadores de correlação.
---

- Uma linha por mensagem, UTF-8, um objeto JSON por linha (NDJSON).
- Em modo JSON, o processo CLI escreve envelopes no stdout e lê envelopes no stdin.
- Recomenda-se `correlationId` em toda requisição que espere resposta, para emparelhar com a linha de retorno.
