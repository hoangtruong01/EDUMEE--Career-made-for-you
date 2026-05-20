FROM node:20-bookworm-slim AS base

# Stage 1: Install all dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install && npm cache clean --force

# Stage 2: Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Install only production dependencies
FROM base AS production-deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Stage 4: Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/dist ./dist
COPY --from=production-deps /app/node_modules ./node_modules
COPY package*.json ./

USER nestjs

EXPOSE 3001

CMD ["node", "dist/src/main"]
