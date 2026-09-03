# Architecture

## System Design

AgentShield Cloud is a full-stack SaaS platform for evaluating and approving AI agent actions before execution.

```
┌─────────────────────────────────────────────────────────┐
│                      User Browser                        │
├─────────────────────────────────────────────────────────┤
│                  Next.js Frontend (3000)                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Dashboard  │ Simulator │ Events │ Policies     │   │
│  │  Landing    │ Auth      │ Coverage              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                    HTTPS/JWT Token
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI Backend (8000)                 │
├─────────────────────────────────────────────────────────┤
│  POST /api/v1/evaluate                                  │
│  ├─ SecurityEvaluator                                   │
│  │  ├─ Prompt Injection Detection                       │
│  │  ├─ Credential Leak Detection                        │
│  │  ├─ PII Detection                                    │
│  │  ├─ Destructive Operation Detection                  │
│  │  └─ Tool Permission Validation                       │
│  ├─ Policy Matching                                     │
│  └─ Decision: ALLOW / REQUIRE_APPROVAL / BLOCK          │
│                                                          │
│  GET /api/v1/dashboard/metrics                          │
│  GET /api/v1/events                                     │
│  GET /api/v1/policies                                   │
└─────────────────────────────────────────────────────────┘
                           │
                    SQL/JWT Validation
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│        Supabase PostgreSQL + Authentication (5432)       │
├─────────────────────────────────────────────────────────┤
│  Tables:                                                │
│  ├─ auth.users (managed by Supabase)                   │
│  ├─ profiles (UUID → user metadata)                    │
│  ├─ security_events (audit trail)                      │
│  ├─ policies (security policies)                       │
│  └─ approval_requests (workflow)                       │
│                                                          │
│  Security:                                              │
│  ├─ Row-Level Security (RLS)                           │
│  ├─ JWT-based authentication                           │
│  └─ Encrypted credentials                              │
└─────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend (Next.js 15 App Router)

```
app/
├── layout.tsx           # Root layout with providers
├── page.tsx            # Landing page with hero, features
├── providers.tsx       # Query client, theme
├── login/page.tsx      # Email/password auth
├── signup/page.tsx     # User registration
├── dashboard/page.tsx  # Main dashboard with KPIs
├── simulator/page.tsx  # Agent action evaluation
├── events/page.tsx     # Security events list
├── policies/page.tsx   # Policy management
└── security-coverage/  # Security controls explanation

lib/
├── supabase.ts         # Supabase client
├── api-client.ts       # Axios with JWT
└── (utilities)

types/
└── index.ts            # TypeScript models

components/             # Reusable UI components
├── charts/
├── forms/
├── cards/
└── tables/
```

### Backend (FastAPI)

```
app/
├── main.py             # FastAPI app, routes, middleware
├── schemas.py          # Pydantic models
├── security_evaluator.py # Core detection engine
└── __init__.py

Deterministic Rules:
├── Injection patterns (regex, semantic)
├── Credential patterns (API keys, tokens)
├── PII patterns (email, phone, SSN)
├── Destructive operations (delete, drop)
└── Tool scope validation
```

### Database (Supabase/PostgreSQL)

**Core Tables:**

1. **auth.users** (Supabase managed)
   - email, encrypted_password, created_at
   - Managed via Supabase Auth API

2. **profiles** (user metadata)
   - id (FK to auth.users)
   - email, full_name, role (user|admin)
   - RLS: Users see own, admins see all

3. **security_events** (audit trail)
   - id, user_id, agent_name, decision, risk_score
   - detections (JSONB), sanitized_input_preview
   - Indexed by user_id, created_at, decision
   - RLS: Users see own, admins see all

4. **policies** (security rules)
   - id, name, category, severity_threshold, action
   - tool_scope (array), enabled
   - RLS: All authenticated users read, admins write

5. **approval_requests** (workflow)
   - id, event_id (FK), status (pending|approved|denied)
   - reason, reviewer_id, created_at
   - RLS: Users see own, admins manage all

## Data Flow

### Agent Action Evaluation

```
1. User/App submits to simulator
   ├─ Agent name
   ├─ User request
   ├─ Mock context
   ├─ Requested tool
   └─ Action type

2. Frontend sends to /api/v1/evaluate
   ├─ Includes JWT token in Authorization header
   └─ Request validated by Pydantic

3. Backend receives request
   ├─ Validates JWT token
   ├─ Extracts user ID
   └─ Calls SecurityEvaluator

4. SecurityEvaluator analyzes
   ├─ Check injection patterns
   ├─ Check credentials
   ├─ Check PII
   ├─ Check destructive ops
   ├─ Check tool permissions
   ├─ Calculate risk score (0-100)
   ├─ Determine severity (LOW/MEDIUM/HIGH/CRITICAL)
   ├─ Match against policies
   └─ Generate recommendations

5. Sanitize & log
   ├─ Mask credentials and PII
   ├─ Save to security_events table
   └─ Return decision to frontend

6. Frontend renders result
   ├─ Display decision with icon
   ├─ Show risk score gauge
   ├─ List detections
   ├─ Recommend mitigations
   └─ Save to local history
```

### Authentication Flow

```
1. User signs up at /signup
   ├─ Email & password
   ├─ Supabase Auth creates auth.users entry
   ├─ Trigger auto-creates profiles entry
   └─ User sent verification email (optional)

2. User signs in at /login
   ├─ Email & password to Supabase.auth.signInWithPassword()
   ├─ Supabase returns JWT access token
   ├─ Frontend stores token in localStorage
   └─ Redirect to /dashboard

3. Protected requests
   ├─ Frontend adds "Authorization: Bearer {token}"
   ├─ Backend verifies JWT signature
   ├─ Extract user_id from token
   └─ Enforce RLS policies

4. Sign out
   ├─ supabase.auth.signOut()
   ├─ Clear localStorage
   └─ Redirect to /
```

## Security Model

### Authentication
- **OAuth Provider**: Supabase Auth (email/password, optionally Google)
- **Token Format**: JWT signed by Supabase
- **Token Storage**: localStorage (XSS vulnerable but standard for SPAs; httpOnly would require backend forwarding)
- **Expiration**: 60 minutes (Supabase default)
- **Refresh**: Automatic via Supabase client

### Authorization
- **Roles**: `user` (default), `admin` (assigned by backend)
- **RLS Enforcement**: All table access filtered by role at database level
- **API Access**: All routes except `/health` require valid JWT
- **Service Role**: Never exposed in frontend code

### Secrets Management
- **Environment Variables**: `.env.local` (frontend), `.env` (backend)
- **Example Files**: `.env.example` provided for reference
- **.gitignore**: Excludes all `.env*` files
- **CI/CD Secrets**: Stored in GitHub Actions secrets, injected at build time

### Data Protection
- **Credentials**: Automatically masked in logs (`[REDACTED_CREDENTIAL]`)
- **PII**: Automatically masked in logs (`[REDACTED_PII]`)
- **Audit Trail**: Immutable (append-only)
- **Encryption**: TLS in transit, encryption at rest via Supabase

## Deployment Architecture

### Development (Local)
- Frontend: `npm run dev` on localhost:3000
- Backend: `python -m uvicorn app.main:app` on localhost:8000
- Database: Supabase local instance on localhost:54321

### Production
```
┌──────────────────┐
│   User Browser   │
└────────┬─────────┘
         │
         ▼
   ┌──────────────┐
   │ Vercel CDN   │  (Frontend SPA)
   │ Next.js 15   │  agentshield.example.com
   └───────┬──────┘
           │
           ▼
    ┌────────────────┐
    │  Render Web    │  (Backend API)
    │  FastAPI       │  api.agentshield.example.com
    └────────┬───────┘
             │
             ▼
      ┌───────────────┐
      │  Supabase     │  (Database + Auth)
      │  PostgreSQL   │  project.supabase.co
      └───────────────┘
```

### CI/CD Pipeline

```
GitHub Push
    │
    ▼
├─ Frontend Tests (lint, typecheck, build)
├─ Backend Tests (lint, type check, pytest)
└─ Security Scan (secrets detection)
    │
    ├─ On main branch:
    │  ├─ Deploy frontend to Vercel
    │  └─ Deploy backend to Render
    │
    └─ On PR: Run all tests, block merge if failed
```

## Monitoring & Observability

- **Application Logs**: Structured logging via Python `logging` module
- **Request Tracing**: FastAPI logs all `/api/v1/*` requests
- **Performance**: Evaluation completes in <10ms
- **Database**: RLS queries logged by PostgreSQL
- **Frontend Errors**: Caught by React error boundary

## Scalability

- **Horizontal Scaling**: Stateless FastAPI backend can run multiple instances behind load balancer
- **Database**: Supabase manages PostgreSQL scaling (auto or manual)
- **Frontend**: Vercel handles CDN + edge caching
- **Evaluator**: O(n) regex matching on input size—typically <1ms per evaluation

## Disaster Recovery

- **Database Backups**: Supabase daily (cloud) or manual (local)
- **Code Backups**: Git repository
- **Secrets Backup**: GitHub Actions + deployment platform secrets vaults
- **Recovery Time**: <30 minutes for full redeploy to Supabase + Vercel + Render

## Compliance & Governance

- **Audit Trail**: Every evaluation logged immutably
- **Data Residency**: Configurable via Supabase region
- **GDPR Compliance**: User data deletion cascades via foreign keys
- **HIPAA Ready**: Encryption in transit + at rest (add customer-managed keys for production)
- **SOC 2**: Achievable with added monitoring, backups, and incident response procedures
