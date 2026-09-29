# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:22.23.3-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c

FROM ${NODE_IMAGE} AS base

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.6.0 --activate

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build

COPY . .

ARG PUBLIC_FREE_WIN_API_URL=http://127.0.0.1:8000
ARG PUBLIC_FREE_WIN_SEARCH_URL=http://127.0.0.1:8001
ENV PUBLIC_FREE_WIN_API_URL=$PUBLIC_FREE_WIN_API_URL \
    PUBLIC_FREE_WIN_SEARCH_URL=$PUBLIC_FREE_WIN_SEARCH_URL

RUN pnpm build

FROM base AS production-dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM base AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1))"]

CMD ["node", "./dist/server/entry.mjs"]
