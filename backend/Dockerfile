# Backend Dockerfile
# Builds the TypeScript backend and runs it on Node.js

FROM node:20-alpine AS builder
WORKDIR /app

# Install system dependencies required by Prisma (OpenSSL)
RUN apk add --no-cache openssl

# Install node dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source + Prisma schema
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma client (migrations are applied at container start)
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Runtime image
FROM node:20-alpine
WORKDIR /app

# Install runtime dependencies (libssl for Prisma engines)
RUN apk add --no-cache openssl

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000
ENV PORT=4000
ENV DATABASE_URL=file:./dev.db

# Apply pending migrations (creates the SQLite DB if needed) before starting
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
