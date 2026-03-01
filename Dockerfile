# Development stage
FROM node:20-alpine AS development
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=development

# Install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Generate Prisma/Drizzle client (if needed)
RUN npm run db:generate || true

EXPOSE 3000
CMD ["npm", "run", "dev"]

# Builder stage
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

# Install ALL dependencies (including devDeps like TypeScript)
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Generate Prisma/Drizzle client
RUN npm run db:generate || true

# Build the application
ENV NODE_ENV=production
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./
# Only copy .env (not .env.local which has dev overrides)
COPY --from=builder /app/.env ./

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
