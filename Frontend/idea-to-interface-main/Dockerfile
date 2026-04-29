# Frontend Dockerfile (Vite + static nginx server)

FROM node:20-alpine AS builder
WORKDIR /app

# Allow overriding API URL at build time
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Production image
FROM nginx:alpine

# Copy built static assets
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback (serve index.html for unknown routes)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
