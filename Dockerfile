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

# Migration stage — runs drizzle-kit push against the live DB
FROM builder AS migrator
# This stage is used via: docker compose run --rm migrator
CMD ["npx", "drizzle-kit", "push", "--force"]

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

# Copy drizzle config + migrations for runtime push
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/src/db ./src/db
COPY --from=builder /app/node_modules ./node_modules

# Startup script: run migrations then start app
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Running database migrations..."' >> /app/start.sh && \
    echo 'npx drizzle-kit push --force 2>&1 || echo "Migration warning (may be ok on first run)"' >> /app/start.sh && \
    echo 'echo "Starting app..."' >> /app/start.sh && \
    echo 'exec node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/start.sh"]
