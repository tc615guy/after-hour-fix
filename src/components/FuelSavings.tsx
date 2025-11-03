'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingDown, Clock, DollarSign, MapPin } from 'lucide-react'

interface FuelSavingsProps {
  projectId: string
  days?: number
}

interface RouteStats {
  days: number
  routesAnalyzed: number
  metrics: {
    totalMilesActual: number
    totalMilesOptimal: number
    milesSaved: number
    totalMinutesActual: number
    totalMinutesOptimal: number
    minutesSaved: number
  }
  savings: {
    fuelSavings: number
    timeSavings: number
    totalSavings: number
  }
  assumptions: {
    fuelCostPerMile: number
    hourlyRate: number
  }
}

export default function FuelSavings({ projectId, days = 7 }: FuelSavingsProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<RouteStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/projects/${projectId}/route-stats?days=${days}`)
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to load route stats')
      }
      
      setStats(data)
    } catch (err: any) {
      console.error('Failed to load route stats:', err)
      setError(err.message || 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStats()
  }, [projectId, days])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Fuel & Time Savings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Fuel & Time Savings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-amber-600 mb-2">{error}</p>
            <Button size="sm" onClick={loadStats} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats || stats.routesAnalyzed === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Fuel & Time Savings
          </CardTitle>
          <CardDescription>Last {days} days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="font-semibold">No routing data yet</p>
            <p className="text-sm">Add technicians and bookings to see savings</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { metrics, savings, assumptions } = stats

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Fuel & Time Savings
            </CardTitle>
            <CardDescription>Last {days} days • {stats.routesAnalyzed} technician routes analyzed</CardDescription>
          </div>
          <Button onClick={loadStats} disabled={loading} size="sm" variant="outline">
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 border rounded-lg bg-green-50">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-xs font-semibold text-green-800">Fuel Saved</span>
            </div>
            <div className="text-2xl font-bold text-green-600">${savings.fuelSavings.toFixed(2)}</div>
            <div className="text-xs text-gray-600 mt-1">{metrics.milesSaved.toFixed(1)} miles</div>
          </div>
          
          <div className="p-4 border rounded-lg bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-800">Time Saved</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{Math.floor(metrics.minutesSaved / 60)}h {metrics.minutesSaved % 60}m</div>
            <div className="text-xs text-gray-600 mt-1">${savings.timeSavings.toFixed(2)} value</div>
          </div>
          
          <div className="p-4 border rounded-lg bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-purple-800">Total Saved</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">${savings.totalSavings.toFixed(2)}</div>
            <div className="text-xs text-gray-600 mt-1">Last {days} days</div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold mb-3 text-gray-700">Route Analysis</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600 mb-1">Miles Driven (Actual)</div>
              <div className="font-semibold">{metrics.totalMilesActual.toFixed(1)} mi</div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Miles Driven (Optimal)</div>
              <div className="font-semibold text-green-600">{metrics.totalMilesOptimal.toFixed(1)} mi</div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Drive Time (Actual)</div>
              <div className="font-semibold">{Math.floor(metrics.totalMinutesActual / 60)}h {metrics.totalMinutesActual % 60}m</div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Drive Time (Optimal)</div>
              <div className="font-semibold text-green-600">{Math.floor(metrics.totalMinutesOptimal / 60)}h {metrics.totalMinutesOptimal % 60}m</div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
          <strong>Assumptions:</strong> ${assumptions.fuelCostPerMile.toFixed(2)}/mile fuel cost, ${assumptions.hourlyRate}/hr technician time
        </div>
      </CardContent>
    </Card>
  )
}

