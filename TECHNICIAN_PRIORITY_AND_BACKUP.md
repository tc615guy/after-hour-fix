# Technician Priority & Backup System

## How Technician Priority Works

### Priority Field

The `priority` field on the `Technician` model is an integer where:
- **Higher numbers = Higher priority** (checked first)
- **Lower numbers = Lower priority** (checked later)
- **Default = 0** (lowest priority)

### Example Priority Setup

```
Tech A: priority = 10  (Primary - highest priority)
Tech B: priority = 8   (Backup level 1)
Tech C: priority = 5   (Backup level 2)
Tech D: priority = 2   (Backup level 3)
```

## Initial Emergency Dispatch

When an emergency is dispatched, the system:

1. **Finds all on-call technicians** where:
   - `isActive: true`
   - `isOnCall: true`
   
2. **Orders by priority** (highest first)

3. **Selects the highest priority tech** who is available

```typescript
// From emergency/dispatch/route.ts
const tech = await prisma.technician.findFirst({
  where: { 
    projectId, 
    isActive: true, 
    isOnCall: true 
  },
  orderBy: { priority: 'desc' }, // Highest priority first
})
```

## Backup/Escalation Logic

When a tech doesn't respond within 5 minutes, the system escalates:

1. **Finds backup technicians** where:
   - `isActive: true`
   - `isOnCall: true`
   - `id` ≠ original tech (different technician)
   - `priority < original tech's priority` ⚠️ **Current limitation**

2. **Orders by priority** (highest first)

3. **Selects the highest priority backup** tech

```typescript
// From emergency/check-timeout/route.ts
const nextTech = await prisma.technician.findFirst({
  where: {
    projectId: booking.projectId,
    isActive: true,
    isOnCall: true,
    id: { not: booking.technicianId },
    priority: { lt: booking.technician.priority || 0 }, // Lower priority
  },
  orderBy: { priority: 'desc' },
})
```

## Current Limitations

### ⚠️ Issue: Only Lower Priority Backups

The current logic only finds techs with **lower priority** than the original. This means:

- If Tech A (priority 10) doesn't respond, it will find Tech B (priority 8)
- But if Tech B (priority 8) doesn't respond, it won't find Tech A (priority 10) because 10 is not < 8

**Problem**: Can't escalate "up" to a higher priority tech if they become available later.

### Missing: Explicit Backup Designation

There's no explicit "backup" field. The system infers backups by:
- Same `isOnCall: true` status
- Different priority levels
- Lower priority = backup

## Recommended Improvements

### Option 1: Allow Escalation to Any Available Tech

Allow escalation to any available tech (not just lower priority), but skip the original tech:

```typescript
const nextTech = await prisma.technician.findFirst({
  where: {
    projectId: booking.projectId,
    isActive: true,
    isOnCall: true,
    id: { not: booking.technicianId }, // Just exclude original
    // Remove priority restriction
  },
  orderBy: { priority: 'desc' }, // Still prefer higher priority
})
```

**Pros**: Can escalate to any available tech, including higher priority ones who may have finished their current job.

**Cons**: Might re-assign to the same tech if they're the only one available.

### Option 2: Track Escalation History

Track which techs have already been tried for this booking:

```typescript
// Add to booking or create escalation log
const triedTechIds = [booking.technicianId, ...booking.escalationHistory]

const nextTech = await prisma.technician.findFirst({
  where: {
    projectId: booking.projectId,
    isActive: true,
    isOnCall: true,
    id: { notIn: triedTechIds }, // Exclude all tried techs
  },
  orderBy: { priority: 'desc' },
})
```

**Pros**: Prevents re-assigning to techs who already didn't respond.

**Cons**: Requires schema changes to track escalation history.

### Option 3: Add Explicit Backup Groups

Add a `backupGroup` or `escalationOrder` field:

```prisma
model Technician {
  // ... existing fields
  priority Int @default(0)
  escalationOrder Int? // Explicit order for escalation (1, 2, 3...)
  backupFor String[] // Array of tech IDs this tech backs up
}
```

**Pros**: Explicit control over backup relationships.

**Cons**: More complex schema and management.

## Current Behavior Summary

✅ **What Works:**
- Initial dispatch finds highest priority tech
- Escalation finds next available tech with lower priority
- All techs must have `isOnCall: true` to be considered

⚠️ **What's Limited:**
- Can only escalate to lower priority techs
- Can't escalate "up" to higher priority techs
- No tracking of which techs have been tried
- No explicit backup designation

## Setting Up Technician Priority

### Recommended Priority Structure

For a typical team of 3-4 techs:

```
Primary On-Call (Week 1):
  - Tech A: priority = 10

Backup On-Call (Week 1):
  - Tech B: priority = 8

Secondary Backups:
  - Tech C: priority = 5
  - Tech D: priority = 2
```

### How to Set Priority

1. **Via Dashboard**: Edit technician and set priority number
2. **Via API**: Update technician with `priority` field
3. **Via Database**: Direct update to `Technician.priority`

### Example: Rotating On-Call Schedule

Week 1:
- Tech A: `isOnCall: true`, `priority: 10`
- Tech B: `isOnCall: true`, `priority: 8`
- Tech C: `isOnCall: false` (not on call)

Week 2:
- Tech A: `isOnCall: false`
- Tech B: `isOnCall: true`, `priority: 10` (promoted)
- Tech C: `isOnCall: true`, `priority: 8` (backup)

## Questions for You

1. **Should we allow escalation to higher priority techs?** (If they become available)
2. **Should we track which techs have been tried?** (Prevent re-assignment)
3. **Do you want explicit backup designation?** (e.g., "Tech B backs up Tech A")
4. **Should we add escalation limits?** (e.g., max 3 escalations per booking)

