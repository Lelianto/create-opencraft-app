# syntax=docker/dockerfile:1

# Multi-stage build for a Next.js "standalone" output (next.config.ts sets
# `output: "standalone"`). The runtime stage ships only the traced server files,
# reducing image size and attack surface. Based on the official
# next.js/examples/with-docker pattern, adapted for pnpm workspaces.

ARG NODE_VERSION=24-slim

# --- dependencies: install with a frozen lockfile for reproducibility ---
FROM node:${NODE_VERSION} AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc* ./
RUN corepack enable pnpm \
  && pnpm install --frozen-lockfile

# --- builder: compile the standalone output ---
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm \
  && pnpm run build

# --- runner: only what `next build` traced as needed at runtime ---
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /app/.next \
  && chown -R nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
