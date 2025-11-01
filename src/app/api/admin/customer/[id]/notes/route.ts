import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const UpdateNotesSchema = z.object({
  notes: z.string(),
  adminEmail: z.string().email(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params // This is the project ID from URL
    const body = await req.json()
    const { notes, adminEmail } = UpdateNotesSchema.parse(body)

    // Verify admin access
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    })

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Update project with admin notes
    await prisma.project.update({
      where: { id: projectId },
      data: { adminNotes: notes },
    })

    // Log the update
    await prisma.eventLog.create({
      data: {
        projectId,
        type: 'admin.notes_updated',
        payload: {
          adminEmail: adminUser.email,
          projectId,
          notesLength: notes.length,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Update notes error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
