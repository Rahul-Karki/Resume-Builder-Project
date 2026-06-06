# Production Deployment Guide

## Architecture Overview

```
Internet → [Nginx (Port 80/443)] → /api/* → [Backend API (Port 5000)]
                                    → /*    → [React SPA (static)]
                                                    ↓
                                    [MongoDB 7]  [Redis 7]  [Chrome/Puppeteer]
```

**Services:**
| Service | Container | Port | Persistence | Scaling |
|---------|-----------|------|-------------|---------|
| Backend API | Node 20 (Express) | 5000 | Stateless | 1-4 replicas |
| Frontend | Nginx 1.27 | 80 | Stateless | CDN cache |
| MongoDB 7 | mongo:7.0 | 27017 | Volume | 1 replica |
| Redis 7 | redis:7-alpine | 6379 | Volume/AOF | 1 replica |

## Prerequisites

### Required Tools
- Docker Desktop 4.x+ or Docker Engine 24+
- Docker Compose v2.20+
- At least 2GB free RAM for all services
- Ports 80, 443 available (or use different ports behind reverse proxy)

### Environment Files

Create `.env.production` in project root (DO NOT commit):

```bash
# Required
MONGO_URI=mongodb://mongo:27017/resume_builder_prod
FRONTEND_URL=https://yourdomain.com
FRONTEND_URLS=https://yourdomain.com,https://www.yourdomain.com
JWT_ACCESS_SECRET=<64 hex chars>
JWT_REFRESH_SECRET=<64 hex chars>
GOOGLE_CLIENT_ID=<your-google-client-id>

# Email (choose one provider)
EMAIL_PROVIDER=brevo
BREVO_API_KEY=<your-brevo-api-key>
BREVO_FROM=noreply@yourdomain.com

# AI (at least one provider)
AI_PROVIDER=gemini
GEMINI_API_KEY=<your-gemini-api-key>

# Optional: Redis (uses in-memory fallback if not set)
REDIS_URL=redis://redis:6379/0

# Optional: Observability
GRAFANA_API_TOKEN=<token>
OTEL_INSTANCE_ID=<id>
```

Generate JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deployment Options

### 1. VPS / Dedicated Server (Recommended)

**Best for:** Full control, no vendor lock-in, predictable costs

```bash
# 1. Clone on server
git clone <repo> /opt/resume-builder
cd /opt/resume-builder

# 2. Create .env.production
cp Backend/.env.example .env.production
nano .env.production

# 3. Start all services
docker compose -f docker-compose.prod.yml up -d

# 4. Set up reverse proxy (Caddy handles SSL automatically)
```

**With reverse proxy (recommended):**
```nginx
# Example Nginx reverse proxy — create nginx.conf and mount it
# docker run -d --name nginx-proxy \
#   -p 80:80 -p 443:443 \
#   -v $PWD/nginx.conf:/etc/nginx/conf.d/default.conf \
#   nginx:alpine
```

**Resource requirements:**
- Min: 1 vCPU, 1.5GB RAM
- Recommended: 2 vCPU, 3GB RAM
- Storage: 5GB for images + 10GB for MongoDB data

### 2. Railway

**Best for:** Quick deployment, free tier available

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and init
railway login
railway init

# Deploy
railway up
```

**railway.json:**
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Backend/Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": true,
    "restartPolicyType": "ALWAYS"
  }
}
```

**Limitations:**
- Free tier: $5 credit, sleeps after inactivity
- No MongoDB service — use MongoDB Atlas free tier
- No Redis — set `USE_MEMORY_ONLY_CACHE=true`
- Puppeteer may need extra config: set `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`

### 3. Render

**Best for:** Simple deployment, generous free tier

- Backend: Use Docker runtime (select "Docker" as runtime)
- Frontend: Use "Static Site" or Docker
- Add MongoDB Atlas (free tier) + Upstash Redis (free tier)

**Render Blueprint (render.yaml):**
```yaml
services:
  - type: web
    name: resume-api
    env: docker
    dockerfilePath: Backend/Dockerfile
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGO_URI
        fromDatabase:
          name: resume-db
          property: connectionString

databases:
  - name: resume-db
    databaseName: resume
    plan: free
```

**Important:** Render does NOT support Docker Compose. Deploy each service separately.

### 4. Coolify

**Best for:** Self-hosted PaaS, Docker Compose native

Coolify natively supports docker-compose.yml. Just connect your Git repo and it auto-deploys.

```bash
# 1. Add your server to Coolify
# 2. Create a new "Docker Compose" resource
# 3. Point to git repo
# 4. Coolify auto-detects docker-compose.prod.yml
```

### 5. AWS EC2

```bash
# Launch Ubuntu 22.04 (t3.medium minimum)
# Install Docker + Compose
sudo apt update
sudo apt install docker.io docker-compose-v2 -y

# Clone and deploy
git clone <repo> /opt/resume-builder
cd /opt/resume-builder
docker compose -f docker-compose.prod.yml up -d

# Set up EC2 security group:
# - HTTP (80): 0.0.0.0/0
# - HTTPS (443): 0.0.0.0/0
# - SSH (22): your-ip
```

**Cheapest EC2:** t3a.nano (~$4/mo) — too small, will OOM.
**Minimum viable:** t3a.small (~$16/mo) — 2 vCPU, 2GB RAM.

### 6. Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch
fly launch --image ghcr.io/your-org/resume-builder-backend:latest
fly scale memory 1024
fly deploy
```

**fly.toml for backend:**
```toml
app = "resume-api"
primary_region = "ams"

[build]
  image = "ghcr.io/your-org/resume-builder-backend:latest"

[[services]]
  internal_port = 5000
  protocol = "tcp"
  [services.concurrency]
    hard_limit = 25
    soft_limit = 10
```

## Cost Optimization

| Provider | Cheapest/mo | Best For | Limitation |
|----------|-------------|----------|------------|
| **Render** | $0 (free) | Prototype | 512MB RAM, sleeps |
| **Railway** | $0 (free) | Prototype | $5 credit, sleeps |
| **Coolify** | ~$6 VPS | Self-hosted production | Need VPS |
| **VPS (Hetzner)** | ~$4/mo | Production | 2 vCPU, 2GB RAM |
| **Fly.io** | ~$2/mo | Global edge | 256MB RAM shared |
| **AWS EC2** | ~$16/mo | Enterprise | t3a.small minimum |

**Cheapest production setup:**
1. VPS from Hetzner (~$4-6/mo): 2 vCPU, 2GB RAM
2. Run with docker-compose
3. MongoDB: use internal container (no Atlas costs)
4. Redis: use internal container (no Upstash costs)
5. Email: Brevo free tier (300/day)
6. AI: Gemini free tier (60 req/min)
7. Monitoring: Grafana free tier (50GB logs)

## Environment Variable Setup

### Required Variables (no defaults)
```bash
MONGO_URI=mongodb://mongo:27017/resume_builder_prod
FRONTEND_URL=https://yourdomain.com
JWT_ACCESS_SECRET=<64 hex chars>
JWT_REFRESH_SECRET=<64 hex chars>
GOOGLE_CLIENT_ID=<id>
```

### Optional but Recommended
```bash
# Redis (caching + rate limiting)
REDIS_URL=redis://redis:6379/0
USE_MEMORY_ONLY_CACHE=false

# Email
EMAIL_PROVIDER=brevo
BREVO_API_KEY=<key>
BREVO_FROM=noreply@yourdomain.com

# AI (at least one)
AI_PROVIDER=gemini
GEMINI_API_KEY=<key>
```

### Observability (Optional)
```bash
LOG_LEVEL=info
ENABLE_METRICS=true
GRAFANA_API_TOKEN=<token>
OTEL_INSTANCE_ID=<id>
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=<url>
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=<url>
```

## Backup Strategy

### MongoDB (daily)
```bash
docker exec resume-mongo mongodump --archive=/backups/daily-$(date +%Y%m%d).gz --gzip
```
Recommended: cron job or backup service (e.g., `backup.sh` in repo).

### Redis (for cache — non-critical)
Redis AOF is enabled by default. Backup is only needed if you use Redis for persistent data.

## Scaling Guide

### Vertical Scaling (simplest)
Just increase VPS resources. The backend handles up to ~500 concurrent users on 2 vCPU / 2GB RAM.

### Horizontal Scaling (requires reverse proxy)
```yaml
# docker-compose.prod.yml with multiple backend replicas
services:
  backend:
    deploy:
      replicas: 3
  nginx-proxy:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
```

**Limitations:**
- **MongoDB**: Single replica limits write throughput. Add replica set for production.
- **Redis**: Single instance. Add Redis Sentinel or Cluster for HA.
- **Puppeteer**: Each backend instance has its own browser pool (2 browsers each).
- **Queues**: MongoDB-backed (poll-based, 1s interval). Not suitable for high-throughput. Consider BullMQ with Redis for 1000+ jobs/min.

## Troubleshooting

### Backend won't start
```bash
docker compose -f docker-compose.prod.yml logs backend
```

### MongoDB disk full
```bash
docker system df
docker exec resume-mongo mongosh --eval 'db.stats()'
```

### Out of memory
Edit docker-compose.prod.yml to lower memory limits.

### Puppeteer fails
```bash
docker exec resume-backend node -e "require('puppeteer').launch({headless:true}).then(b=>b.version()).then(console.log).catch(console.error)"
```

### SSL Certificate
Use Caddy for automatic Let's Encrypt, or set up certbot manually.

## Health Checks

```bash
# Backend health
curl http://localhost:5000/health

# MongoDB status
docker exec resume-mongo mongosh --eval 'db.runCommand({ping:1})'

# Redis status
docker exec resume-redis redis-cli ping
```
