# Auth Testing Checklist

## Current Setup
- ✅ Supabase Site URL: `https://afterhourfix.com`
- ✅ Redirect URLs configured
- ✅ Users deleted from Prisma DB
- ⚠️ Users may still exist in Supabase Auth

## Test Steps

### Step 1: Try Login with NEW Email
Use an email you've NEVER used before (not gmail or icloud)

1. Go to: https://afterhourfix.com/auth/signup
2. Enter: `test+{random}@example.com`
3. Click "Get Started"
4. **Expected**: See "Check Your Email" message
5. **Actual**: _________

### Step 2: Check Email
1. Open email inbox
2. Look for email from Supabase
3. **Expected**: Email with "Log in" button
4. **Actual**: _________

### Step 3: Click Magic Link
1. Click the link in email
2. **Expected**: Redirect to `/auth/callback` → `/onboarding`
3. **Actual URL**: _________
4. **Actual Page**: _________

### Step 4: Check Console
1. Open browser console (F12)
2. Look for any errors or logs
3. **Console Output**: _________

## Troubleshooting

### If redirects to homepage (/)
- Check browser console for "Auth tokens detected" message
- Should auto-redirect to `/auth/callback`

### If shows "Missing auth parameters"
- Magic link template is wrong
- Check Supabase email template

### If redirects to /auth/login
- Session not being set properly
- Check cookies in DevTools

## Known Issues
- Old accounts (gmail/icloud) deleted from Prisma but not Supabase Auth
- May need to delete from Supabase Auth dashboard manually
