import { PrismaClient } from '@prisma/client'

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
const prisma = new PrismaClient(
  databaseUrl
    ? { datasources: { db: { url: databaseUrl } } }
    : undefined
)

async function main() {
  console.log('Seeding database...')
  if (databaseUrl) {
    const masked = databaseUrl.replace(/(:)([^:@\/\?]+)(@)/, '$1****$3')
    console.log('Using DB URL:', masked)
  } else {
    console.log('No DATABASE_URL or DIRECT_URL found in env')
  }

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
    },
  })

  console.log('Created user:', user.email)

  // Create subscription
  const subscription = await prisma.subscription.upsert({
    where: { stripeCustomerId: 'cus_demo' },
    update: {},
    create: {
      userId: user.id,
      stripeCustomerId: 'cus_demo',
      stripeSubId: 'sub_demo',
      priceId: 'price_starter',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  })

  console.log('Created subscription:', subscription.id)

  // Create demo project
  const project = await prisma.project.upsert({
    where: { id: 'demo-project' },
    update: {},
    create: {
      id: 'demo-project',
      ownerId: user.id,
      name: 'Demo Plumbing',
      trade: 'plumbing',
      timezone: 'America/Chicago',
      calcomApiKey: 'demo_key_encrypted',
      calcomUser: 'demoplumber',
    },
  })

  console.log('Created project:', project.name)

  // Create demo agent
  const agent = await prisma.agent.upsert({
    where: { id: 'demo-agent' },
    update: {},
    create: {
      id: 'demo-agent',
      projectId: project.id,
      vapiAssistantId: 'vapi_demo_assistant',
      name: 'Demo Plumbing AI',
      voice: 'adam',
      basePrompt: 'You are an AI receptionist for Demo Plumbing...',
      minutesThisPeriod: 45,
    },
  })

  console.log('Created agent:', agent.name)

  // Create demo phone number
  const phoneNumber = await prisma.phoneNumber.upsert({
    where: { e164: '+15551234567' },
    update: {},
    create: {
      projectId: project.id,
      e164: '+15551234567',
      vapiNumberId: 'vapi_demo_number',
      label: 'Main',
    },
  })

  console.log('Created phone number:', phoneNumber.e164)

  // Create demo calls
  const calls = [
    {
      projectId: project.id,
      agentId: agent.id,
      vapiCallId: 'call_1',
      direction: 'inbound',
      fromNumber: '+15559876543',
      toNumber: phoneNumber.e164,
      status: 'completed',
      durationSec: 180,
      transcript: 'Customer called about a leaking pipe emergency.',
      intent: 'emergency',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      projectId: project.id,
      agentId: agent.id,
      vapiCallId: 'call_2',
      direction: 'inbound',
      fromNumber: '+15551112222',
      toNumber: phoneNumber.e164,
      status: 'completed',
      durationSec: 120,
      transcript: 'Customer requested a quote for water heater installation.',
      intent: 'quote',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      projectId: project.id,
      agentId: agent.id,
      vapiCallId: 'call_3',
      direction: 'inbound',
      fromNumber: '+15553334444',
      toNumber: phoneNumber.e164,
      status: 'completed',
      durationSec: 90,
      transcript: 'Customer wanted to schedule routine maintenance.',
      intent: 'callback',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
  ]

  for (const callData of calls) {
    await prisma.call.create({ data: callData })
  }

  console.log('Created 3 demo calls')

  // Create demo bookings
  const bookings = [
    {
      projectId: project.id,
      customerName: 'John Smith',
      customerPhone: '+15559876543',
      address: '123 Main St, Chicago, IL',
      notes: 'Leaking pipe under kitchen sink - emergency',
      slotStart: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      slotEnd: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
      priceCents: 20000, // $200
      status: 'booked',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      projectId: project.id,
      customerName: 'Sarah Johnson',
      customerPhone: '+15551112222',
      address: '456 Oak Ave, Chicago, IL',
      notes: 'Water heater replacement quote',
      slotStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
      slotEnd: new Date(Date.now() + 25 * 60 * 60 * 1000),
      priceCents: 150000, // $1,500
      status: 'booked',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ]

  for (const bookingData of bookings) {
    await prisma.booking.create({ data: bookingData })
  }

  console.log('Created 2 demo bookings')

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
