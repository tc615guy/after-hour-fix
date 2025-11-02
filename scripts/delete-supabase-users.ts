#!/usr/bin/env tsx

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const emailsToDelete = [
  'josh.lanius@gmail.com',
  'josh.lanius@icloud.com',
  'thecryptoguy615@yahoo.com'
]

async function deleteUsers() {
  console.log('🗑️  Deleting users from Supabase Auth...\n')

  for (const email of emailsToDelete) {
    try {
      // Find user by email
      const { data: users, error: listError } = await supabase.auth.admin.listUsers()

      if (listError) {
        console.error(`   ❌ Error listing users: ${listError.message}`)
        continue
      }

      const user = users.users.find(u => u.email === email)

      if (!user) {
        console.log(`   ⚠️  ${email} - Not found in Supabase`)
        continue
      }

      // Delete user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

      if (deleteError) {
        console.error(`   ❌ ${email} - Delete failed: ${deleteError.message}`)
      } else {
        console.log(`   ✅ ${email} - Deleted from Supabase`)
      }
    } catch (e: any) {
      console.error(`   ❌ ${email} - Exception: ${e.message}`)
    }
  }

  console.log('\n✨ Done!')
}

deleteUsers()
