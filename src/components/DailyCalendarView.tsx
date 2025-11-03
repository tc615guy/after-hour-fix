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

const DAY_START_HOUR = 7 // 7 AM
const DAY_END_HOUR = 19 // 7 PM
const TIME_SLOT_HEIGHT = 40 // pixels per hour

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
        setBookings(Array.isArray(bookingsData.bookings) ? bookingsData.bookings : [])
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

  // Calculate position and height for a booking
  function getBookingStyle(booking: Booking): {
    top: number
    height: number
    left: number
    width: string | number
  } {
    const start = new Date(booking.slotStart || '')
    const end = booking.slotEnd ? new Date(booking.slotEnd) : new Date(start.getTime() + 60 * 60 * 1000) // default 1 hour
    
    const startHour = start.getHours() + start.getMinutes() / 60
    const endHour = end.getHours() + end.getMinutes() / 60
    const duration = endHour - startHour

    const top = (startHour - DAY_START_HOUR) * TIME_SLOT_HEIGHT
    const height = duration * TIME_SLOT_HEIGHT
    
    // Simple single-column layout for now
    return { top, height, left: 20, width: 'calc(100% - 40px)' }
  }

  // Detect gaps in a technician's schedule
  function detectGaps(techBookings: Booking[]): Array<{ start: Date; end: Date }> {
    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(DAY_START_HOUR, 0, 0, 0)
    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(DAY_END_HOUR, 0, 0, 0)
    
    if (techBookings.length === 0) {
      return [{ start: startOfDay, end: endOfDay }]
    }

    const sorted = [...techBookings].sort((a, b) => 
      new Date(a.slotStart || 0).getTime() - new Date(b.slotStart || 0).getTime()
    )

    const gaps: Array<{ start: Date; end: Date }> = []
    
    // Check before first booking
    const firstStart = new Date(sorted[0].slotStart || '')
    if (firstStart.getHours() > DAY_START_HOUR || (firstStart.getHours() === DAY_START_HOUR && firstStart.getMinutes() > 0)) {
      gaps.push({ start: new Date(startOfDay), end: firstStart })
    }

    // Check between bookings
    for (let i = 0; i < sorted.length - 1; i++) {
      const currBooking = sorted[i]
      const nextBooking = sorted[i + 1]
      if (!currBooking.slotStart || !nextBooking.slotStart) continue
      
      const currentEnd = currBooking.slotEnd ? new Date(currBooking.slotEnd) : new Date(currBooking.slotStart)
      const nextStart = new Date(nextBooking.slotStart)
      
      if (nextStart.getTime() - currentEnd.getTime() > 15 * 60 * 1000) { // 15 min gap
        gaps.push({ start: new Date(currentEnd), end: new Date(nextStart) })
      }
    }

    // Check after last booking
    const lastBooking = sorted[sorted.length - 1]
    if (lastBooking.slotStart) {
      const lastEnd = lastBooking.slotEnd ? new Date(lastBooking.slotEnd) : new Date(lastBooking.slotStart)
      if (lastEnd.getHours() < DAY_END_HOUR) {
        gaps.push({ start: new Date(lastEnd), end: new Date(endOfDay) })
      }
    }

    return gaps
  }

  function renderTimeSlots() {
    const slots = []
    for (let hour = DAY_START_HOUR; hour <= DAY_END_HOUR; hour++) {
      const displayHour = hour > 12 ? hour - 12 : hour
      const ampm = hour >= 12 ? 'PM' : 'AM'
      slots.push(
        <div
          key={hour}
          className="border-t border-gray-200 flex items-center"
          style={{ height: TIME_SLOT_HEIGHT }}
        >
          <span className="text-xs text-gray-500 mr-3 w-12 text-right">
            {displayHour}:00 {ampm}
          </span>
          <div className="flex-1 border-t border-gray-100"></div>
        </div>
      )
    }
    return slots
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
    <div className="space-y-4">
      {/* Header with date navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{selectedDateStr}</CardTitle>
            <div className="flex items-center gap-2">
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
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Unassigned bookings */}
            {getBookingsForTech(null).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-gray-500" />
                  <h3 className="font-semibold text-gray-700">Unassigned</h3>
                  <Badge variant="outline" className="ml-auto">
                    {getBookingsForTech(null).length}
                  </Badge>
                </div>
                <div className="relative bg-gray-50 rounded-lg border-2 border-dashed border-gray-300" style={{ minHeight: (DAY_END_HOUR - DAY_START_HOUR) * TIME_SLOT_HEIGHT }}>
                  <div className="absolute inset-0">
                    <div className="p-4">
                      {renderTimeSlots()}
                    </div>
                  </div>
                  <div className="relative">
                    {getBookingsForTech(null).map((booking) => {
                      const style = getBookingStyle(booking)
                      return (
                        <div
                          key={booking.id}
                          className="absolute bg-amber-500 text-white rounded p-2 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                          style={{ ...style, zIndex: 10 }}
                          onClick={() => setSelectedBooking(booking)}
                        >
                          <div className="font-semibold text-xs">{booking.customerName}</div>
                          <div className="text-xs opacity-90">
                            {new Date(booking.slotStart || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                            {booking.slotEnd ? new Date(booking.slotEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '??'}
                          </div>
                          {booking.address && (
                            <div className="text-xs opacity-75 truncate max-w-[200px]">
                              {booking.address}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Technician schedules */}
            {technicians.map((tech) => {
              const techBookings = getBookingsForTech(tech.id)
              const gaps = detectGaps(techBookings)
              
              return (
                <div key={tech.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold">{tech.name}</h3>
                    <Badge variant="outline" className="ml-auto">
                      {techBookings.length} jobs
                    </Badge>
                  </div>
                  <div className="relative bg-white rounded-lg border-2 border-blue-200" style={{ minHeight: (DAY_END_HOUR - DAY_START_HOUR) * TIME_SLOT_HEIGHT }}>
                    <div className="absolute inset-0">
                      <div className="p-4">
                        {renderTimeSlots()}
                      </div>
                    </div>
                    <div className="relative">
                      {/* Render gaps */}
                      {gaps.map((gap, idx) => {
                        const gapStartHour = gap.start.getHours() + gap.start.getMinutes() / 60
                        const gapEndHour = gap.end.getHours() + gap.end.getMinutes() / 60
                        const gapDuration = gapEndHour - gapStartHour
                        const top = (gapStartHour - DAY_START_HOUR) * TIME_SLOT_HEIGHT
                        const height = gapDuration * TIME_SLOT_HEIGHT
                        
                        return (
                          <div
                            key={`gap-${idx}`}
                            className="absolute bg-green-100 border-2 border-dashed border-green-400 rounded cursor-pointer hover:bg-green-200 transition-colors"
                            style={{ top, height, left: 20, right: 20, zIndex: 5 }}
                            onClick={() => {
                              // TODO: Open create booking modal
                              alert(`Create new booking from ${gap.start.toLocaleTimeString()} to ${gap.end.toLocaleTimeString()}`)
                            }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-green-700 font-semibold">
                              + Add Job ({Math.round(gapDuration * 60)} min)
                            </div>
                          </div>
                        )
                      })}
                      
                      {/* Render bookings */}
                      {techBookings.map((booking) => {
                        const style = getBookingStyle(booking)
                        return (
                          <div
                            key={booking.id}
                            className="absolute bg-blue-600 text-white rounded p-2 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                            style={{ ...style, zIndex: 10 }}
                            onClick={() => setSelectedBooking(booking)}
                          >
                            <div className="font-semibold text-xs">{booking.customerName}</div>
                            <div className="text-xs opacity-90">
                              {new Date(booking.slotStart || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                              {booking.slotEnd ? new Date(booking.slotEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '??'}
                            </div>
                            {booking.address && (
                              <div className="text-xs opacity-75 truncate max-w-[200px]">
                                {booking.address}
                              </div>
                            )}
                            {booking.priceCents && (
                              <div className="text-xs opacity-90 font-semibold mt-1">
                                {formatCurrency(booking.priceCents / 100)}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Booking detail modal */}
      {selectedBooking && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Booking Details</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-semibold text-gray-600">Customer:</span>
                <div className="text-lg font-bold">{selectedBooking.customerName}</div>
              </div>
              {selectedBooking.customerPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>{formatPhoneNumber(selectedBooking.customerPhone)}</span>
                </div>
              )}
              {selectedBooking.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-500 mt-1" />
                  <span className="text-sm">{selectedBooking.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  {new Date(selectedBooking.slotStart || '').toLocaleString()}
                </span>
              </div>
              {selectedBooking.priceCents && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-lg font-bold">{formatCurrency(selectedBooking.priceCents / 100)}</span>
                </div>
              )}
              {selectedBooking.notes && (
                <div className="mt-3 pt-3 border-t">
                  <span className="text-sm font-semibold text-gray-600">Notes:</span>
                  <div className="text-sm text-gray-700">{selectedBooking.notes}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

