import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get the first project
  const project = await prisma.project.findFirst()
  if (!project) {
    console.error('No project found')
    return
  }

  console.log('Testing booking endpoint...')
  console.log('Project:', project.name)
  console.log('Cal.com API Key:', project.calcomApiKey ? 'Set' : 'Not set')
  console.log('Cal.com User:', project.calcomUser || 'Not set')

  // Test with sample data
  const testData = {
    projectId: project.id,
    customerName: 'John Doe',
    customerPhone: '+15551234567',
    address: '123 Main St, City, ST 12345',
    notes: 'Test plumbing issue - leaky faucet',
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
  }

  console.log('\nTest booking data:')
  console.log(JSON.stringify(testData, null, 2))

  try {
    const response = await fetch('http://localhost:3000/api/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    })

    console.log('\nResponse status:', response.status)
    const result = await response.json()
    console.log('Response:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('Error:', error)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
