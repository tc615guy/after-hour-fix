"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Phone,
  DollarSign,
  User,
} from "lucide-react"
import { formatCurrency, formatPhoneNumber } from "@/lib/utils"

type Booking = {
  id: string
  customerName?: string
  customerPhone?: string
  address?: string
  notes?: string
  slotStart?: string
  slotEnd?: string
  priceCents?: number
  status: string
  technicianId?: string
  technician?: {
    id: string
    name: string
  }
}

type Technician = {
  id: string
  name: string
}

type DailyCalendarViewProps = {
  projectId: string
}

type TechRowProps = {
  tech: { id: string; name: string }
  bookings: Booking[]
  isUnassigned?: boolean
  onBookingClick: (booking: Booking) => void
  selectedDate: Date
}

const DAY_START_HOUR = 7 // 7 AM
const DAY_END_HOUR = 19 // 7 PM
const TIME_SLOT_HEIGHT = 50 // pixels per hour
const COLUMN_WIDTH = 100

// Generate consistent color based on technician ID
function getTechColor(techId: string): string {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 
    'bg-indigo-500', 'bg-pink-500', 'bg-teal-500',
    'bg-orange-500', 'bg-cyan-500', 'bg-rose-500'
  ]
  // Hash the ID to get a consistent index - use a better hash function
  let hash = 0
  for (let i = 0; i < techId.length; i++) {
    const char = techId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash | 0 // Convert to 32-bit integer
  }
  return colors[Math.abs(hash) % colors.length]
}

function TechRow({ tech, bookings, isUnassigned, onBookingClick, selectedDate }: TechRowProps) {
  // Get bookings for each hour
  const hourSlots = Array(DAY_END_HOUR - DAY_START_HOUR + 1).fill(null).map((_, i) => {
    const hour = DAY_START_HOUR + i
    const hourStart = new Date(selectedDate)
    hourStart.setHours(hour, 0, 0, 0)
    const hourEnd = new Date(selectedDate)
    hourEnd.setHours(hour + 1, 0, 0, 0)
    
    return bookings.filter(booking => {
      if (!booking.slotStart) return false
      const bookingStart = new Date(booking.slotStart)
      const bookingEnd = booking.slotEnd ? new Date(booking.slotEnd) : new Date(bookingStart.getTime() + 60 * 60 * 1000)
      // Check if booking overlaps with this hour
      return bookingStart < hourEnd && bookingEnd > hourStart
    })
  })

  // Row's default color (for gaps indication)
  const rowTechColor = isUnassigned ? 'bg-amber-400' : getTechColor(tech.id)
  
  // Helper to get color for a specific booking based on its technicianId
  const getBookingColor = (booking: Booking) => {
    if (!booking.technicianId) return 'bg-amber-400' // Unassigned
    return getTechColor(booking.technicianId)
  }
  
  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="p-3 bg-gray-50 font-semibold sticky left-0 z-10 border-r border-gray-200">
        <div className="flex items-center gap-1">
          <User className={`w-4 h-4 ${isUnassigned ? 'text-gray-500' : 'text-blue-600'}`} />
          <span>{tech.name}</span>
        </div>
      </td>
      {hourSlots.map((hourBookings, idx) => {
        const hour = DAY_START_HOUR + idx
        const isGap = hourBookings.length === 0
        
        return (
          <td key={hour} className="border-l border-gray-200 relative h-12 p-0">
            {isGap ? (
              <div className="h-full w-full bg-green-50 border border-dashed border-green-300 hover:bg-green-100 cursor-pointer transition-colors flex items-center justify-center">
                <span className="text-xs text-green-600 font-semibold">+</span>
              </div>
            ) : (
              hourBookings.map((booking) => {
                const bookingColor = getBookingColor(booking)
                return (
                  <div
                    key={booking.id}
                    className={`h-full w-full p-1.5 cursor-pointer hover:opacity-90 transition-opacity rounded ${bookingColor}`}
                    onClick={() => onBookingClick(booking)}
                  >
                    <div className="text-white font-semibold truncate">{booking.customerName}</div>
                  </div>
                )
              })
            )}
          </td>
        )
      })}
    </tr>
  )
}

export default function DailyCalendarView({ projectId }: DailyCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  useEffect(() => {
    void loadData()
  }, [projectId, selectedDate])

  async function loadData() {
    try {
      setLoading(true)
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      const [bookingsRes, techsRes] = await Promise.all([
        fetch(
          `/api/projects/${projectId}/bookings?start=${startOfDay.toISOString()}&end=${endOfDay.toISOString()}`
        ),
        fetch(`/api/projects/${projectId}/technicians`)
      ])

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json()
        const bookingsList = Array.isArray(bookingsData.bookings) ? bookingsData.bookings : []
        // Debug: Log first booking to check technicianId
        if (bookingsList.length > 0) {
          const firstBooking = bookingsList[0]
          console.log('[DailyCalendar] First booking:', {
            id: firstBooking.id,
            customerName: firstBooking.customerName,
            technicianId: firstBooking.technicianId,
            technician: firstBooking.technician
          })
        }
        setBookings(bookingsList)
      }

      if (techsRes.ok) {
        const techsData = await techsRes.json()
        setTechnicians(Array.isArray(techsData.technicians) ? techsData.technicians : [])
      }
    } catch (err) {
      console.error("Failed to load data:", err)
    } finally {
      setLoading(false)
    }
  }

  function prevDay() {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  function nextDay() {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  function today() {
    setSelectedDate(new Date())
  }

  // Get bookings for a specific technician
  function getBookingsForTech(techId: string | null): Booking[] {
    if (!techId) {
      // Unassigned bookings
      return bookings.filter(b => !b.technicianId)
    }
    return bookings.filter(b => b.technicianId === techId)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    )
  }

  const selectedDateStr = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="space-y-2">
      {/* Header with date navigation */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-lg">{selectedDateStr}</h3>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={prevDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={today}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={nextDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left p-2 font-semibold bg-gray-100 sticky left-0 z-10">Tech</th>
                    {[...Array(DAY_END_HOUR - DAY_START_HOUR + 1)].map((_, i) => {
                      const hour = DAY_START_HOUR + i
                      const displayHour = hour > 12 ? hour - 12 : hour
                      const ampm = hour >= 12 ? 'PM' : 'AM'
                      return (
                        <th key={hour} className="text-center p-2 font-semibold bg-gray-50 min-w-[70px] border-l border-gray-200">
                          <div>{displayHour}{ampm === 'PM' ? 'p' : 'a'}</div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Unassigned row */}
                  {getBookingsForTech(null).length > 0 && (
                    <TechRow
                      tech={{ id: 'unassigned', name: 'Unassigned' }}
                      bookings={getBookingsForTech(null)}
                      isUnassigned={true}
                      onBookingClick={setSelectedBooking}
                      selectedDate={selectedDate}
                    />
                  )}
                  {/* Technician rows */}
                  {technicians.map((tech) => (
                    <TechRow
                      key={tech.id}
                      tech={tech}
                      bookings={getBookingsForTech(tech.id)}
                      onBookingClick={setSelectedBooking}
                      selectedDate={selectedDate}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking detail modal */}
      {selectedBooking && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Booking Details</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(null)}>
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm">
            <div>
              <span className="text-xs font-semibold text-gray-600 block mb-1">Customer:</span>
              <div className="font-bold">{selectedBooking.customerName}</div>
            </div>
            {selectedBooking.customerPhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3 h-3 text-gray-500" />
                <span className="text-xs">{formatPhoneNumber(selectedBooking.customerPhone)}</span>
              </div>
            )}
            {selectedBooking.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-3 h-3 text-gray-500 mt-0.5" />
                <span className="text-xs">{selectedBooking.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-gray-500" />
              <span className="text-xs">
                {new Date(selectedBooking.slotStart || '').toLocaleString()}
              </span>
            </div>
            {selectedBooking.priceCents && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-3 h-3 text-gray-500" />
                <span className="font-bold">{formatCurrency(selectedBooking.priceCents / 100)}</span>
              </div>
            )}
            {selectedBooking.notes && (
              <div className="pt-2 border-t mt-2">
                <span className="text-xs font-semibold text-gray-600 block mb-1">Notes:</span>
                <div className="text-xs text-gray-700">{selectedBooking.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

