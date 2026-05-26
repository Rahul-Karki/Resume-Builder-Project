# ========================
# Stage 1: Build
# ========================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL
ARG VITE_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_BASE_URL=$VITE_BASE_URL
RUN npm run build

# ========================
# Stage 2: Serve with Nginx
# ========================
FROM nginx:alpine

ARG NODE_ENV=production

# Copy built static files to nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy appropriate nginx config based on environment
# Use development config for local development, production for prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx.conf.dev /etc/nginx/conf.d/dev.conf
RUN if [ "$NODE_ENV" = "development" ]; then cp /etc/nginx/conf.d/dev.conf /etc/nginx/conf.d/default.conf; fi && rm -f /etc/nginx/conf.d/dev.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]