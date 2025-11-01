import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
import { createVapiClient } from '@/lib/vapi'

dotenvConfig({ path: '.env.local' })

async function main() {
  const vapi = createVapiClient()
  const preferred = process.env.AREACODE || ''
  const areaCodes = [
    preferred,
    '312', // Chicago
    '773', // Chicago
    '872', // Chicago overlay
    '708', // Chicago suburbs
    '415', // SF fallback
  ].filter(Boolean)

  for (const ac of areaCodes) {
    try {
      const nums = await vapi.searchPhoneNumbers(ac)
      if (nums.length > 0) {
        console.log(`Found ${nums.length} numbers for area code ${ac}`)
        for (const n of nums.slice(0, 10)) {
          console.log(`${n.number} (provider: ${n.provider})`)
        }
        return
      }
    } catch (e) {
      console.error('Search error:', e)
    }
  }

  // last resort: search without area code
  const any = await vapi.searchPhoneNumbers()
  if (any.length > 0) {
    console.log('Found numbers without area code preference:')
    for (const n of any.slice(0, 10)) {
      console.log(`${n.number} (provider: ${n.provider})`)
    }
    return
  }

  console.log('No numbers available at this time.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

