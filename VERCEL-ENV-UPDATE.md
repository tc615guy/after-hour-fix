# VERCEL ENVIRONMENT VARIABLES UPDATE

## CRITICAL: Production Using Wrong Database URL

Your production Vercel deployment is using an **OLD Supabase database URL**:
- **Current (BROKEN)**: `aws-1-us-east-2.pooler.supabase.com:5432` (wrong region or port)
- **Correct**: `aws-1-us-east-2.pooler.supabase.com:6543` (transaction pooler)

**Your Project Reference**: `tnbqmihtsjytmoncnpji`

## How to Fix in Vercel Dashboard:

1. **Go to**: https://vercel.com/dashboard
2. **Select**: Your project (`afterhourfix` or similar)
3. **Click**: Settings → Environment Variables
4. **Find**: `DATABASE_URL`
5. **Update it to**: Copy from your `.env` file (the working one)

### Your Working .env DATABASE_URL:
```
postgresql://postgres.tnbqmihtsjytmoncnpji:Bdbshsubd7177Bgggf@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

**NOTE**: Make sure it's port **6543** (transaction pooler), not **5432**!

6. **Click**: "Save" 
7. **Redeploy**: Settings → Deployment → Production → "Redeploy"

## After Redeploy:

- Admin button will work
- Magic link login will work
- All database queries will work

The code fixes are already pushed to GitHub - just need to update Vercel env vars!

