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
const TIME_SLOT_HEIGHT = 40 // pixels per hour
const COLUMN_WIDTH = 80

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

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="p-3 bg-gray-50 font-semibold sticky left-0 z-10 border-r border-gray-200">
        <div className="flex items-center gap-2">
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
              hourBookings.map((booking) => (
                <div
                  key={booking.id}
                  className={`h-full w-full p-1 cursor-pointer hover:opacity-90 transition-opacity rounded ${isUnassigned ? 'bg-amber-400' : 'bg-blue-500'}`}
                  onClick={() => onBookingClick(booking)}
                >
                  <div className="text-white text-xs font-semibold truncate">{booking.customerName}</div>
                  {booking.priceCents && (
                    <div className="text-white text-xs opacity-90">{formatCurrency(booking.priceCents / 100)}</div>
                  )}
                </div>
              ))
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
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left p-2 font-semibold bg-gray-100 sticky left-0 z-10">Tech</th>
                    {[...Array(DAY_END_HOUR - DAY_START_HOUR + 1)].map((_, i) => {
                      const hour = DAY_START_HOUR + i
                      const displayHour = hour > 12 ? hour - 12 : hour
                      const ampm = hour >= 12 ? 'PM' : 'AM'
                      return (
                        <th key={hour} className="text-center p-2 font-semibold bg-gray-50 min-w-[80px] border-l border-gray-200">
                          <div className="text-xs">{displayHour}{ampm === 'PM' ? 'p' : 'a'}</div>
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

