'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, PhoneOff, DollarSign, TrendingDown, Phone, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface MissedOpportunityCalculatorProps {
  projectId: string
}

interface MissedOpportunityData {
  totalCalls: number
  answeredCalls: number
  missedCalls: number
  missedCallPercentage: number
  totalBookings: number
  avgBookingValue: number
  conversionRate: number
  estimatedMissedRevenue: number
  estimatedMissedBookings: number
  timeframe: string
}

export default function MissedOpportunityCalculator({ projectId }: MissedOpportunityCalculatorProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<MissedOpportunityData | null>(null)

  useEffect(() => {
    loadMissedOpportunityData()
  }, [projectId])

  const loadMissedOpportunityData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/missed-opportunities`)

      if (res.ok) {
        const result = await res.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('Failed to load missed opportunity data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.totalCalls === 0) {
    return (
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-full">
              <PhoneOff className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-orange-900">Missed Opportunity Calculator</CardTitle>
              <CardDescription className="text-orange-700">
                Not enough data yet - start receiving calls to see your metrics
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  const hasMissedCalls = data.missedCalls > 0

  return (
    <Card className={`border-2 ${hasMissedCalls ? 'border-red-300 bg-gradient-to-br from-red-50 to-orange-50' : 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${hasMissedCalls ? 'bg-red-100' : 'bg-green-100'}`}>
              {hasMissedCalls ? (
                <AlertTriangle className="w-6 h-6 text-red-600" />
              ) : (
                <Phone className="w-6 h-6 text-green-600" />
              )}
            </div>
            <div>
              <CardTitle className={hasMissedCalls ? 'text-red-900' : 'text-green-900'}>
                {hasMissedCalls ? '⚠️ Missed Opportunity Alert' : '✅ Great Job!'}
              </CardTitle>
              <CardDescription className={hasMissedCalls ? 'text-red-700' : 'text-green-700'}>
                {hasMissedCalls
                  ? 'You\'re losing revenue from unanswered calls'
                  : 'You\'re answering all your calls! Keep it up!'
                }
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Last 30 Days</div>
            <div className={`text-2xl font-bold ${hasMissedCalls ? 'text-red-600' : 'text-green-600'}`}>
              {data.missedCallPercentage.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">Missed Rate</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Call Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/60 backdrop-blur rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-gray-600">Total Calls</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{data.totalCalls}</div>
          </div>

          <div className="bg-white/60 backdrop-blur rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-gray-600">Answered</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{data.answeredCalls}</div>
          </div>

          <div className="bg-white/60 backdrop-blur rounded-lg p-4 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <PhoneOff className="w-4 h-4 text-red-600" />
              <span className="text-xs font-medium text-gray-600">Missed</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{data.missedCalls}</div>
          </div>
        </div>

        {hasMissedCalls && (
          <>
            {/* Revenue Impact */}
            <div className="bg-white/80 backdrop-blur rounded-lg p-5 border-2 border-red-300 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-900">Estimated Lost Revenue</h3>
                    <p className="text-sm text-red-700">Based on your booking conversion rate</p>
                  </div>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-bold text-red-600">
                  {formatCurrency(data.estimatedMissedRevenue)}
                </span>
                <span className="text-gray-600 text-sm">in the last 30 days</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-red-200">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Missed Bookings</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-red-500" />
                    <span className="text-xl font-bold text-red-700">~{data.estimatedMissedBookings}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Avg Booking Value</div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="text-xl font-bold text-gray-700">{formatCurrency(data.avgBookingValue)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Call-to-Action */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-5 text-white">
              <h3 className="font-bold text-lg mb-2">💡 How AI Can Help</h3>
              <p className="text-blue-100 mb-3">
                Your AI assistant never misses a call - it's available 24/7 to answer questions, book appointments,
                and capture leads while you're busy or after hours.
              </p>
              <div className="flex items-center gap-2 text-sm bg-white/20 rounded px-3 py-2 backdrop-blur">
                <TrendingDown className="w-4 h-4" />
                <span className="font-medium">With 100% answer rate, you could recover this revenue</span>
              </div>
            </div>
          </>
        )}

        {!hasMissedCalls && (
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg p-5 text-white">
            <h3 className="font-bold text-lg mb-2">🎉 Perfect Answer Rate!</h3>
            <p className="text-green-100 mb-3">
              You're answering every call that comes in. Your AI assistant is working perfectly to ensure
              no opportunity slips through the cracks.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-white/20 rounded px-3 py-2 backdrop-blur">
                <div className="text-xs text-green-100">Conversion Rate</div>
                <div className="text-xl font-bold">{data.conversionRate.toFixed(1)}%</div>
              </div>
              <div className="bg-white/20 rounded px-3 py-2 backdrop-blur">
                <div className="text-xs text-green-100">Total Bookings</div>
                <div className="text-xl font-bold">{data.totalBookings}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
