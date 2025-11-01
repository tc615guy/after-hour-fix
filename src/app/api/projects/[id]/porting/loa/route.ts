import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateLoaHtml, uploadToPortingBucket, updateLoa } from '@/lib/porting'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
    const { fullName, agreedAt } = await req.json()
    if (!fullName) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    // Get last request data for LOA content
    const lastReq = await prisma.eventLog.findFirst({ where: { projectId, type: 'porting.request' }, orderBy: { createdAt: 'desc' } })
    const payload: any = lastReq?.payload || {}
    const loaHtml = generateLoaHtml({
      number: payload.number,
      businessName: payload.businessName,
      serviceAddress: payload.serviceAddress,
      carrier: payload.carrier,
      contact: payload.contact,
      signer: { fullName, agreedAt: agreedAt || new Date().toISOString() },
    })
    const key = `projects/${projectId}/loa-${Date.now()}.html`
    const uploaded = await uploadToPortingBucket(key, Buffer.from(loaHtml, 'utf-8'), 'text/html')
    const requestId = payload.providerRequestId
    if (requestId) {
      try { await updateLoa(requestId, { fullName, agreedAt: agreedAt || new Date().toISOString(), docUrl: uploaded.signedUrl }) } catch {}
    }
    await prisma.eventLog.create({ data: { projectId, type: 'porting.loa_signed', payload: { fullName, agreedAt, path: uploaded.path } } })
    return NextResponse.json({ success: true, url: uploaded.signedUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'LOA error' }, { status: 500 })
  }
}
