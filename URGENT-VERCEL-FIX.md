# URGENT: Fix Production Database Connection

## The Issue
Production on Vercel has prepared statement errors: "prepared statement already exists"

This happens because the **transaction pooler (port 6543) doesn't support prepared statements** that Prisma uses by default.

## The Solution

You have TWO options:

### Option A: Use Session Pooler (Recommended for NOW)

Use the **Session Pooler** on port 5432 instead of Transaction Pooler:

**In Vercel Dashboard:**
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Update `DATABASE_URL` to:
   ```
   postgresql://postgres.tnbqmihtsjytmoncnpji:Bdbshsubd7177Bgggf@aws-0-us-east-2.pooler.supabase.com:5432/postgres
   ```
   **NOTE**: Change `aws-1` to `aws-0` and port to `5432`
5. Save and Redeploy

### Option B: Use Direct Connection (Better, but may hit connections limit)

Use direct connection that supports prepared statements:

1. Update `DATABASE_URL` to:
   ```
   postgresql://postgres:Bdbshsubd7177Bgggf@db.tnbqmihtsjytmoncnpji.supabase.co:5432/postgres
   ```
   **NOTE**: Remove `.tnbqmihtsjytmoncnpji` after `postgres` and use `db.` hostname
2. Save and Redeploy

## After Redeploy
Admin will work, all database queries will work.

## Why This Happened
- Transaction pooler (port 6543) = **doesn't support prepared statements**
- Session pooler (port 5432) = **supports prepared statements**
- Direct connection (port 5432) = **supports prepared statements**

Prisma needs prepared statements, so we need either Session Pooler or Direct.

