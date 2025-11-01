import { initSentry } from '@/lib/api-guard'

export async function register() {
  await initSentry()
}

