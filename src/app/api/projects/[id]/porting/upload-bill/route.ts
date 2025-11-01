import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { uploadToPortingBucket, attachDocument } from '@/lib/porting'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    const arrayBuf = await file.arrayBuffer()
    const key = `projects/${projectId}/bill-${Date.now()}-${file.name}`
    const uploaded = await uploadToPortingBucket(key, Buffer.from(arrayBuf), file.type || 'application/octet-stream')

    // Find provider request id from last porting.request
    const lastReq = await prisma.eventLog.findFirst({
      where: { projectId, type: 'porting.request' },
      orderBy: { createdAt: 'desc' },
    })
    const requestId = (lastReq?.payload as any)?.providerRequestId
    if (requestId) {
      try { await attachDocument(requestId, 'bill', uploaded.signedUrl) } catch {}
    }

    await prisma.eventLog.create({ data: { projectId, type: 'porting.bill_upload', payload: { path: uploaded.path, originalName: file.name || null } } })
    return NextResponse.json({ success: true, url: uploaded.signedUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 })
  }
}
