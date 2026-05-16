---
title: Pedidos RPC
description: Campos path e input para procedimentos do adaptador no modo NDJSON.
---

O campo `path` nomeia o procedimento com segmentos separados por ponto, por exemplo `adapter.text` ou `adapter.confirm`. O objeto opcional `input` leva argumentos serializáveis em JSON.

Caminhos de referência usados pelo **`@even7hq/js`**: `adapter.text`, `adapter.password`, `adapter.confirm`, `adapter.date`, `adapter.multiline`, `adapter.path`, `adapter.select`, `adapter.selectKey`, `adapter.multiselect`, `adapter.autocomplete`, `adapter.autocompleteMultiselect`, `adapter.groupMultiselect`, `adapter.tasks`. Prompts como `group`, que dependem de funções no cliente, não rodam em NDJSON. Autocomplete com `options` como função também é rejeitado em NDJSON e no modo AUTO.

Payloads devem ser serializáveis em JSON; em transporte JSON, validações do tipo `validate` ficam a cargo do hospedeiro.

`autoPolicy` opcional por chamada sobrepõe a política padrão do modo automático.
