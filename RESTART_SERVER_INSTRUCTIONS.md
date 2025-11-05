# 🚨 RESTART OPENAI REALTIME SERVER

## The Problem
The database has been fixed (phone number correctly assigned, agent prompt updated), but the server is still using old cached data and saying "Big Turd Plumbing" instead of "Big Al's Plumbing".

## The Solution
**Restart the OpenAI Realtime server** to clear any cached sessions and force it to reload fresh data from the database.

---

## If Server is on Render

1. Go to https://dashboard.render.com
2. Click on your OpenAI Realtime server service (e.g., `afterhourfix-realtime-server`)
3. Click **"Manual Deploy"** button (or go to "Settings" → "Manual Deploy")
4. Click **"Deploy latest commit"** to trigger a restart
5. Wait 1-2 minutes for deployment to complete
6. Make a test call to verify it's fixed

---

## If Server is on Railway

1. Go to https://railway.app
2. Click on your server service
3. Click **"Deploy"** or **"Redeploy"** button
4. Wait for deployment to complete
5. Make a test call to verify it's fixed

---

## If Server is Running Locally

1. Find the terminal where the server is running
2. Press `Ctrl+C` to stop the server
3. Restart it:
   ```bash
   cd server
   npm run dev
   ```
4. Wait for "Server running on port 8080" message
5. Make a test call to verify it's fixed

---

## After Restart

1. Make a test call to Big Al's Plumbing: `+1 (205) 859-4459`
2. The AI should now say: "Hello, this is Big Al's Plumbing. How can I help you today?"
3. If it still says "Big Turd Plumbing", check server logs for errors

---

## Why This Fixes It

The `RealtimeAgent` class loads agent and project data from the database every time `connect()` is called. However:
- Active WebSocket connections may have been established before the database fix
- The server process may have cached some data in memory
- Restarting forces a fresh connection to the database and clears any cached state

---

## Verification

After restart, you can verify the fix by:

1. **Check server logs** when a call comes in:
   ```
   [RealtimeAgent] Connecting to OpenAI Realtime API for project cmhlctafx0001jm04l219sgr7, agent cmhlctahu0003jm04hm1qiq6m
   [RealtimeAgent] Building system prompt for: Big Al's Plumbing
   ```

2. **Check the call transcript** - should say "Big Al's Plumbing", not "Big Turd Plumbing"

3. **Run the debug script**:
   ```bash
   npx tsx scripts/check-active-sessions.ts
   ```

---

## If It Still Doesn't Work After Restart

1. Check server logs for database connection errors
2. Verify the agent ID in the logs matches: `cmhlctahu0003jm04hm1qiq6m`
3. Check that the project name in logs is "Big Al's Plumbing"
4. If still wrong, there may be a database query issue - check `server/src/realtime-agent.ts`
