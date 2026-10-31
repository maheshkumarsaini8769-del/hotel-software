# Multi-stage production Dockerfile for SpiceHub Central Backend API
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package manifests
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY backend/package*.json ./backend/

# Install workspace dependencies
RUN npm ci

# Copy sources for shared-types and backend
COPY packages/shared-types ./packages/shared-types
COPY backend ./backend

# Build shared types then backend
RUN npm --workspace=@spicehub/shared-types run build
RUN npm --workspace=@spicehub/backend run build

# Stage 2: Lightweight Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=5000

# Copy root package.json for workspace resolution
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY backend/package*.json ./backend/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/backend/dist ./backend/dist

# Expose backend port
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

WORKDIR /app/backend

# Non-root user for security
USER node

CMD ["node", "dist/index.js"]
