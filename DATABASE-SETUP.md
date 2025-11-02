# How to Get Your Supabase Database URLs

## Quick Fix Steps:

1. **Go to**: https://supabase.com/dashboard
2. **Select** your project
3. **Click**: Settings (gear icon) → Database
4. **Scroll to**: "Connection string" section

## You Need TWO URLs:

### 1. DATABASE_URL (Pooled Connection)
- Find the section: **"Use Connection Pooling"**
- Select: **"Transaction pooler"** (port 6543)
- Copy the connection string
- Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres`

### 2. DIRECT_URL (Direct Connection)
- Find the section: **"Connection string"** (NOT pooling)
- Copy the direct connection string  
- Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

## Or If You Need IPv6 Support:

### 1. DATABASE_URL (Direct - IPv6)
- Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

### 2. DIRECT_URL (Same as above)

## Your .env File Should Look Like:

```bash
DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-2.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

**Replace:**
- `[YOUR-PROJECT-REF]` with your actual project reference (like `abcdefghijklmnop`)
- `[YOUR-PASSWORD]` with your database password

## After Updating .env:

1. Save the .env file
2. Restart your Next.js app (if running locally: `npm run dev`)
3. Test the database connection

## Why Two URLs?

- **DATABASE_URL**: Used for normal app queries (pooled for efficiency)
- **DIRECT_URL**: Used by Prisma migrations and schema operations

