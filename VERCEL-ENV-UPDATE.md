# VERCEL ENVIRONMENT VARIABLES UPDATE

## CRITICAL: Production Using Wrong Database URL

Your production Vercel deployment is using an **OLD Supabase database URL**:
- **Current (BROKEN)**: `aws-1-us-east-2.pooler.supabase.com:5432`
- **Correct**: `db.tnbqmihtsjytmoncnpji.supabase.co:5432`

## How to Fix in Vercel Dashboard:

1. **Go to**: https://vercel.com/dashboard
2. **Select**: Your project (`afterhourfix` or similar)
3. **Click**: Settings → Environment Variables
4. **Find**: `DATABASE_URL`
5. **Update it to**: Copy from your `.env` file (the working one)

### Your Working .env DATABASE_URL:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.tnbqmihtsjytmoncnpji.supabase.co:5432/postgres
```

6. **Click**: "Save" 
7. **Redeploy**: Settings → Deployment → Production → "Redeploy"

## After Redeploy:

- Admin button will work
- Magic link login will work
- All database queries will work

The code fixes are already pushed to GitHub - just need to update Vercel env vars!

