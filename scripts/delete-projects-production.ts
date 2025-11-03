#!/usr/bin/env tsx

/**
 * Script to delete JB Plumbing and Big Daddy Plumbing via production API
 * Run this after pushing to production: curl -X POST https://afterhourfix.com/api/admin/delete-projects
 */

import 'dotenv/config'
import fetch from 'node-fetch'

async function main() {
  const projectNames = ['JB Plumbing', 'Big Daddy Plumbing']
  
  console.log(`🔍 Deleting projects: ${projectNames.join(', ')}\n`)

  // This will work once deployed since we have session-based admin auth
  console.log('⚠️  Note: This script requires admin session authentication.')
  console.log('   Run this via the browser console at https://afterhourfix.com/admin:\n')
  console.log(`   fetch('/api/admin/delete-projects', {`)
  console.log(`     method: 'POST',`)
  console.log(`     headers: { 'Content-Type': 'application/json' },`)
  console.log(`     body: JSON.stringify({ projectNames: ${JSON.stringify(projectNames)} })`)
  console.log(`   }).then(r => r.json()).then(console.log)\n`)
  
  console.log('Or use curl with your session cookie:')
  console.log(`   curl -X POST https://afterhourfix.com/api/admin/delete-projects \\`)
  console.log(`     -H "Content-Type: application/json" \\`)
  console.log(`     -d '{"projectNames": ${JSON.stringify(projectNames)}}'`)
}

main()
  .catch(console.error)

