# Typr documentation site

[Astro](https://astro.build/) + [Starlight](https://starlight.astro.build/) site for the Typr protocol. Content lives in `src/content/docs/` (English, root locale) and `src/content/docs/pt/` (Portuguese).

## Commands

From the Typr monorepo root:

```bash
yarn docs:dev
yarn build:all
```

`yarn build:all` compiles **`@typr/js`** then builds this site (**`@typr/docs`**). Install dependencies with **nayr** at the monorepo root (`nayr install`) when using `nayr.lock`.

From this package:

```bash
yarn dev
yarn build
yarn preview
```

The dev server prints a local URL (commonly `http://localhost:4321`).

## Locales

- **English** (`root`): paths without prefix, for example `/protocol/transport/`.
- **Portuguese** (`pt-BR`): paths under `/pt/`, for example `/pt/protocol/transport/`.

## Updating content

Edit Markdown in `src/content/docs/`. Keep the same file paths under `pt/` for translated pages so Starlight can pair locales and apply fallbacks.

## Docker

Build and run the preview server inside Compose (no published ports by default):

```bash
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up
```

To reach the site from the host, either add a `ports` mapping temporarily or use another container on the same Compose network with `http://typr-docs:4321`.

Build the image only:

```bash
docker build -t typr-docs .
```
