FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/website/package.json ./apps/website/
COPY packages/shared/package.json ./packages/shared/
COPY packages/core/package.json ./packages/core/
# `apps/mobile` nunca é compilado aqui, mas o `yarn install --immutable`
# recusa um lockfile cujo workspace não está presente: sem este manifesto
# ele tenta buscar `@app/core` no registro público e o build morre.
COPY apps/mobile/package.json ./apps/mobile/
COPY tools/ai-cli/package.json ./tools/ai-cli/
RUN corepack prepare --activate && yarn install --immutable

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
# O `next` não hoista para a raiz: o `apps/mobile` fixa React 19 e os dois
# apps Next fixam React 18, então cada um fica com a própria cópia aninhada.
# Sem esta linha o build morre em `Cannot find module
# '/app/apps/frontend/node_modules/next/dist/bin/next'` — foi o que aconteceu
# quando o app entrou no monorepo, e só apareceu ao tentar subir a stack.
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/.yarnrc.yml ./.yarnrc.yml
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BASE_DOMAIN
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Empty in dev (path-mode); `pulso.center` in prod (subdomain-mode). Build-time only.
ENV NEXT_PUBLIC_BASE_DOMAIN=$NEXT_PUBLIC_BASE_DOMAIN
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack prepare --activate && yarn workspace @app/frontend build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder --chown=node:node /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder --chown=node:node /app/apps/frontend/public ./apps/frontend/public
USER node
EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]
