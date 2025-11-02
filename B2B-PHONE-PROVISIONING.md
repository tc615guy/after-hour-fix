# B2B Phone Number Provisioning

## Architecture

AfterHourFix now provides **fully automated phone number provisioning** for customers:

1. **Twilio** - Purchase and manage phone numbers
2. **Vapi** - Add numbers as "BYO" (Bring Your Own) provider
3. **Customer** - One click, number is ready

## How It Works

When a customer clicks "Purchase Number":

1. Search Twilio for available numbers (default area code 205)
2. Purchase the first available number from Twilio
3. Add the number to Vapi as BYO provider
4. Configure webhook URL, fallback forwarding, and assistant attachment
5. Store in database and activate

**No manual steps required for the customer!**

## Flow

```
Customer clicks "Purchase Number"
  ↓
API: POST /api/numbers { projectId, agentId }
  ↓
Step 1: searchAvailableNumbers(areaCode) → Twilio API
  ↓
Step 2: purchaseTwilioNumber(number) → Twilio API
  ↓
Step 3: vapiClient.purchasePhoneNumber(number, assistantId, config) → Vapi API
  ↓
Step 4: Store in database + activate
  ↓
Customer's AI is live!
```

## Configuration

Required environment variables:
- `TWILIO_ACCOUNT_SID` - Your Twilio account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio auth token
- `VAPI_API_KEY` - Your Vapi API key
- `VAPI_WEBHOOK_SECRET` - Webhook authentication secret

## API Endpoints

### Search Available Numbers
```
GET /api/numbers?areaCode=205
```
Returns available Twilio numbers for the area code.

### Purchase Number
```
POST /api/numbers
Body: { projectId, agentId, areaCode?: '205', number?: '+1234567890' }
```

If `number` is provided, purchases that specific number.
If not, searches area code and purchases first available.

Returns:
```json
{
  "success": true,
  "phoneNumber": { id, e164, ... },
  "vapiNumberId": "..."
}
```

## Multi-Tenant Security

- All numbers purchased through YOUR Twilio account
- Your `VAPI_API_KEY` adds numbers to YOUR Vapi organization
- Webhooks route to YOUR servers
- Customers never see each other's data
- Numbers isolated by project in database (Prisma RLS)

## Cost

- **Twilio**: ~$1/month per number
- **Vapi**: Usage-based pricing per call/minute
- **Customer**: Included in their subscription

## Alternative: Bring Your Own Number

Customers can still:
1. Purchase their own Twilio number
2. Purchase from another carrier
3. Use "Sync from Vapi" to import existing number

## Benefits

✅ **One-click provisioning** - No manual dashboard navigation  
✅ **Multi-tenant isolation** - Numbers never cross-contaminate  
✅ **Automatic configuration** - Webhooks, fallbacks, assistant attachment  
✅ **Cost pass-through** - Twilio costs covered in subscription  
✅ **Scalable** - Supports unlimited customers  

## Testing

To test locally:
1. Set `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in `.env`
2. Click "Purchase Number" in dashboard or settings
3. Monitor logs for Twilio/Vapi API calls
4. Verify number appears in both Twilio and Vapi dashboards

**Note**: Only works with real Twilio credentials. Cannot test with mock mode.

