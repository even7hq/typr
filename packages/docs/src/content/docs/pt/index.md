---
title: Introdução
description: O Typr é um protocolo de interação para CLIs em terminal com NDJSON e backends de UI plugáveis.
---

O Typr é um protocolo para prompts, feedback de progresso e logs em CLIs usando NDJSON em stdin e stdout, com modos de execução que alternam entre terminal interativo e automação.

## Objetivo

Permitir que a mesma aplicação rode com UI rica quando há TTY e, sem mudar a lógica de negócio, opere em modo máquina quando o processo é orquestrado por scripts, CI ou outro processo pai que fale o protocolo.

## Linguagens suportadas

- **TypeScript** (Node.js): implementação de referência publicada como **`@typr/js`** no npm (workspace `packages/js`).
- **JavaScript** (Node.js): o mesmo pacote; artefatos conforme o `package.json` do pacote.

Outras linguagens podem implementar só o protocolo NDJSON abaixo; quando houver SDK oficial neste repositório, será listado aqui.

## Este site

Estas páginas espelham o README do repositório Typr e serão expandidas com o tempo. O texto canônico do protocolo continua em `README.md` e `README.pt.md` na raiz do repositório.
