import { prisma } from '@/lib/db'

export async function audit(params: {
  projectId?: string
  type: string
  payload: any
}) {
  try {
    await prisma.eventLog.create({
      data: {
        projectId: params.projectId,
        type: params.type,
        payload: params.payload,
      },
    })
  } catch {
    // best-effort only
  }
}

