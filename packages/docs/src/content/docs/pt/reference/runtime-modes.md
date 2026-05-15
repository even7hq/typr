---
title: Modos de runtime
description: Modos TUI, JSON e AUTO e variáveis de ambiente com prefixo Typr.
---

Valores em string em maiúsculas:

- `TUI`: prompts nativos no terminal (dependente da implementação e da linguagem).
- `JSON`: apenas o protocolo NDJSON em stdio.
- `AUTO`: escolha automática entre interativo e não interativo conforme política e ambiente.

Sinais de ambiente usuais na implementação de referência: `TYPR_TRANSPORT=JSON` força `JSON`. `TYPR_TRANSPORT=AUTO` ou `TYPR_MODE=AUTO` força `AUTO`. `LEMON_TUI_MODE=AUTO` ainda é lido por compatibilidade com projetos Lemon antigos. Sem esses sinais, tende a `TUI` quando não há override explícito em configuração.

A ordem exata de precedência (variáveis versus opções de API) é definida pela implementação; o comportamento acima é o contrato documentado para compatibilidade entre processos.
