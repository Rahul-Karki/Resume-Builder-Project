# build stage
FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


# runtime stage
FROM node:20

WORKDIR /app

# Install Chromium dependencies required by Puppeteer
RUN apt-get update && apt-get install -y \
    libnss3 \
    libdbus-1-3 \
    libgconf-2-4 \
    libx11-6 \
    libxcb1 \
    libxext6 \
    libxrandr2 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    fonts-liberation \
    libappindicator1 \
    libgbm1 \
    libxss1 \
    ca-certificates \
    fonts-noto-color-emoji \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 5000

ENV NODE_OPTIONS="--require ./dist/instrumentation.js"

CMD ["node", "dist/server.js"]