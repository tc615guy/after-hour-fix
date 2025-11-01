import { NextRequest } from 'next/server'

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function getLogger(req?: NextRequest, context?: { userId?: string; projectId?: string }) {
  const base = {
    requestId: req?.headers.get('x-request-id') || genId(),
    ip: req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    userId: context?.userId,
    projectId: context?.projectId,
  }
  return {
    info: (msg: string, extra?: any) => console.log(JSON.stringify({ level: 'info', msg, ...base, ...extra })),
    warn: (msg: string, extra?: any) => console.warn(JSON.stringify({ level: 'warn', msg, ...base, ...extra })),
    error: (msg: string, extra?: any) => console.error(JSON.stringify({ level: 'error', msg, ...base, ...extra })),
  }
}

