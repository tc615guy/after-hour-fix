# FINAL FIX: Production Database Connection

## The Problem
Prepared statement errors: "prepared statement already exists" or "does not exist"

Transaction Pooler (port 6543) **doesn't support prepared statements** that Prisma uses.

## The Solution (Choose ONE):

### ✅ Option 1: Add `?pgbouncer=true` to DATABASE_URL (EASIEST)

In Vercel Dashboard:
1. Go to: https://vercel.com/dashboard
2. Settings → Environment Variables
3. Find `DATABASE_URL`
4. Update to:
   ```
   postgresql://postgres.tnbqmihtsjytmoncnpji:Bdbshsubd7177Bgggf@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
   **Add `?pgbouncer=true` to the end**
5. Save and Redeploy

This tells Prisma to NOT use prepared statements.

### Option 2: Switch to Session Pooler

1. In Vercel, update `DATABASE_URL` to:
   ```
   postgresql://postgres.tnbqmihtsjytmoncnpji:Bdbshsubd7177Bgggf@aws-0-us-east-2.pooler.supabase.com:5432/postgres
   ```
   **Change `aws-1` to `aws-0`, port `6543` to `5432`**
2. Save and Redeploy

Get the correct session pooler URL from Supabase dashboard → Settings → Database → Connection Pooling

### Option 3: Use Direct Connection

1. Update `DATABASE_URL` to:
   ```
   postgresql://postgres:Bdbshsubd7177Bgggf@db.tnbqmihtsjytmoncnpji.supabase.co:5432/postgres
   ```
2. Save and Redeploy

## Recommendation
**Use Option 1** - it's the simplest and works with your current setup.

