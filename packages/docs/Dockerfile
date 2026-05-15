# Dockerfile for Astro Starlight docs (production build + preview server).
# Aligned with luckymaker-admin/docs/Dockerfile: Node Alpine, install, build, preview.

FROM node:25-alpine

WORKDIR /app

RUN corepack enable

COPY package.json ./

RUN yarn install

COPY . .

RUN yarn build

# Default Astro preview port (not published by docker-compose here; use same-network proxy or `docker run -p` if needed).
EXPOSE 4321

CMD ["yarn", "preview", "--host", "0.0.0.0", "--port", "4321"]
