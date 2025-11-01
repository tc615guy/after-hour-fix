import axios from 'axios'
import { prisma } from '@/lib/db'

async function main() {
  const apiKey = process.env.VAPI_API_KEY
  if (!apiKey) throw new Error('VAPI_API_KEY is not set')

  // Build assistantId -> projectId map from our DB
  const projects = await prisma.project.findMany({
    include: { agents: true },
  })
  const assistantToProject = new Map<string, { projectId: string; projectName: string }>()
  for (const p of projects) {
    for (const a of p.agents) {
      if (a.vapiAssistantId) assistantToProject.set(a.vapiAssistantId, { projectId: p.id, projectName: p.name })
    }
  }

  const http = axios.create({
    baseURL: 'https://api.vapi.ai',
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  // Fetch all phone numbers from Vapi account
  const resp = await http.get('/phone-number')
  const numbers: Array<{ id: string; number: string; assistantId?: string | null; provider?: string }> = resp.data

  let upserts = 0
  for (const num of numbers) {
    const aId = num.assistantId || ''
    const match = assistantToProject.get(aId)
    if (!match) continue

    // Upsert into our PhoneNumber table by e164 number
    await prisma.phoneNumber.upsert({
      where: { e164: num.number },
      update: {
        projectId: match.projectId,
        vapiNumberId: num.id,
        label: 'Main',
      },
      create: {
        projectId: match.projectId,
        e164: num.number,
        vapiNumberId: num.id,
        label: 'Main',
      },
    })

    upserts++
    console.log(`Linked ${num.number} -> ${match.projectName} (${match.projectId})`)
  }

  console.log(`Sync complete. Upserts: ${upserts}`)
}

main()
  .catch((err) => {
    console.error('Sync failed:', err.response?.data || err.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

