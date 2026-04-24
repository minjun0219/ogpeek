# syntax=docker/dockerfile:1.7
# Build from the monorepo root:
#   docker build -t ogpeek -f website/Dockerfile .
# Run:
#   docker run --rm -p 3000:3000 -e NEXT_PUBLIC_MODE=public ogpeek

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat \
  && corepack enable \
  && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY website/package.json ./website/
COPY packages/ogpeek/package.json ./packages/ogpeek/
RUN pnpm install --frozen-lockfile

FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app /app
COPY . .
RUN pnpm -F website build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S app && adduser -S app -G app

COPY --from=builder --chown=app:app /app/website/.next/standalone ./
COPY --from=builder --chown=app:app /app/website/.next/static ./website/.next/static
COPY --from=builder --chown=app:app /app/website/public ./website/public

USER app
EXPOSE 3000
CMD ["node", "website/server.js"]
