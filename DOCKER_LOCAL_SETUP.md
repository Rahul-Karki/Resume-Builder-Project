# Local Docker Development Setup

This guide explains how to run the Resume Builder project locally using Docker Compose.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose v2.0+
- At least 4GB of available RAM for Docker
- Ports 5000, 5173, 27017 (MongoDB), and 6379 (Redis) available

## Quick Start

### 1. Start all services

```bash
docker-compose up --build
```

This will:
- Build and start the backend (Node.js on port 5000)
- Build and start the frontend (Nginx on port 5173)
- Start MongoDB (port 27017)
- Start Redis (port 6379)

### 2. Access the application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/health
- **Metrics**: http://localhost:5000/metrics

## Configuration

### Environment Variables

All environment variables are configured in:
- **Backend**: `Backend/.env` (local development settings)
- **Frontend**: `frontend/.env.local` (local development settings)

Both are pre-configured for local Docker development. Key settings:
- `NODE_ENV=development` (Backend)
- `MONGO_URI=mongodb://mongo:27017/resume_builder_dev` (local MongoDB)
- `REDIS_URL=redis://redis:6379/0` (local Redis)
- `VITE_API_BASE_URL=http://localhost:5000/api` (Frontend → Backend)
- `FRONTEND_URL=http://localhost:5173` (CORS)

### Important: localhost vs Service Names

**Browser requests** use `localhost`:
- API calls in browser: `http://localhost:5000/api`

**Container-to-container** use service names:
- Frontend container calls backend: `http://backend:5000/api`

This is handled automatically in the docker-compose configuration.

## Common Commands

### View logs for all services

```bash
docker-compose logs -f
```

### View logs for specific service

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongo
docker-compose logs -f redis
```

### Stop all services

```bash
docker-compose down
```

### Remove volumes (reset database and cache)

```bash
docker-compose down -v
```

### Rebuild a specific service

```bash
docker-compose up --build backend
docker-compose up --build frontend
```

### Access MongoDB shell

```bash
docker-compose exec mongo mongosh
```

### Access Redis CLI

```bash
docker-compose exec redis redis-cli
```

## Development Workflow

### Making code changes

#### Backend changes:
1. Edit files in `Backend/src/`
2. Changes are NOT automatically reloaded (you need to rebuild)
3. Rebuild: `docker-compose up --build backend`

#### Frontend changes:
1. Edit files in `frontend/src/`
2. Changes are NOT automatically reloaded (static build)
3. Rebuild: `docker-compose up --build frontend`

If you want hot-reload during development, run locally instead:
```bash
# Terminal 1: Backend
cd Backend && npm install && npm run dev

# Terminal 2: Frontend
cd frontend && npm install && npm run dev
```

### Debugging

#### Backend
- Logs are available via `docker-compose logs -f backend`
- Debug level logging is enabled (`LOG_LEVEL=debug`)

#### Frontend
- Browser DevTools work normally at http://localhost:5173
- Network requests show in DevTools under the Network tab

## Troubleshooting

### Port already in use

```bash
# Check what's using port 5000
lsof -i :5000

# Check port 5173
lsof -i :5173

# Kill process
kill -9 <PID>
```

### MongoDB connection refused

```bash
# Check if mongo container is running
docker-compose ps

# Check mongo logs
docker-compose logs mongo

# Restart mongo
docker-compose restart mongo
```

### Redis connection refused

```bash
# Check if redis container is running
docker-compose ps

# Check redis logs
docker-compose logs redis

# Restart redis
docker-compose restart redis
```

### Frontend showing "Cannot GET /"

- Wait 10-15 seconds for frontend build to complete
- Check frontend logs: `docker-compose logs frontend`
- Rebuild: `docker-compose up --build frontend`

### API calls returning 405 or CORS errors

- Ensure `VITE_API_BASE_URL=http://localhost:5000/api` in `frontend/.env.local`
- Ensure `FRONTEND_URL=http://localhost:5173` in `Backend/.env`
- Restart backend: `docker-compose restart backend`

### Database is not persisting data

- Data is stored in Docker volumes (`mongo_data`, `redis_data`)
- If you run `docker-compose down -v`, volumes are deleted
- Use just `docker-compose down` to preserve data between runs

## Performance Tips

### Reduce Docker resource usage

If Docker is consuming too much CPU/RAM:
1. Reduce Redis memory: Edit `docker-compose.yml` Redis service
2. Disable metrics: Set `ENABLE_METRICS=false` in `Backend/.env`
3. Reduce logging: Set `LOG_LEVEL=warn` in `Backend/.env`

### Speed up builds

- First build: ~2-3 minutes
- Subsequent builds: ~30-60 seconds (if code changed)
- To skip rebuild: `docker-compose up` (without `--build`)

## Production vs Development

### Key differences in local Docker setup:

| Setting | Local Dev | Production |
|---------|-----------|-----------|
| NODE_ENV | development | production |
| LOG_LEVEL | debug | info |
| ENABLE_METRICS | false | true |
| Cache headers | disabled | aggressive |
| ALLOW_PREVIEW_ORIGINS | true | false |
| AI_CREDITS_ENFORCED | false | true |
| SENTRY_DSN | empty | configured |

### Switching to production build:

To build production images locally:
```bash
# Edit docker-compose.yml before building
# Change NODE_ENV from development to production
# Or temporarily override:

docker-compose -f docker-compose.yml \
  -e NODE_ENV=production \
  up --build
```

## Health Checks

The backend has a built-in health check. View status:

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-05-26T10:30:00.000Z"
}
```

## Next Steps

- [View Backend Architecture](../../docs/ARCHITECTURE.md)
- [View Testing Standards](../../docs/TESTING_STANDARDS.md)
- [View Environment Variables](Backend/.env.example)
