'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, MapPin, Clock, User, Users, Navigation } from 'lucide-react'

interface Gap {
  unassignedBooking: {
    id: string
    customerName?: string
    address?: string
    slotStart?: string
    slotEnd?: string
    notes?: string
    status: string
  }
  suggestedTechnician?: {
    id: string
    name: string
    reason: string
  }
  conflictingTechnicians?: string[]
}

interface GapFinderProps {
  projectId: string
}

export default function GapFinder({ projectId }: GapFinderProps) {
  const [loading, setLoading] = useState(false)
  const [gaps, setGaps] = useState<Gap[]>([])
  const [assigning, setAssigning] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ total: number; technicians: number } | null>(null)

  const loadGaps = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/gaps?projectId=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setGaps(data.gaps || [])
        setSummary(data.summary || null)
      }
    } catch (error) {
      console.error('Failed to load gaps:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadGaps()
  }, [projectId])

  const assignTechnician = async (bookingId: string, techId: string) => {
    try {
      setAssigning(bookingId)
      const res = await fetch(`/api/projects/${projectId}/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianId: techId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to assign')
      await loadGaps()
    } catch (error: any) {
      alert(error.message || 'Failed to assign technician')
    } finally {
      setAssigning(null)
    }
  }

  function formatDateTime(iso: string | undefined): string {
    if (!iso) return 'No time set'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return 'Invalid date'
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Smart Scheduling
            </CardTitle>
            <CardDescription>
              Unassigned bookings and suggested technician assignments
            </CardDescription>
          </div>
          <Button onClick={loadGaps} disabled={loading} size="sm" variant="outline">
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {summary && (
          <div className="mb-4 text-sm text-gray-600">
            {summary.total} unassigned bookings • {summary.technicians} technicians
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : gaps.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <p className="font-semibold">All bookings assigned!</p>
            <p className="text-sm">Your schedule looks optimized.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {gaps.map((gap) => (
              <div key={gap.unassignedBooking.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={gap.unassignedBooking.status === 'booked' ? 'default' : 'outline'}>
                        {gap.unassignedBooking.status}
                      </Badge>
                      <span className="font-semibold">
                        {gap.unassignedBooking.customerName || 'Unknown Customer'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(gap.unassignedBooking.slotStart)}
                      </div>
                      {gap.unassignedBooking.address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {gap.unassignedBooking.address}
                        </div>
                      )}
                      {gap.unassignedBooking.notes && (
                        <div className="text-xs text-gray-500 truncate">
                          {gap.unassignedBooking.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {gap.suggestedTechnician ? (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-blue-500" />
                      <div>
                        <div className="font-medium text-blue-600">
                          Suggested: {gap.suggestedTechnician.name}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          {gap.suggestedTechnician.reason.includes('miles') && (
                            <Navigation className="w-3 h-3 text-green-600" />
                          )}
                          {gap.suggestedTechnician.reason}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => assignTechnician(gap.unassignedBooking.id, gap.suggestedTechnician!.id)}
                      disabled={assigning === gap.unassignedBooking.id}
                    >
                      {assigning === gap.unassignedBooking.id ? 'Assigning...' : 'Assign'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t text-sm text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    No available technician found
                    {gap.conflictingTechnicians && gap.conflictingTechnicians.length > 0 && (
                      <span className="text-xs text-gray-500">
                        (Conflicts with: {gap.conflictingTechnicians.join(', ')})
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

