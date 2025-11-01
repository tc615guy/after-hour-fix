import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
    const supabase = createServerClient()

    const logs = await prisma.eventLog.findMany({
      where: { projectId, type: { in: ['porting.bill_upload', 'porting.loa_signed'] } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const out = [] as Array<{ id: string; type: string; createdAt: string; meta: any; url: string | null }>
    for (const log of logs) {
      const payload: any = log.payload || {}
      const path = payload.path || payload.url || null
      let signedUrl: string | null = null
      if (path) {
        try {
          const { data } = await supabase.storage.from('porting').createSignedUrl(path, 60 * 60)
          signedUrl = data?.signedUrl || null
        } catch {
          signedUrl = null
        }
      }
      out.push({
        id: (log as any).id,
        type: log.type,
        createdAt: (log as any).createdAt?.toISOString?.() || String((log as any).createdAt),
        meta: {
          fullName: payload.fullName || null,
          agreedAt: payload.agreedAt || null,
          originalName: payload.originalName || null,
        },
        url: signedUrl,
      })
    }

    return NextResponse.json({ docs: out })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to list docs' }, { status: 500 })
  }
}

