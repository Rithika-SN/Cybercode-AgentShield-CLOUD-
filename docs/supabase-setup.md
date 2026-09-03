# Supabase Setup Guide

## Local Development

### 1. Install Supabase CLI

```bash
brew install supabase/tap/supabase
```

### 2. Start Local Supabase

From the project root:

```bash
supabase start
```

This starts:
- PostgreSQL database on port 54322
- PostgREST API on port 54321
- Supabase Studio on port 54323

### 3. View Status

```bash
supabase status
```

You'll see:
```
SUPABASE_URL          = http://localhost:54321
SUPABASE_ANON_KEY     = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Add the anon key to `apps/web/.env.local`:**

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key-from-supabase-status>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Push Migrations

```bash
supabase db push
```

This applies all SQL migrations in `supabase/migrations/`.

### 5. Verify Database

Access Supabase Studio at http://localhost:54323:
- Username: `supabase`
- Password: `password`

## Cloud Deployment

### 1. Create Supabase Project

Visit https://supabase.com and create a new project:
- Organization name
- Project name
- Database password
- Region

Note your project ref: `abcdefghijk123456789`

### 2. Link Local to Cloud

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Pull Remote Schema (Optional)

If cloud already has migrations:

```bash
supabase db pull
```

### 4. Push Local Migrations to Cloud

```bash
supabase db push --linked
```

### 5. Set Environment Variables

In Vercel (frontend):
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

In Render (backend):
```
SUPABASE_JWT_SECRET=<your-jwt-secret-from-project>
```

## Migration Management

### Creating New Migrations

```bash
supabase migration new my_migration_name
```

This creates a new `.sql` file in `supabase/migrations/`.

### Applying Migrations Locally

```bash
supabase db push
```

### Resetting Local Database

```bash
supabase db reset
```

Caution: This drops all data.

## Authenticating Users

### Sign Up

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      full_name: 'John Doe',
    },
  },
})
```

### Sign In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
})
```

### Get Current User

```typescript
const { data: { user } } = await supabase.auth.getUser()
```

## Row-Level Security (RLS)

All tables use RLS to ensure users can only access their own data:

**View own data:**
```sql
SELECT * FROM security_events WHERE user_id = auth.uid();
```

**Admins bypass RLS:**
```sql
SELECT * FROM security_events WHERE user_id IN (
  SELECT id FROM profiles WHERE role = 'admin'
);
```

## Testing

To test RLS policies locally:

```bash
# Create test user via Studio
# http://localhost:54323

# Query with token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:54321/rest/v1/security_events
```

## Troubleshooting

### Migrations failed

```bash
supabase db reset
supabase db push
```

### RLS blocking access

Check policies in Studio under Authentication → Policies

### JWT secret missing

```bash
supabase status | grep JWT_SECRET
```

Copy the JWT secret to your `.env` file.

## Gotchas

1. **Service Role Key**: Never expose in frontend. Use only in backend with trusted environment variables.
2. **RLS Policies**: Must use `auth.uid()` and `auth.role()` for dynamic filtering.
3. **Cascading Deletes**: Foreign keys use `ON DELETE CASCADE` — delete a user deletes all their events.
4. **Trigger Functions**: Created with `SECURITY DEFINER` to bypass RLS on inserts.

## Documentation

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
