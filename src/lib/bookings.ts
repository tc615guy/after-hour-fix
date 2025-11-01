import { prisma } from '@/lib/db'

export type NewBookingInput = {
  projectId: string
  customerName?: string | null
  customerPhone?: string | null
  address?: string | null
  notes?: string | null
  slotStart?: Date | null
  slotEnd?: Date | null
  priceCents?: number | null
  status: string
}

export async function createPendingBooking(input: NewBookingInput) {
  return prisma.booking.create({
    data: input,
  })
}

