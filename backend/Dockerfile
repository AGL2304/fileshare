FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init openssl libc6-compat

# ── Builder ─────────────────────────────────────────────────────────────
FROM base AS builder
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Runner ──────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/uploads && \
    chmod +x /usr/local/bin/docker-entrypoint.sh && \
    addgroup -g 1001 -S nodejs && \
    adduser -u 1001 -S app -G nodejs && \
    chown -R app:nodejs /app

USER app

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["/usr/local/bin/docker-entrypoint.sh"]
