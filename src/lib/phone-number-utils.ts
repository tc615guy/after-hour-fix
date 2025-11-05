import { prisma } from './db'

/**
 * Phone number utilities for safe assignment and cleanup
 */

/**
 * Soft-delete all phone numbers for a project when the project is deleted
 */
export async function cleanupPhoneNumbersForDeletedProject(projectId: string): Promise<void> {
  const result = await prisma.phoneNumber.updateMany({
    where: {
      projectId,
      deletedAt: null, // Only delete active numbers
    },
    data: {
      deletedAt: new Date(),
    },
  })

  console.log(`[PhoneNumber Cleanup] Soft-deleted ${result.count} phone number(s) for project ${projectId}`)
}

/**
 * Ensure a phone number is not assigned to a deleted project
 * If it is, soft-delete it to prevent routing issues
 */
export async function validateAndCleanupPhoneNumber(e164: string): Promise<void> {
  const phoneNumber = await prisma.phoneNumber.findUnique({
    where: { e164 },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          deletedAt: true,
        },
      },
    },
  })

  if (!phoneNumber) {
    return // Number doesn't exist, nothing to clean up
  }

  // If phone number is assigned to a deleted project, soft-delete it
  if (phoneNumber.project.deletedAt && !phoneNumber.deletedAt) {
    console.log(`[PhoneNumber Cleanup] Cleaning up orphaned phone number ${e164} from deleted project ${phoneNumber.project.name}`)
    await prisma.phoneNumber.update({
      where: { e164 },
      data: {
        deletedAt: new Date(),
      },
    })
  }
}

/**
 * Check if a phone number can be assigned to a project
 * Returns true if safe to assign, false if conflicts exist
 */
export async function canAssignPhoneNumber(e164: string, projectId: string): Promise<{ canAssign: boolean; reason?: string }> {
  // Verify target project exists and is active
  const targetProject = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, deletedAt: true },
  })

  if (!targetProject) {
    return { canAssign: false, reason: 'Target project not found' }
  }

  if (targetProject.deletedAt) {
    return { canAssign: false, reason: 'Target project is deleted' }
  }

  // Check if number exists and is assigned to a different active project
  const existingNumber = await prisma.phoneNumber.findUnique({
    where: { e164 },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          deletedAt: true,
        },
      },
    },
  })

  if (!existingNumber) {
    // Number doesn't exist, safe to assign
    return { canAssign: true }
  }

  if (existingNumber.deletedAt) {
    // Number is soft-deleted, safe to reassign
    return { canAssign: true }
  }

  if (existingNumber.project.deletedAt) {
    // Number is assigned to deleted project, safe to reassign after cleanup
    await validateAndCleanupPhoneNumber(e164)
    return { canAssign: true }
  }

  if (existingNumber.projectId === projectId) {
    // Already assigned to this project
    return { canAssign: true }
  }

  // Number is assigned to a different active project
  return { 
    canAssign: false, 
    reason: `Phone number is already assigned to active project: ${existingNumber.project.name}` 
  }
}

/**
 * Safely assign a phone number to a project
 * Handles cleanup of orphaned numbers and prevents conflicts
 */
export async function safeAssignPhoneNumber(
  e164: string,
  projectId: string,
  options: {
    vapiNumberId?: string
    label?: string
    serverUrl?: string
    systemType?: string
  } = {}
): Promise<{ success: boolean; phoneNumber: any; message: string }> {
  // Validate assignment
  const validation = await canAssignPhoneNumber(e164, projectId)
  if (!validation.canAssign) {
    throw new Error(validation.reason || 'Cannot assign phone number')
  }

  // Clean up if needed
  await validateAndCleanupPhoneNumber(e164)

  // Upsert phone number (update if exists, create if not)
  const phoneNumber = await prisma.phoneNumber.upsert({
    where: { e164 },
    update: {
      projectId,
      deletedAt: null, // Un-delete if it was soft-deleted
      ...(options.vapiNumberId && { vapiNumberId: options.vapiNumberId }),
      ...(options.label && { label: options.label }),
      ...(options.serverUrl !== undefined && { serverUrl: options.serverUrl }),
      ...(options.systemType && { systemType: options.systemType }),
    },
    create: {
      projectId,
      e164,
      vapiNumberId: options.vapiNumberId || `temp-${Date.now()}`,
      label: options.label || 'Main',
      serverUrl: options.serverUrl || null,
      systemType: options.systemType || 'openai-realtime',
    },
  })

  return {
    success: true,
    phoneNumber,
    message: 'Phone number assigned successfully',
  }
}
