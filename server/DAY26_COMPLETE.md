# Day 26 Complete! 🎉

## What We Built Today

### ✅ Migration Scripts

Created comprehensive, production-ready migration scripts to safely migrate agents and phone numbers between Vapi and OpenAI Realtime systems.

## Scripts Created

### 1. **`scripts/migrate-to-openai-realtime.ts`**

**Purpose:** Migrate agents and phone numbers from Vapi to OpenAI Realtime.

**Features:**
- Updates agent `systemType` to `'openai-realtime'`
- Updates phone number `systemType` to `'openai-realtime'`
- Configures Twilio phone numbers to point to OpenAI Realtime server
- Logs all changes to EventLog
- Dry-run mode for safe preview
- Supports single agent, project-wide, or bulk migration

**Usage:**
```bash
# Migrate specific agent
tsx scripts/migrate-to-openai-realtime.ts --agent-id <agent-id>

# Migrate all agents for a project (recommended)
tsx scripts/migrate-to-openai-realtime.ts --project-id <project-id>

# Preview changes without applying
tsx scripts/migrate-to-openai-realtime.ts --project-id <project-id> --dry-run

# Migrate all Vapi agents (use with caution)
tsx scripts/migrate-to-openai-realtime.ts --all
```

**Safety Features:**
- ✅ Dry-run mode to preview changes
- ✅ Idempotent (skips already migrated agents)
- ✅ Error handling per phone number (one failure doesn't stop others)
- ✅ Detailed logging and summary report
- ✅ 5-second confirmation delay for bulk migrations

### 2. **`scripts/rollback-to-vapi.ts`**

**Purpose:** Rollback agents and phone numbers from OpenAI Realtime back to Vapi.

**Features:**
- Updates agent `systemType` back to `'vapi'`
- Updates phone number `systemType` back to `'vapi'`
- Re-configures phone numbers to use Vapi (via Vapi API)
- Logs all changes to EventLog
- Dry-run mode for safe preview

**Usage:**
```bash
# Rollback specific agent
tsx scripts/rollback-to-vapi.ts --agent-id <agent-id>

# Rollback all agents for a project
tsx scripts/rollback-to-vapi.ts --project-id <project-id>

# Preview changes without applying
tsx scripts/rollback-to-vapi.ts --project-id <project-id> --dry-run
```

**Safety Features:**
- ✅ Dry-run mode
- ✅ Idempotent (skips already rolled back agents)
- ✅ Error handling per phone number
- ✅ Detailed logging and summary report

### 3. **`scripts/check-migration-status.ts`**

**Purpose:** Check migration status of agents and phone numbers.

**Features:**
- Shows current system type for all agents
- Shows current system type for all phone numbers
- Identifies mismatches between agent and phone number system types
- Provides migration recommendations
- Statistics summary

**Usage:**
```bash
# Check all agents
tsx scripts/check-migration-status.ts

# Check specific project
tsx scripts/check-migration-status.ts --project-id <project-id>

# Show only Vapi agents (need migration)
tsx scripts/check-migration-status.ts --vapi-only
```

## Migration Workflow

### Step 1: Check Current Status
```bash
tsx scripts/check-migration-status.ts
```

### Step 2: Preview Migration
```bash
tsx scripts/migrate-to-openai-realtime.ts --project-id <project-id> --dry-run
```

### Step 3: Execute Migration
```bash
tsx scripts/migrate-to-openai-realtime.ts --project-id <project-id>
```

### Step 4: Verify Migration
```bash
tsx scripts/check-migration-status.ts --project-id <project-id>
```

### Step 5: Rollback (if needed)
```bash
tsx scripts/rollback-to-vapi.ts --project-id <project-id> --dry-run
tsx scripts/rollback-to-vapi.ts --project-id <project-id>
```

## What Each Script Does

### Migration Script (`migrate-to-openai-realtime.ts`)

1. **Validates Input:**
   - Checks agent exists
   - Verifies Twilio credentials are configured
   - Skips already migrated agents

2. **Updates Database:**
   - Sets `agent.systemType = 'openai-realtime'`
   - Sets `phoneNumber.systemType = 'openai-realtime'` for all project numbers

3. **Configures Twilio:**
   - Updates phone number `voiceUrl` to point to OpenAI Realtime server
   - Updates `statusCallback` URL
   - Sets HTTP method to POST

4. **Logs Changes:**
   - Creates EventLog entry with migration details
   - Tracks phone numbers migrated and success rate

### Rollback Script (`rollback-to-vapi.ts`)

1. **Validates Input:**
   - Checks agent exists
   - Verifies Vapi credentials are configured
   - Skips already rolled back agents

2. **Updates Database:**
   - Sets `agent.systemType = 'vapi'`
   - Sets `phoneNumber.systemType = 'vapi'` for all project numbers

3. **Re-configures Vapi:**
   - Re-attaches phone numbers to Vapi assistants
   - Ensures Vapi webhook URLs are configured

4. **Logs Changes:**
   - Creates EventLog entry with rollback details

### Status Checker (`check-migration-status.ts`)

1. **Queries Database:**
   - Fetches all agents (optionally filtered by project)
   - Includes associated phone numbers

2. **Analyzes Status:**
   - Identifies system type for each agent and phone number
   - Detects mismatches between agent and phone number system types

3. **Reports:**
   - Pretty-printed status with icons and colors
   - Statistics summary
   - Migration recommendations
   - Warnings for mismatches

## Environment Variables Required

### For Migration Script:
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `OPENAI_REALTIME_SERVER_URL` (optional) - OpenAI Realtime server URL (defaults to `NEXT_PUBLIC_APP_URL`)

### For Rollback Script:
- `VAPI_API_KEY` - Vapi API key
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `NEXT_PUBLIC_APP_URL` - Application URL

### For Status Checker:
- No special requirements (just database access)

## Error Handling

All scripts include comprehensive error handling:

- **Per-item errors:** One failure doesn't stop the entire migration
- **Detailed error messages:** Shows exactly what failed and why
- **Summary report:** Shows success/failure counts
- **Exit codes:** Scripts exit with non-zero code if any failures occur

## Testing Checklist

### ✅ Migration Script
- [ ] Dry-run works correctly
- [ ] Single agent migration works
- [ ] Project-wide migration works
- [ ] Twilio configuration updates correctly
- [ ] EventLog entries created
- [ ] Idempotent (running twice is safe)

### ✅ Rollback Script
- [ ] Dry-run works correctly
- [ ] Single agent rollback works
- [ ] Project-wide rollback works
- [ ] Vapi re-configuration works
- [ ] EventLog entries created
- [ ] Idempotent (running twice is safe)

### ✅ Status Checker
- [ ] Shows all agents correctly
- [ ] Filters by project correctly
- [ ] Detects mismatches correctly
- [ ] Statistics are accurate

## Best Practices

1. **Always use dry-run first** to preview changes
2. **Start with a single agent** to test the process
3. **Check status before and after** to verify changes
4. **Monitor EventLog** for migration entries
5. **Test phone calls** after migration to ensure routing works
6. **Keep rollback script ready** in case issues occur

## Next Steps

### Day 27-30: Migration Execution
- Pilot migration with 1-2 test agents
- Monitor both systems during parallel operation
- Gradual rollout (25% → 50% → 100%)
- Full migration completion

## Files Created

1. **`scripts/migrate-to-openai-realtime.ts`** - Migration script
2. **`scripts/rollback-to-vapi.ts`** - Rollback script
3. **`scripts/check-migration-status.ts`** - Status checker
4. **`server/DAY26_COMPLETE.md`** - This document

## Important Notes

1. **Backup First:** Always backup database before bulk migrations
2. **Test Environment:** Test scripts in a development/staging environment first
3. **Gradual Migration:** Migrate agents gradually, not all at once
4. **Monitor Closely:** Watch logs and call quality during migration
5. **Keep Vapi Active:** Don't remove Vapi integration until all agents are migrated and verified
