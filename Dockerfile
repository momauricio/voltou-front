# deps
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# build
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Baked at build time for the browser
ARG NEXT_PUBLIC_API_URL=https://api.voltouapp.com
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG API_PROXY_TARGET=
ENV API_PROXY_TARGET=$API_PROXY_TARGET

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# runtime
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
