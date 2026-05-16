# Typr

**Protocolo de interação feito para humanos e terminais.**

> English: [README.md](./README.md)

O Typr é um protocolo para prompts, feedback de progresso e logs em CLIs usando NDJSON em stdin e stdout, com modos de execução que alternam entre terminal interativo e automação.

## Objetivo

Permitir que a mesma aplicação rode com UI rica quando há TTY e, sem mudar a lógica de negócio, opere em modo máquina quando o processo é orquestrado por scripts, CI ou outro processo pai que fale o protocolo.

## Linguagens suportadas

- **TypeScript** (Node.js): implementação de referência publicada como **`@even7hq/js`** no npm (workspace `packages/js`).
- **JavaScript** (Node.js): o mesmo pacote; artefatos conforme o `package.json` do pacote.

Outras linguagens podem implementar só o protocolo NDJSON abaixo; quando houver SDK oficial neste repositório, será listado aqui.

## Site de documentação

Um site [Astro](https://astro.build/) + [Starlight](https://starlight.astro.build/) vive em [`packages/docs/`](./packages/docs/). Na raiz do repositório execute `yarn docs:dev` para trabalhar nele localmente.

## Transporte

- Uma linha por mensagem, UTF-8, um objeto JSON por linha (NDJSON).
- Em modo JSON, o processo CLI escreve frames no stdout e lê frames no stdin.
- Todo frame traz `typr: 1` e `ts` (ISO 8601) para o parser rejeitar versões desconhecidas do protocolo.
- Emparelhe chamadas RPC com respostas usando o mesmo `id` em `request`, `response` e `error`.

## Tipos de frame (`type`)

Discriminante em string minúscula:

| Valor | Direção típica | Uso |
| --- | --- | --- |
| `request` | CLI para o hospedeiro | Chamada RPC com `id`, `path` e `input` opcional. |
| `response` | Hospedeiro para o CLI | Sucesso para o mesmo `id` com `result` opcional. |
| `error` | Hospedeiro para o CLI | Falha para o mesmo `id` com `error` estruturado (`code`, `message`, `data` opcional). |
| `event` | CLI para o hospedeiro | Notificação unilateral (spinner, progresso, log, intro, outro, etc.). |

## RPC `request`

O campo `path` nomeia o procedimento com segmentos separados por ponto, por exemplo `adapter.text` ou `adapter.confirm`. O objeto opcional `input` leva argumentos serializáveis em JSON (o mesmo formato que a implementação de referência antigamente colocava em `payload`).

Caminhos de referência usados pelo **`@even7hq/js`**: `adapter.text`, `adapter.password`, `adapter.confirm`, `adapter.date`, `adapter.multiline`, `adapter.path`, `adapter.select`, `adapter.selectKey`, `adapter.multiselect`, `adapter.autocomplete`, `adapter.autocompleteMultiselect`, `adapter.groupMultiselect`, `adapter.tasks`. Prompts como `group`, que dependem de funções no cliente, não rodam em NDJSON. Autocomplete com `options` como função também é rejeitado em NDJSON e no modo AUTO.

Payloads devem ser serializáveis em JSON; em transporte JSON, validações do tipo `validate` ficam a cargo do hospedeiro.

`autoPolicy` opcional por chamada sobrepõe a política padrão do modo automático.

## `response`

Repete o mesmo `id` do `request` correspondente. O resultado do procedimento fica em `result` (tipo conforme o `path`).

## `error`

Repete o mesmo `id` do `request` correspondente. O hospedeiro envia `error.code`, `error.message` e `error.data` opcional.

## `event`

Notificações de terminal usam `path: "terminal.emit"`, `name` em maiúsculas, por exemplo `SPINNER_START`, `SPINNER_MESSAGE`, `SPINNER_STOP`, `PROGRESS_START`, `PROGRESS_ADVANCE`, `PROGRESS_STOP`, `INTRO`, `OUTRO`, `NOTE`, `CANCEL`, `LOG`, `STREAM`. O `payload` carrega dados específicos do evento (por exemplo `level`, `message` e `label` opcional em `LOG`, além de `channel`, `chunk`, `label` opcional e opções de stream em `STREAM`). `cid` é opcional para correlacionar streams.

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

O pacote npm **`@even7hq/js`** corresponde às entradas TypeScript e JavaScript acima (adaptadores interativos, transporte NDJSON, parser de timeline e utilitários relacionados). A renderização interativa é plugável; o backend **Clack** empacotado mapeia para [`@clack/prompts`](https://github.com/bombshell-dev/clack/tree/main/packages/prompts) e não é obrigatório para SDKs noutras linguagens.

### Workspaces

| Pacote | Função |
| --- | --- |
| `@even7hq/js` | Biblioteca em `packages/js` |
| `@even7hq/docs` | Site Starlight em `packages/docs` |

Instale dependências com [nayr](https://github.com/callmeteus/nayr) neste diretório: `nayr install` (gera `nayr.lock`). O Yarn Classic ainda pode correr scripts de workspace, por exemplo `yarn build` e `yarn docs:dev`.

### Migração a partir do nome de pacote `typr`

O workspace da biblioteca passou a ser **`@even7hq/js`** (pasta `packages/js`). Atualize dependências em `package.json` e imports em TypeScript de `typr` para `@even7hq/js` quando consumir este monorepo ou um tarball publicado com o novo nome.
