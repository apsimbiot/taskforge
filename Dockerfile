# Builder stage — installs all deps and builds the app
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

# Build-time args for NEXT_PUBLIC_* vars (baked into the JS bundle)
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_MAIN_DOMAIN

# Force install ALL dependencies (dev + prod) regardless of NODE_ENV
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Make NEXT_PUBLIC_* available during build
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_MAIN_DOMAIN=${NEXT_PUBLIC_MAIN_DOMAIN}

# Generate Drizzle client
RUN npm run db:generate || true

# Build the production app
ENV NODE_ENV=production
RUN npm run build

# Production stage — minimal runtime image
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only what's needed to run
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
