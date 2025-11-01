"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Phone,
  DollarSign,
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
  calcomBookingUid?: string
}

type CalendarViewProps = {
  projectId: string
}

export default function CalendarView({ projectId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    customerName?: string
    customerPhone?: string
    address?: string
    notes?: string
    slotStart?: string
    status?: string
  }>({})

  useEffect(() => {
    void loadBookings()
  }, [projectId, currentDate])

  async function loadBookings() {
    try {
      setLoading(true)
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      const res = await fetch(
        `/api/projects/${projectId}/bookings?start=${startOfMonth.toISOString()}&end=${endOfMonth.toISOString()}`
      )
      if (res.ok) {
        const data = await res.json()
        setBookings(Array.isArray(data.bookings) ? data.bookings : [])
      }
    } catch (err) {
      console.error("Failed to load bookings:", err)
    } finally {
      setLoading(false)
    }
  }

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  function prevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  function isImported(b: Booking) {
    return (b.notes || "").includes("[IMPORTED]")
  }

  function startEdit(b: Booking) {
    setEditingId(b.id)
    setEditForm({
      customerName: b.customerName || "",
      customerPhone: b.customerPhone || "",
      address: b.address || "",
      notes: b.notes || "",
      slotStart: b.slotStart ? new Date(b.slotStart).toISOString().slice(0, 16) : "",
      status: b.status,
    })
  }

  async function saveEdit(b: Booking) {
    try {
      const payload: Record<string, unknown> = { ...editForm }
      if (typeof payload.slotStart === "string" && payload.slotStart) {
        const d = new Date(payload.slotStart)
        if (isNaN(d.getTime())) {
          alert("Invalid date/time")
          return
        }
        payload.slotStart = d.toISOString()
      }
      const res = await fetch(`/api/projects/${projectId}/bookings/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as any).error || "Failed to update")
      setEditingId(null)
      await loadBookings()
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function deleteBooking(b: Booking) {
    if (!confirm("Delete this booking?")) return
    try {
      const res = await fetch(`/api/projects/${projectId}/bookings/${b.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as any).error || "Failed to delete")
      await loadBookings()
    } catch (e: any) {
      alert(e.message)
    }
  }

  function getBookingsForDate(date: number) {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), date)
    return bookings.filter((booking) => {
      if (!booking.slotStart) return false
      const bookingDate = new Date(booking.slotStart)
      return (
        bookingDate.getDate() === targetDate.getDate() &&
        bookingDate.getMonth() === targetDate.getMonth() &&
        bookingDate.getFullYear() === targetDate.getFullYear()
      )
    })
  }

  function getSelectedBookings() {
    if (!selectedDate) return [] as Booking[]
    return getBookingsForDate(selectedDate.getDate())
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Grid */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {dayNames.map((day) => (
                <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}

              {/* Empty cells for days before month starts */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Calendar days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const date = i + 1
                const dayBookings = getBookingsForDate(date)
                const isSelected =
                  selectedDate?.getDate() === date && selectedDate?.getMonth() === currentDate.getMonth()
                const now = new Date()
                const isToday =
                  now.getDate() === date &&
                  now.getMonth() === currentDate.getMonth() &&
                  now.getFullYear() === currentDate.getFullYear()

                return (
                  <div
                    key={date}
                    onClick={() =>
                      setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), date))
                    }
                    className={`aspect-square p-2 border rounded-lg cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50 ${
                      isSelected ? "border-blue-600 bg-blue-50 shadow-md" : "border-gray-200"
                    } ${isToday ? "border-blue-400 font-bold" : ""}`}
                  >
                    <div className="text-sm mb-1">{date}</div>
                    {dayBookings.length > 0 && (
                      <div className="space-y-1">
                        {dayBookings.slice(0, 2).map((booking) => (
                          <div
                            key={booking.id}
                            className="text-xs px-1 py-0.5 bg-blue-100 text-blue-700 rounded truncate"
                          >
                            {booking.slotStart
                              ? new Date(booking.slotStart).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </div>
                        ))}
                        {dayBookings.length > 2 && (
                          <div className="text-xs text-gray-500">+{dayBookings.length - 2} more</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Details Sidebar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedDate
              ? `Bookings for ${monthNames[selectedDate.getMonth()]} ${selectedDate.getDate()}`
              : "Select a date"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDate ? (
            <div className="space-y-4">
              {getSelectedBookings().length === 0 ? (
                <div className="text-center py-8 text-gray-500">No bookings for this day</div>
              ) : (
                getSelectedBookings().map((booking) => (
                  <div key={booking.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="font-semibold">
                          {booking.slotStart
                            ? new Date(booking.slotStart).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                      <Badge
                        variant={
                          booking.status === "booked"
                            ? "default"
                            : booking.status === "completed"
                            ? "secondary"
                            : booking.status === "pending"
                            ? "outline"
                            : "destructive"
                        }
                      >
                        {booking.status}
                      </Badge>
                    </div>

                    {editingId === booking.id ? (
                      <div className="space-y-2">
                        <input
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="Customer name"
                          value={editForm.customerName || ""}
                          onChange={(e) => setEditForm((f) => ({ ...f, customerName: e.target.value }))}
                        />
                        <input
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="Customer phone"
                          value={editForm.customerPhone || ""}
                          onChange={(e) => setEditForm((f) => ({ ...f, customerPhone: e.target.value }))}
                        />
                        <input
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="Address"
                          value={editForm.address || ""}
                          onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                        />
                        <textarea
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="Notes"
                          value={editForm.notes || ""}
                          onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                        />
                        <input
                          type="datetime-local"
                          className="w-full border rounded px-2 py-1 text-sm"
                          value={editForm.slotStart || ""}
                          onChange={(e) => setEditForm((f) => ({ ...f, slotStart: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(booking)}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {booking.customerName && (
                          <div className="text-sm font-medium mb-2">{booking.customerName}</div>
                        )}
                        {booking.customerPhone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <Phone className="w-3 h-3" />
                            {formatPhoneNumber(booking.customerPhone)}
                          </div>
                        )}
                        {booking.address && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <MapPin className="w-3 h-3" />
                            {booking.address}
                          </div>
                        )}
                        {booking.priceCents && (
                          <div className="flex items-center gap-2 text-sm font-semibold text-green-600 mb-2">
                            <DollarSign className="w-3 h-3" />
                            {formatCurrency(booking.priceCents)}
                          </div>
                        )}
                        {booking.notes && (
                          <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">{booking.notes}</div>
                        )}
                        {booking.calcomBookingUid && (
                          <a
                            href={`https://cal.com/booking/${booking.calcomBookingUid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                          >
                            View in Cal.com →
                          </a>
                        )}
                        {!isImported(booking) && (
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" variant="outline" onClick={() => startEdit(booking)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteBooking(booking)}>
                              Delete
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">Click on a date to see bookings</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

