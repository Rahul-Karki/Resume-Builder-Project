# build stage
FROM node:20 AS builder

WORKDIR /app

COPY Backend/package*.json ./Backend/
COPY shared ./shared

RUN cd Backend && npm install

COPY Backend ./Backend

RUN cd Backend && npm run build


# runtime stage
FROM node:20

WORKDIR /app/Backend

COPY Backend/package*.json ./

RUN npm install --omit=dev

COPY --from=builder /app/Backend/dist ./dist

EXPOSE 5000

ENV NODE_OPTIONS="--require ./dist/Backend/src/instrumentation.js"

CMD ["node", "dist/Backend/src/server.js"]