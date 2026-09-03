# Interview Guide

## Project Overview (2 min elevator pitch)

"AgentShield Cloud is a production-grade SaaS platform for evaluating and securing AI agent actions. It detects prompt injection attacks, credential leaks, and suspicious tool usage through deterministic security rules, then enforces policies with allow/require-approval/block decisions. The platform includes a full-stack Next.js frontend, FastAPI backend with a custom security evaluator, Supabase auth and PostgreSQL, and simulations for demonstration."

## Key Talking Points

### Architecture & Design Decisions

**Q: Why a monorepo structure?**

A: "A monorepo keeps frontend, backend, and shared types in one repository, making it easier to:
- Share TypeScript types between frontend and API responses
- Ensure frontend and backend stay in sync
- Use Turbo for parallel builds and tests
- Manage dependencies consistently

For this project, Turbo allows us to run `npm run build` once and build both frontend and backend, catching integration issues early."

**Q: Why FastAPI instead of Node.js for the backend?**

A: "FastAPI is ideal here because:
- We needed deterministic, not ML-based, security evaluation
- Python's regex library and pattern matching are excellent
- FastAPI's Pydantic validation catches bad input early
- It's lightweight and fast for straightforward request/response APIs
- Python is increasingly standard in security and DevOps teams

This wouldn't be the right choice for a real-time system with millions of requests, but it's perfect for this security evaluation workload."

**Q: How does the security evaluator work?**

A: "The evaluator is fully deterministic—no external LLM API calls. It scans inputs with regex patterns for:
1. Prompt injection keywords (ignore, bypass, override)
2. Credential patterns (API keys, passwords, tokens)
3. PII patterns (emails, phone numbers, SSNs)
4. Destructive operations (delete, drop)
5. Tool permission violations

Each detection adds points to a risk score. At 0-39: ALLOW, 40-59: ALLOW but log, 60-79: REQUIRE_APPROVAL, 80+: BLOCK. The system returns not just a decision, but the detections, matched policies, and recommended mitigations."

### Frontend & UX

**Q: What frontend challenges did you solve?**

A: "Key challenges:
1. **Real-time dashboard:** Used Recharts for analytics with mock data; in production this would query the backend API with TanStack Query.
2. **Authentication:** Integrated Supabase Auth for email/password signup and login with session persistence.
3. **Protected routes:** Implemented route guards in Next.js middleware to redirect unauthenticated users.
4. **Form validation:** Used React Hook Form + Zod for type-safe, validated simulator and policy forms.
5. **Responsive design:** Built dark-theme dashboard with Tailwind and shadcn/ui components, tested on desktop/tablet/mobile."

**Q: Why Tailwind + shadcn/ui?**

A: "Tailwind provides utility-first CSS that scales well, and shadcn/ui gives us high-quality, customizable components built on Radix UI primitives. This combination lets us ship a polished interface quickly without custom CSS. The dark theme and accent colors (cyan, violet, emerald, red) create a premium, command-center feel appropriate for a security platform."

### Database & Security

**Q: How do you handle user data isolation?**

A: "We use Supabase's Row-Level Security (RLS) policies:
- Each user can only SELECT/UPDATE their own profile
- Event records are filtered by `user_id = auth.uid()`
- Admins have an exception that lets them see all records
- Policies are defined in SQL and enforced at the database level, not in application code

This prevents bugs in backend logic from leaking data—the database itself enforces access."

**Q: How is sensitive data protected?**

A: "Multiple layers:
1. **Input sanitization:** Regex scans for credentials and PII before storage
2. **Masking:** Credentials stored as [REDACTED_CREDENTIAL], emails as [REDACTED_PII]
3. **Never in logs:** Sensitive data is stripped before any logging
4. **TLS in transit:** HTTPS encrypts data in flight
5. **Encryption at rest:** Supabase provides database encryption

This follows the principle of defense in depth—if one layer fails, others still protect the data."

### Testing & Quality

**Q: What's your testing strategy?**

A: "Testing is layered:
- **Backend unit tests:** Pytest for SecurityEvaluator (injection detection, scoring, decision logic)
- **Backend integration tests:** API endpoint tests with JWT validation, error cases
- **Frontend component tests:** Jest for critical UI (auth forms, simulator results)
- **CI/CD:** GitHub Actions runs lint, type-check, tests, and build on every push
- **Manual:** I test the full flow: signup → login → run simulation → view results

In production, you'd add load testing, security scanning, and synthetic monitoring."

**Q: How do you handle errors and edge cases?**

A: "Examples:
- **Invalid JWT:** Returns 401 Unauthorized with clear message
- **Malformed input:** Pydantic validation rejects it before it reaches business logic
- **Missing environment variables:** App warns on startup instead of crashing later
- **Database connection lost:** Would implement retry logic and circuit breaker
- **Concurrent policy updates:** Database timestamps and version control prevent conflicts"

### DevOps & Deployment

**Q: How is this deployed?**

A: "Multi-tier deployment:
1. **Frontend:** Vercel (optimal for Next.js)
   - Auto-deployed on every push to main
   - Environment variables for Supabase and API URLs
   - CDN for static assets

2. **Backend:** Render
   - Runs FastAPI with Uvicorn
   - Scales horizontally if needed
   - Pulls connection string from Render environment

3. **Database:** Supabase PostgreSQL
   - Managed backups and recovery
   - Row-Level Security policies enforced at DB level
   - Can spin up staging environments easily

4. **CI/CD:** GitHub Actions
   - Tests and builds on every commit
   - Deploys to Vercel/Render on main branch push

This is a production-ready setup for a SaaS platform."

## Technical Deep Dives

### Q: Walk me through the simulator flow.

A: "1. User fills form: Agent name, request, context, tool, action type
2. Frontend validates with Zod schema
3. Submits to POST `/api/v1/evaluate` with JWT token
4. Backend extracts user from JWT header
5. SecurityEvaluator scans the input:
   - Checks against injection patterns
   - Looks for credential/PII patterns
   - Checks tool permissions
   - Computes risk score
   - Matches against policies
6. Returns SecurityEvaluationResponse with decision, score, detections, recommendations
7. Frontend displays results: risk gauge, categories, detections, matching policies
8. Result is saved to database as a security event (in production)
9. User can run another simulation or explore events/policies

The entire flow is logged and immutable for audit purposes."

### Q: How does RLS work specifically?

A: "Row-Level Security is a PostgreSQL feature. For example:

```sql
CREATE POLICY \"Users can view own events\"
  ON public.security_events
  FOR SELECT
  USING (auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ));
```

This policy means:
- When a user queries security_events, PostgreSQL automatically adds WHERE (auth.uid() = user_id OR is_admin)
- If a user with ID abc queries, they only see rows where user_id = 'abc'
- Admins see all rows
- This is enforced at the database level, not in app code

So even if our backend API has a bug and doesn't filter, the database still protects the data."

### Q: What would you do differently in production?

A: "Good questions to ask:

1. **Scalability:**
   - Implement Redis caching for policies and user sessions
   - Add database connection pooling
   - Use background jobs (Celery/RQ) for async event processing

2. **Security:**
   - Add rate limiting per user/IP
   - Implement MFA
   - Add request signing/HMAC verification
   - Audit logging to immutable store
   - Regular security scans (OWASP ZAP, Bandit)

3. **Monitoring:**
   - Structured logging (JSON) to log aggregation service
   - Metrics: latency, error rate, security events
   - Alerts for anomalies (too many blocks, auth failures)
   - APM instrumentation

4. **Compliance:**
   - GDPR: Add data export, deletion, consent management
   - SOC 2: Formalize audit controls, incident response
   - Penetration testing by third party

5. **Feature Completeness:**
   - Custom user-defined policies with DSL
   - Machine learning based anomaly detection
   - Integration with SIEM/XDR platforms
   - API key management for service-to-service auth"

## Questions to Ask Back

1. "What size is your security team, and what tools do you currently use?"
2. "Are there specific compliance frameworks you work within?"
3. "How do you currently handle insider threats or policy enforcement?"
4. "What's your infrastructure setup—cloud, on-prem, hybrid?"

## Closing

"This project demonstrates full-stack skills: secure auth, REST APIs, database design with RLS, frontend UX, DevOps, and thoughtful security architecture. The deterministic evaluator is production-ready and could be extended with ML models. Most importantly, it solves a real problem: securing AI agents before they take action. I'm excited to apply these skills to your team's challenges."

## Quick Reference: Key Technologies

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | Next.js + TypeScript | Type safety, App Router, fast builds |
| Styling | Tailwind + shadcn/ui | Consistent theme, reusable components |
| Forms | React Hook Form + Zod | Type-safe validation |
| Data Fetching | TanStack Query + Axios | Caching, retries, optimistic updates |
| Backend | FastAPI + Pydantic | Validation, OpenAPI docs, async support |
| Database | Supabase PostgreSQL | RLS, managed backups, real-time capable |
| Auth | Supabase Auth | Email/password, JWT, session management |
| Testing | Pytest + Jest | Comprehensive coverage |
| Deployment | Vercel + Render | Production-ready, easy scaling |
| CI/CD | GitHub Actions | Automated testing and deployment |
