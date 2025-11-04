# OpenAI Realtime UI Migration TODO

## 🎯 Goal
Remove all Vapi UI/UX references from dashboard, settings, and onboarding. Update to OpenAI Realtime-only interface.

## ⚠️ Important Notes
- **Backend code stays**: Vapi API routes, webhooks, and database schema remain for backward compatibility
- **No toggle needed**: System always uses OpenAI Realtime (no system type switching)
- **Agent creation**: Creates Agent DB record with `systemType='openai-realtime'` (no Vapi assistant creation)

---

## 📋 TODO Checklist

### 1. Dashboard Updates (`src/app/dashboard/page.tsx`)
- [ ] Remove system type badge (Vapi/OpenAI toggle display)
- [ ] Update "AI Assistant Phone Number" card to show OpenAI Realtime branding
- [ ] Remove any Vapi-specific messaging
- [ ] Update phone number status badges (always show OpenAI Realtime)
- [ ] Update call statistics to show OpenAI Realtime metrics
- [ ] Add OpenAI Realtime status indicator (connected/disconnected)
- [ ] Update helper text and descriptions to reference OpenAI Realtime

### 2. Settings Page - Assistant Tab (`src/app/projects/[id]/settings/page.tsx`)
- [ ] **REMOVE** `SystemTypeManager` component completely
- [ ] Update `AssistantConfig` component to remove Vapi references:
  - [ ] Remove `vapiAssistantId` display
  - [ ] Update voice/model info to show OpenAI Realtime specs
  - [ ] Remove "Cartesia Sonic 3 - Ariana" (Vapi-specific)
  - [ ] Update to show OpenAI voice options (alloy, echo, fable, onyx, nova, shimmer)
  - [ ] Update model display to show "OpenAI GPT-4o Realtime"
- [ ] Update usage stats to show OpenAI Realtime metrics (not Vapi minutes)
- [ ] Remove "Sync from Vapi" button (if exists)
- [ ] Update "Create AI Assistant" button to create OpenAI Realtime agent only

### 3. Settings Page - Numbers Tab (`src/app/projects/[id]/settings/page.tsx`)
- [ ] Remove system type badge from phone number card
- [ ] Remove "Sync from Vapi" button
- [ ] Update phone number purchase flow to use OpenAI Realtime server
- [ ] Update phone number status to show OpenAI Realtime connection status
- [ ] Remove Vapi-specific configuration options

### 4. AssistantConfig Component (`src/components/AssistantConfig.tsx`)
- [ ] Remove `vapiAssistantId` from type and display
- [ ] Update voice settings section:
  - [ ] Show OpenAI voice options (alloy, echo, fable, onyx, nova, shimmer)
  - [ ] Remove Cartesia/11Labs references
  - [ ] Add voice selection dropdown (if needed)
- [ ] Update model settings:
  - [ ] Show "OpenAI GPT-4o Realtime"
  - [ ] Remove Vapi-specific model info
- [ ] Update usage stats:
  - [ ] Change "Minutes Used This Period" to OpenAI Realtime metrics
  - [ ] Show call count, duration, average latency
- [ ] Remove "Assistant ID" display (was Vapi assistant ID)
- [ ] Update all descriptions to reference OpenAI Realtime

### 5. SystemTypeManager Component (`src/components/SystemTypeManager.tsx`)
- [ ] **OPTION 1**: Delete component entirely (recommended)
- [ ] **OPTION 2**: Keep but make it always show "OpenAI Realtime" (disabled state)
- [ ] Remove from all imports and usage

### 6. PhoneSetup Component (`src/components/PhoneSetup.tsx`)
- [ ] Update to configure numbers for OpenAI Realtime server only
- [ ] Remove Vapi configuration options
- [ ] Update purchase flow to use OpenAI Realtime server URL
- [ ] Remove "Sync from Vapi" functionality

### 7. Onboarding Page (`src/app/onboarding/page.tsx`)
- [ ] Update messaging to reference OpenAI Realtime
- [ ] Remove any Vapi mentions
- [ ] Update "What happens next?" section:
  - [ ] "Your OpenAI Realtime assistant will be created automatically"
  - [ ] Remove Vapi-specific steps
- [ ] Update agent creation API call to set `systemType='openai-realtime'`

### 8. API Routes - Agent Creation (`src/app/api/agents/route.ts`)
- [ ] **Update POST /api/agents**:
  - [ ] Remove Vapi assistant creation
  - [ ] Create Agent record with `systemType='openai-realtime'`
  - [ ] Set `vapiAssistantId` to placeholder or null (or remove requirement)
  - [ ] Return agent data without Vapi references

### 9. API Routes - Project Creation (`src/app/api/projects/route.ts`)
- [ ] **Update POST /api/projects**:
  - [ ] Remove automatic Vapi assistant creation
  - [ ] Create Agent record directly with `systemType='openai-realtime'`
  - [ ] Remove Vapi client calls

### 10. API Routes - Phone Number Purchase (`src/app/api/numbers/route.ts`)
- [ ] **Update POST /api/numbers**:
  - [ ] Remove Vapi phone number purchase
  - [ ] Configure Twilio number to point to OpenAI Realtime server
  - [ ] Set `systemType='openai-realtime'` automatically
  - [ ] Update server URL to OpenAI Realtime server endpoint

### 11. FirstTimeSettingsChecklist (`src/components/FirstTimeSettingsChecklist.tsx`)
- [ ] Update checklist items to reference OpenAI Realtime
- [ ] Remove Vapi-specific steps
- [ ] Update "Configure AI Assistant" description

### 12. Dashboard Call Analytics
- [ ] Update to show OpenAI Realtime call data
- [ ] Show metrics from OpenAI Realtime server analytics
- [ ] Remove Vapi-specific metrics

### 13. Mobile Nav & Navigation
- [ ] Remove any Vapi references in navigation
- [ ] Update tooltips and help text

### 14. Error Messages & Alerts
- [ ] Update error messages to reference OpenAI Realtime
- [ ] Remove Vapi-specific error handling UI

### 15. Documentation & Help Text
- [ ] Update all user-facing help text
- [ ] Update tooltips
- [ ] Update onboarding instructions

---

## 🔧 Backend Changes Needed

### API Endpoints to Update:
1. `POST /api/agents` - Create OpenAI Realtime agent only
2. `POST /api/projects` - Create project with OpenAI Realtime agent
3. `POST /api/numbers` - Purchase number for OpenAI Realtime server

### Database Considerations:
- Keep `Agent.systemType` field (default to 'openai-realtime')
- Keep `PhoneNumber.systemType` field (default to 'openai-realtime')
- `Agent.vapiAssistantId` can be nullable or removed (but keep for backward compatibility)

---

## ✅ Testing Checklist

### After Changes:
- [ ] Create new project via onboarding
- [ ] Verify agent created with `systemType='openai-realtime'`
- [ ] Purchase phone number
- [ ] Verify number configured for OpenAI Realtime server
- [ ] Check dashboard displays correctly
- [ ] Check settings page shows OpenAI Realtime info
- [ ] Verify no Vapi UI elements visible
- [ ] Test existing projects (should still work)

---

## 🚀 Implementation Order

1. **Phase 1: Remove UI Components**
   - Remove SystemTypeManager from settings
   - Update AssistantConfig component
   - Update dashboard phone number card

2. **Phase 2: Update Agent Creation**
   - Update POST /api/agents to create OpenAI Realtime agent only
   - Update POST /api/projects to skip Vapi assistant creation

3. **Phase 3: Update Phone Number Flow**
   - Update POST /api/numbers to configure for OpenAI Realtime

4. **Phase 4: Update Onboarding**
   - Update messaging and agent creation flow

5. **Phase 5: Polish & Testing**
   - Update all help text and descriptions
   - Test complete flow
   - Verify no Vapi references remain

---

## 📝 Notes

- **Keep backend code**: Vapi webhooks, API routes, and migration scripts remain for backward compatibility
- **Default to OpenAI**: All new agents and numbers default to `systemType='openai-realtime'`
- **No breaking changes**: Existing projects continue to work (just won't show Vapi UI)
