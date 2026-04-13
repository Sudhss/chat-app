# ── Build stage ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --frozen-lockfile

COPY . .
RUN npx prisma generate
RUN npm run build

# ── Production stage ───────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Only production deps
COPY package*.json ./
RUN npm ci --frozen-lockfile --omit=dev

COPY --from=builder /app/dist        ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

# Migrations on startup
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
