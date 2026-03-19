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

# Generate Prisma client and push schema (creates SQLite DB if needed)
RUN npx prisma generate
RUN npx prisma db push

# Build TypeScript
RUN npm run build

# Runtime image
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000
ENV PORT=4000

CMD ["node", "dist/index.js"]
