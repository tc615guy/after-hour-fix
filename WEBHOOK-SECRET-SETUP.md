# Vapi Webhook Secret Setup

## What is VAPI_WEBHOOK_SECRET?

**You generate this yourself** - it's not provided by Vapi. It's a shared secret between your app and Vapi for webhook authentication.

## Generated Secret

```
a369897b7bf577364920cf265e0a585b726f2debb136b1ab894cd6f407b04c89
```

## How to Use It

### 1. Add to Your .env

Add this line to your `.env` file:

```bash
VAPI_WEBHOOK_SECRET=a369897b7bf577364920cf265e0a585b726f2debb136b1ab894cd6f407b04c89
```

### 2. Add to Vercel Environment Variables

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add new variable:
   - Name: `VAPI_WEBHOOK_SECRET`
   - Value: `a369897b7bf577364920cf265e0a585b726f2debb136b1ab894cd6f407b04c89`
   - Environment: Production, Preview, Development
5. Save and Redeploy

### 3. How It Works

**When purchasing phone numbers:**
- Your app sends `serverUrlSecret` to Vapi
- Vapi stores it for that phone number

**When receiving webhooks:**
- Vapi computes HMAC-SHA256 hash of webhook body using the secret
- Sends hash in `X-Vapi-Signature` header
- Your app computes the same hash and compares them
- If they match → webhook is authentic ✅
- If they don't → returns 401 error 🚫

### 4. Testing

**Enable in production:**
```bash
SKIP_WEBHOOK_VERIFICATION=false
VAPI_WEBHOOK_SECRET=a369897b7bf577364920cf265e0a585b726f2debb136b1ab894cd6f407b04c89
```

**Disable in development (optional):**
```bash
SKIP_WEBHOOK_VERIFICATION=true
# This skips verification for easier debugging
```

## Security Notes

- ✅ **Keep it secret** - Never commit to git or share publicly
- ✅ **Use in production** - Protects against fake webhook requests
- ✅ **Rotate periodically** - Can regenerate if compromised
- ✅ **Different secrets** - Can use different secrets for different phone numbers/assistants

## Where It's Used

1. **Phone number purchase** - Sent to Vapi to store with the number
2. **Webhook verification** - Used to verify incoming webhook signatures
3. **Your database** - Stored with each phone number record

## Troubleshooting

**Webhooks returning 401:**
- Check `VAPI_WEBHOOK_SECRET` is set correctly
- Verify `SKIP_WEBHOOK_VERIFICATION` is `false` in production
- Check Vapi dashboard has the same secret for that phone number

**Want to regenerate?**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

