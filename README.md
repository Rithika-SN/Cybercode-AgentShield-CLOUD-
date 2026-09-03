# AgentShield Cloud

Secure AI agent action evaluation and approval platform. Detect and block prompt injection, sensitive data leakage, excessive permissions, and high-risk actions before they execute.

## Features

- **Prompt Injection Defense**: Detects attempts to override instructions and bypass safeguards
- **Sensitive Data Protection**: Identifies and masks PII, credentials, and tokens
- **Least-Privilege Tool Access**: Controls which mock tools agents can access
- **Risk Scoring & Analysis**: 0–100 risk score with explainable detection signals
- **Policy Enforcement**: Create and manage custom security policies
- **Approval Workflow**: Require human approval for high-risk actions
- **Audit Trail**: Complete immutable record of all evaluations
- **Role-Based Access**: User and admin roles with Row-Level Security

## Architecture

```mermaid
graph LR
  User["👤 User<br/>Next.js Web"] -->|JWT| API["🔒 FastAPI<br/>Security Engine"]
  API -->|SQL/RLS| DB["🗄️ Supabase<br/>PostgreSQL"]
  API -->|Detect & Score| Engine["⚙️ SecurityEvaluator<br/>Deterministic Rules"]
  Engine -->|Policy Match| DB
  User -->|Auth| DB
  Admin["👨‍💼 Admin<br/>Dashboard"] -->|Manage Policies| API
```

## Tech Stack

**Frontend**
- Next.js 15+ App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Recharts
- TanStack Query
- React Hook Form + Zod

**Backend**
- Python 3.12+
- FastAPI
- Pydantic v2
- SQLAlchemy
- Pytest

**Database & Auth**
- Supabase PostgreSQL
- Supabase Auth
- Row-Level Security

**Infrastructure**
- Docker & docker-compose
- GitHub Actions CI/CD
- Vercel (frontend)
- Render (backend)

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.12+
- Docker & Docker Compose
- Supabase CLI

### 1. Clone and Install Dependencies

```bash
cd agentshield-cloud
npm install
```

### 2. Set Up Supabase Locally

```bash
supabase start
```

### 3. Create Environment Files

**apps/web/.env.local**
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key-from-supabase-status>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**apps/api/.env**
```
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
SUPABASE_JWT_SECRET=<jwt-secret-from-supabase-status>
ENVIRONMENT=development
CORS_ORIGIN=http://localhost:3000
```

### 4. Run Database Migrations

```bash
supabase db push
```

### 5. Start Development Servers

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000/docs
- Supabase Studio: http://localhost:54323

## Demo Scenarios

The simulator includes built-in safe examples:

1. **Benign Search**: User requests knowledge search—allowed
2. **Prompt Injection**: Malicious document tries to override system instructions—blocked
3. **Credential Leak**: Request contains fake API key—blocked
4. **Destructive Action**: Delete operation on restricted tool—requires approval

## Security Engine

The backend uses deterministic, explainable rules to evaluate agent actions:

- **Prompt Injection Detection**: Identifies override attempts, secret reveals, policy bypasses
- **Sensitive Data Detection**: Finds PII, tokens, emails
- **Tool Risk Assessment**: Evaluates requested tool and scope
- **Policy Evaluation**: Matches against defined policies
- **Risk Scoring**: Returns 0–100 score with justifications
- **Audit Logging**: Records all decisions with sanitized inputs

See [docs/security-engine.md](docs/security-engine.md) for detailed rules.

## Deployment

### Frontend (Vercel)

```bash
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_API_URL
vercel deploy --prod
```

### Backend (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repo
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from `.env.example`
6. Deploy

### Database (Supabase Cloud)

1. Create project on https://supabase.com
2. Run migrations:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```
3. Update environment variables in frontend and backend

See [docs/deployment.md](docs/deployment.md) for detailed instructions.

## Documentation

- [Security Engine](docs/security-engine.md)
- [Supabase Setup](docs/supabase-setup.md)
- [Deployment Guide](docs/deployment.md)
- [Threat Model](docs/threat-model.md)
- [Demo Script](docs/demo-script.md)
- [Architecture](docs/architecture.md)

## Development

### Available Scripts

```bash
npm run dev          # Start all dev servers
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm run test         # Run all tests
npm run clean        # Clean build artifacts
```

## Educational Notice

This is a demonstration platform using mock data, mock tools, and deterministic evaluation rules. It is not production-ready security software and should not be used to evaluate real AI agents or protect real systems. Use for learning and recruitment purposes only.

## License

Proprietary—AgentShield Cloud
