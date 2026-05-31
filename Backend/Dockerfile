# =============================================================================
# Stage 1: Install production dependencies + download Chromium
# =============================================================================
FROM node:20-slim AS deps

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

COPY Backend/package*.json ./
COPY shared ./shared

# Install production deps, then download Chromium via Puppeteer's postinstall
RUN npm ci --omit=dev && npx puppeteer browsers install chrome && npm cache clean --force

# =============================================================================
# Stage 2: Build TypeScript
# =============================================================================
FROM node:20-slim AS builder

WORKDIR /app

COPY Backend/package*.json ./Backend/
COPY shared ./shared
RUN cd Backend && npm ci

COPY Backend/tsconfig.json ./Backend/
COPY Backend/src ./Backend/src
COPY shared ./shared

RUN cd Backend && npx tsc

# =============================================================================
# Stage 3: Runtime image
# =============================================================================
FROM node:20-slim AS runner

RUN groupadd --gid 1001 appuser && \
    useradd --uid 1001 --gid appuser --shell /bin/bash --create-home appuser

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libnss3 \
    libnspr4 \
    libatk1.0-0t64 \
    libatk-bridge2.0-0t64 \
    libcups2t64 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2t64 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/Backend

ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.cache/puppeteer /app/.cache/puppeteer

COPY --from=builder /app/Backend/dist ./dist

COPY Backend/package*.json ./

RUN mkdir -p /app/.cache/puppeteer /tmp && \
    chown -R appuser:appuser /app

USER appuser

ENV NODE_ENV=production \
    PORT=5000

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

CMD ["node", "dist/Backend/src/server.js"]
