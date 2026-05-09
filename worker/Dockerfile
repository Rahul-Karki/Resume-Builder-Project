# build stage
FROM node:20-slim AS builder

WORKDIR /app

COPY worker/package*.json ./worker/
COPY shared ./shared
COPY Backend ./Backend

RUN cd worker && npm install

COPY worker ./worker

RUN cd worker && npm run build

# runtime stage
FROM node:20-slim

WORKDIR /app/worker

RUN apt-get update && apt-get install -y \
    chromium \
    ca-certificates \
    fonts-liberation \
    fonts-noto-color-emoji \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libu2f-udev \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY worker/package*.json ./

RUN npm install --omit=dev

COPY --from=builder /app/worker/dist ./dist

CMD ["node", "dist/worker/src/index.js"]
