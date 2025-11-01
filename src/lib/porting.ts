import { createServerClient } from '@/lib/supabase/server'

const PROVIDER_URL = process.env.PORTING_PROVIDER_API_URL || ''
const PROVIDER_KEY = process.env.PORTING_API_KEY || ''

async function providerFetch(path: string, init: RequestInit = {}) {
  if (!PROVIDER_URL || !PROVIDER_KEY) {
    throw new Error('Porting provider not configured')
  }
  const res = await fetch(`${PROVIDER_URL}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${PROVIDER_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  } as any)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || res.statusText)
  return data
}

export async function createPortingRequest(input: any) {
  // Expected shape mapping for provider API
  const payload = {
    number: input.number,
    carrier: input.carrier,
    businessName: input.businessName,
    serviceAddress: input.serviceAddress,
    billingAddress: input.billingAddress,
    contact: input.contact,
    account: input.account,
  }
  return providerFetch('/porting/requests', { method: 'POST', body: JSON.stringify(payload) })
}

export async function attachDocument(requestId: string, docType: 'bill' | 'loa', url: string) {
  const payload = { type: docType, url }
  return providerFetch(`/porting/requests/${encodeURIComponent(requestId)}/documents`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateLoa(requestId: string, signer: { fullName: string; agreedAt: string; docUrl: string }) {
  return providerFetch(`/porting/requests/${encodeURIComponent(requestId)}/loa`, {
    method: 'POST',
    body: JSON.stringify(signer),
  })
}

export async function ensurePortingBucket() {
  const supabase = createServerClient()
  // Best-effort create bucket
  try {
    // @ts-ignore
    // Supabase JS v2
    await (supabase as any).storage.createBucket('porting', { public: false })
  } catch {}
}

export async function uploadToPortingBucket(path: string, file: Buffer | ArrayBuffer, contentType: string) {
  const supabase = createServerClient()
  await ensurePortingBucket()
  const { data, error } = await (supabase as any).storage.from('porting').upload(path, file as any, {
    contentType,
    upsert: true,
  })
  if (error) throw new Error(error.message)
  const { data: signed } = await (supabase as any).storage.from('porting').createSignedUrl(path, 60 * 60 * 24)
  return { path, signedUrl: signed?.signedUrl as string }
}

export function generateLoaHtml(input: {
  number: string
  businessName: string
  serviceAddress?: string
  carrier?: string
  contact?: { name?: string; email?: string; phone?: string }
  signer?: { fullName: string; agreedAt: string }
}) {
  const d = input
  return `<!DOCTYPE html>
  <html><head><meta charset="utf-8"><title>Letter of Authorization</title>
  <style>body{font-family: Arial, sans-serif;line-height:1.6;color:#111;padding:24px} h1{font-size:20px} .box{border:1px solid #ddd;padding:12px;border-radius:8px;margin:12px 0}</style></head>
  <body>
    <h1>Letter of Authorization (LOA)</h1>
    <p>I hereby authorize AfterHourFix to port the telephone number listed below from my current service provider.</p>
    <div class="box">
      <div><strong>Phone Number:</strong> ${d.number}</div>
      <div><strong>Current Carrier:</strong> ${d.carrier || ''}</div>
      <div><strong>Business Legal Name:</strong> ${d.businessName}</div>
      <div><strong>Service Address:</strong> ${d.serviceAddress || ''}</div>
      <div><strong>Authorized Contact:</strong> ${d.contact?.name || ''} (${d.contact?.email || ''}${d.contact?.phone ? ', ' + d.contact.phone : ''})</div>
    </div>
    <div class="box">
      <div><strong>Signer:</strong> ${d.signer?.fullName || ''}</div>
      <div><strong>Date:</strong> ${d.signer?.agreedAt || ''}</div>
    </div>
    <p>By signing, I confirm I have authority to request this change for the number above.</p>
  </body></html>`
}

