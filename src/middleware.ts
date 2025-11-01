import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// No-op middleware. Admin auth is enforced in route handlers.
export function middleware(req: NextRequest) {
  return NextResponse.next()
}

export const config = {}
