import { prisma } from '@/lib/db'

let envFlags: Record<string, boolean> | null = null
function loadEnvFlags() {
  if (envFlags !== null) return envFlags
  try {
    envFlags = JSON.parse(process.env.FEATURE_FLAGS_JSON || '{}')
  } catch {
    envFlags = {}
  }
  return envFlags
}

export async function isFlagEnabled(key: string, projectId?: string) {
  const flags = loadEnvFlags()
  if (flags && key in flags) return !!(flags as any)[key]
  try {
    const rec = await prisma.featureFlag.findUnique({ where: { key_projectId: { key, projectId: projectId || null } } as any })
    if (rec) return rec.enabled
  } catch {
    // ignore
  }
  return false
}
