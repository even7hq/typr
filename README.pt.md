# Typr

**Protocolo de interação feito para humanos e terminais.**

> English: [README.md](./README.md)

O Typr é um protocolo para prompts, feedback de progresso e logs em CLIs usando NDJSON em stdin e stdout, com modos de execução que alternam entre terminal interativo e automação.

## Objetivo

Permitir que a mesma aplicação rode com UI rica quando há TTY e, sem mudar a lógica de negócio, opere em modo máquina quando o processo é orquestrado por scripts, CI ou outro processo pai que fale o protocolo.

## Linguagens suportadas

- **TypeScript** (Node.js): implementação de referência publicada como `typr` no npm.
- **JavaScript** (Node.js): o mesmo pacote; artefatos conforme o `package.json` do pacote.

Outras linguagens podem implementar só o protocolo NDJSON abaixo; quando houver SDK oficial neste repositório, será listado aqui.

## Site de documentação

Um site [Astro](https://astro.build/) + [Starlight](https://starlight.astro.build/) vive em [`packages/docs/`](./packages/docs/). Na raiz do repositório execute `yarn docs:dev` para trabalhar nele localmente.

## Transporte

- Uma linha por mensagem, UTF-8, um objeto JSON por linha (NDJSON).
- Em modo JSON, o processo CLI escreve envelopes no stdout e lê envelopes no stdin.
- Recomenda-se `correlationId` em toda requisição que espere resposta, para emparelhar com a linha de retorno.

## Tipos de envelope (`kind`)

Valores em string em maiúsculas:

| Valor | Uso |
| --- | --- |
| `REQUEST` | Pedido que exige resposta do hospedeiro. |
| `RESPONSE` | Resposta ao pedido com o mesmo `correlationId`. |
| `EVENT` | Notificação unilateral (spinner, progresso, log, intro, outro, etc.). |
| `ERROR` | Falha estruturada com `code`, `message` e `payload` opcional. |

Campos comuns sugeridos: `timestamp` em ISO 8601 e `correlationId` quando aplicável.

## `REQUEST` de prompt

O campo `promptType` identifica o tipo de prompt. O corpo útil fica em `payload` (objeto). Tipos usados pela implementação JS de referência incluem: `TEXT`, `PASSWORD`, `CONFIRM`, `DATE`, `MULTILINE`, `PATH`, `SELECT`, `SELECT_KEY`, `MULTISELECT`, `AUTOCOMPLETE`, `AUTOCOMPLETE_MULTISELECT`, `GROUP_MULTISELECT`, `TASKS`. Prompts como `GROUP`, que dependem de funções no cliente, não são suportados em NDJSON. Autocomplete com `options` como função também é rejeitado em NDJSON e no modo AUTO.

Payloads devem ser serializáveis em JSON; em transporte JSON, validações do tipo `validate` ficam a cargo do hospedeiro.

`autoPolicy` opcional por chamada sobrepõe a política padrão do modo automático.

## `RESPONSE`

Deve repetir o mesmo `correlationId` do `REQUEST` correspondente. O resultado do prompt fica em `value` (tipo conforme o prompt).

## `EVENT`

Campo `event` em maiúsculas, por exemplo `SPINNER_START`, `SPINNER_MESSAGE`, `SPINNER_STOP`, `PROGRESS_START`, `PROGRESS_ADVANCE`, `PROGRESS_STOP`, `INTRO`, `OUTRO`, `NOTE`, `CANCEL`, `LOG`, `STREAM`. O `payload` carrega dados específicos do evento (por exemplo `level`, `message` e `label` opcional em `LOG`, além de `channel`, `chunk`, `label` opcional e opções de stream em `STREAM`).

## Modos de runtime

Valores em string em maiúsculas:

- `TUI`: prompts nativos no terminal (dependente da implementação e da linguagem).
- `JSON`: apenas o protocolo NDJSON em stdio.
- `AUTO`: escolha automática entre interativo e não interativo conforme política e ambiente.

Sinais de ambiente usuais na implementação de referência: `TYPR_TRANSPORT=JSON` força `JSON`. `TYPR_TRANSPORT=AUTO` ou `TYPR_MODE=AUTO` força `AUTO`. `LEMON_TUI_MODE=AUTO` ainda é lido por compatibilidade com projetos Lemon antigos. Sem esses sinais, tende a `TUI` quando não há override explícito em configuração.

A ordem exata de precedência (variáveis versus opções de API) é definida pela implementação; o comportamento acima é o contrato documentado para compatibilidade entre processos.

## Política em modo `AUTO`

Valores em string em maiúsculas:

- `SAFE_DEFAULT`: usa valores padrão explícitos nos prompts quando existirem; sem padrão seguro, a operação é cancelada de forma tipada.
- `ALWAYS_YES`: confirmações tendem a verdadeiro e textos vazios quando não houver padrão.

Implementações em outras linguagens devem preservar estes identificadores e esta semântica.

## Implementação de referência

O pacote npm `typr` corresponde às entradas TypeScript e JavaScript acima (adaptadores interativos, transporte NDJSON, parser de timeline e utilitários relacionados). A renderização interativa é plugável; o backend **Clack** empacotado mapeia para [`@clack/prompts`](https://github.com/bombshell-dev/clack/tree/main/packages/prompts) e não é obrigatório para SDKs noutras linguagens.
