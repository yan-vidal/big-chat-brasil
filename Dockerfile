FROM node:22-slim AS base

WORKDIR /workspace

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json angular.json postcss.config.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY packages packages
COPY apps apps

RUN pnpm build

FROM base AS api

EXPOSE 3000

CMD ["sh", "-c", "pnpm --filter @bcb/api db:migrate && pnpm --filter @bcb/api db:seed && pnpm --filter @bcb/api start"]

FROM base AS worker

CMD ["pnpm", "--filter", "@bcb/api", "start:worker"]

FROM base AS web

ENV WEB_HOST="0.0.0.0"

EXPOSE 4200

CMD ["node", "apps/web/e2e/static-server.mjs", "--port", "4200"]
