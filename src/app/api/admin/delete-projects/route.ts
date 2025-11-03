import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api-guard'

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    const { projectNames } = await req.json()
    
    if (!Array.isArray(projectNames)) {
      return NextResponse.json({ error: 'projectNames must be an array' }, { status: 400 })
    }

    console.log(`[Admin] Deleting projects: ${projectNames.join(', ')}`)
    
    const results: Array<{ name: string; id: string; success: boolean; error?: string }> = []

    for (const name of projectNames) {
      try {
        const projects = await prisma.project.findMany({
          where: {
            name: {
              contains: name,
              mode: 'insensitive'
            },
            deletedAt: null,
          },
        })

        if (projects.length === 0) {
          results.push({ name, id: '', success: false, error: 'Not found' })
          continue
        }

        for (const project of projects) {
          await prisma.project.update({
            where: { id: project.id },
            data: { deletedAt: new Date() },
          })
          
          results.push({ name: project.name, id: project.id, success: true })
          console.log(`[Admin] Soft-deleted project: ${project.name} (${project.id})`)
        }
      } catch (error: any) {
        console.error(`[Admin] Failed to delete ${name}:`, error.message)
        results.push({ name, id: '', success: false, error: error.message })
      }
    }

    const successCount = results.filter(r => r.success).length
    
    return NextResponse.json({ 
      success: true, 
      deleted: successCount, 
      total: projectNames.length,
      results 
    })
  } catch (error: any) {
    console.error('[Admin] Delete projects error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete projects' }, { status: 500 })
  }
}

