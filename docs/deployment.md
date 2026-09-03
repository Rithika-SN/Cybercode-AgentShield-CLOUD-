# Deployment Guide

## Local Development

### Prerequisites
- Node.js 20+
- Python 3.12+
- Docker & Docker Compose
- Supabase CLI (optional for cloud sync)

### Quick Start

1. **Clone and install:**
```bash
cd /Users/apple/Cybercode
npm install
cd apps/web && npm install
cd ../api && poetry install
```

2. **Start development servers:**
```bash
# Terminal 1: Frontend
cd apps/web
npm run dev  # Runs on http://localhost:3000

# Terminal 2: Backend
cd apps/api
poetry run uvicorn app.main:app --reload  # Runs on http://localhost:8000

# Terminal 3: Database (optional, if not using Docker)
supabase start
```

### Using Docker Compose

```bash
docker-compose up --build
```

This starts:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432

## Supabase Setup

### Local Supabase

```bash
supabase init
supabase start
```

### Cloud Deployment

1. **Create Supabase project** at supabase.com
2. **Link local project:**
```bash
supabase login
supabase link --project-ref your-project-id
```

3. **Push migrations:**
```bash
supabase db push
```

4. **Get connection string:**
- Copy from Supabase dashboard
- Set as `DATABASE_URL` in `.env`

## Frontend Deployment (Vercel)

### Option 1: Automatic from GitHub

1. Connect repository to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL`
3. Deploy automatically on push

### Option 2: Manual Deployment

```bash
cd apps/web
npm install -g vercel
vercel login
vercel deploy --prod
```

### Environment Variables (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://your-api.com
```

## Backend Deployment (Render)

### Using render.yaml

```bash
cd apps/api
```

The `render.yaml` file is pre-configured. Deploy by:

1. Connect repository to Render
2. Select branch and service
3. Set environment variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `CORS_ORIGIN` - Frontend URL
   - `ENVIRONMENT` - `production`
4. Deploy

### Manual Deployment

```bash
# Create new Render service
# Build command: poetry install && poetry run gunicorn
# Start command: uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Environment Variables (Render)

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SUPABASE_JWT_SECRET=your-jwt-secret
CORS_ORIGIN=https://your-frontend.com
ENVIRONMENT=production
```

## Database Migrations

### Create new migration

```bash
supabase migration new name_of_migration
# Edit supabase/migrations/timestamp_name_of_migration.sql
supabase db push
```

### Rollback

```bash
supabase db reset  # Resets to latest pushed migration
```

## CI/CD Pipeline

GitHub Actions runs on each push:

1. **Frontend:**
   - Install dependencies
   - Run lint
   - Run type check
   - Build

2. **Backend:**
   - Install dependencies
   - Run tests
   - Run linter

## Production Checklist

- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] Authentication configured
- [ ] CORS properly restricted
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Security headers set
- [ ] SSL/TLS certificates valid
- [ ] Backups enabled
- [ ] Monitoring configured

## Troubleshooting

### Port already in use
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database connection failed
```bash
# Verify DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Supabase sync issues
```bash
# Reset local state
rm .supabase/remote.json

# Re-link
supabase link --project-ref your-project-id
```

## Security

- Never commit `.env` files
- Rotate JWT secrets regularly
- Use strong database passwords
- Enable database backups
- Monitor API logs
- Implement rate limiting
- Use HTTPS in production
- Enable CORS only for trusted origins
