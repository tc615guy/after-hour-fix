import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
import axios from 'axios'

dotenvConfig({ path: '.env.local' })

async function main() {
  const apiKey = process.env.CALCOM_API_KEY
  const baseUrl = process.env.CALCOM_BASE_URL || 'https://api.cal.com/v2'

  console.log('Testing Cal.com API...\n')
  console.log('API Key:', apiKey?.substring(0, 20) + '...')
  console.log('Base URL:', baseUrl)
  console.log()

  // Try different endpoints
  const endpoints = [
    '/me',
    '/event-types',
    '/schedules',
  ]

  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting: ${endpoint}`)
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Cal-Api-Version': '2024-08-13',
        },
      })
      console.log(`✅ Success!`)
      console.log('Response:', JSON.stringify(response.data, null, 2))
    } catch (error: any) {
      console.log(`❌ Failed`)
      console.log('Status:', error.response?.status)
      console.log('Error:', error.response?.data)
    }
  }

  // Try v1 API as fallback
  console.log('\n\n========== Trying V1 API ==========\n')

  try {
    const v1Response = await axios.get('https://api.cal.com/v1/me', {
      params: { apiKey }
    })
    console.log('✅ V1 /me Success!')
    console.log('User:', JSON.stringify(v1Response.data, null, 2))
  } catch (error: any) {
    console.log('❌ V1 /me Failed:', error.response?.data || error.message)
  }

  try {
    const v1Response = await axios.get('https://api.cal.com/v1/event-types', {
      params: { apiKey }
    })
    console.log('\n✅ V1 /event-types Success!')
    console.log('Event Types:', JSON.stringify(v1Response.data, null, 2))
  } catch (error: any) {
    console.log('\n❌ V1 /event-types Failed:', error.response?.data || error.message)
  }
}

main()
