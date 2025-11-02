# URGENT: Fix Production Database Connection

## The Issue
Production on Vercel has prepared statement errors: "prepared statement already exists"

This happens because the **transaction pooler (port 6543) doesn't support prepared statements** that Prisma uses by default.

## ✅ The SIMPLE Solution

### Add `?pgbouncer=true` to DATABASE_URL

**In Vercel Dashboard:**
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Update `DATABASE_URL` to:
   ```
   postgresql://postgres.tnbqmihtsjytmoncnpji:Bdbshsubd7177Bgggf@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
   **Add `?pgbouncer=true` at the end**
5. Save and Redeploy

This tells Prisma to disable prepared statements and works with transaction pooler.

## Alternative Options (if above doesn't work)

### Option B: Use Session Pooler

1. Update `DATABASE_URL` to:
   ```
   postgresql://postgres.tnbqmihtsjytmoncnpji:Bdbshsubd7177Bgggf@aws-0-us-east-2.pooler.supabase.com:5432/postgres
   ```
   **NOTE**: Change `aws-1` to `aws-0`, port `6543` to `5432`
2. Save and Redeploy

Get URL from Supabase Dashboard → Settings → Database → Connection Pooling → Session mode

### Option C: Use Direct Connection

1. Update `DATABASE_URL` to:
   ```
   postgresql://postgres:Bdbshsubd7177Bgggf@db.tnbqmihtsjytmoncnpji.supabase.co:5432/postgres
   ```
2. Save and Redeploy

## After Redeploy
Admin will work, all database queries will work.

## Why This Happened
- Transaction pooler (port 6543) = **doesn't support prepared statements**
- Session pooler (port 5432) = **supports prepared statements**
- Direct connection (port 5432) = **supports prepared statements**

Prisma needs prepared statements, so we need either Session Pooler or Direct.

