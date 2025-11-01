'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Phone, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PhoneForwardingSettingsProps {
  projectId: string
}

export default function PhoneForwardingSettings({ projectId }: PhoneForwardingSettingsProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [forwardingNumber, setForwardingNumber] = useState('')
  const [forwardingType, setForwardingType] = useState<'overflow' | 'simultaneous' | 'after_hours'>('overflow')
  const [conditions, setConditions] = useState({
    lowConfidence: true,
    customerRequest: true,
    afterHoursOnly: false,
    businessHours: {
      start: '09:00',
      end: '17:00',
      days: [1, 2, 3, 4, 5], // Mon-Fri
    },
  })

  useEffect(() => {
    loadSettings()
  }, [projectId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.ok) {
        const { project } = await res.json()
        setEnabled(project.forwardingEnabled || false)
        setForwardingNumber(project.forwardingNumber || '')
        setForwardingType(project.forwardingType || 'overflow')
        if (project.forwardingConditions) {
          setConditions({ ...conditions, ...project.forwardingConditions })
        }
      }
    } catch (error) {
      console.error('Failed to load forwarding settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      const res = await fetch(`/api/projects/${projectId}/forwarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forwardingEnabled: enabled,
          forwardingNumber,
          forwardingType,
          forwardingConditions: conditions,
        }),
      })

      if (!res.ok) throw new Error('Failed to save settings')

      alert('Forwarding settings saved successfully!')
    } catch (error: any) {
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  const FORWARDING_TYPES = [
    {
      value: 'overflow',
      label: 'Overflow',
      description: 'Forward when AI cannot handle the call (low confidence, customer requests human)',
      icon: <AlertCircle className="w-5 h-5" />,
    },
    {
      value: 'simultaneous',
      label: 'Simultaneous',
      description: 'Ring your phone at the same time as the AI answers',
      icon: <Phone className="w-5 h-5" />,
    },
    {
      value: 'after_hours',
      label: 'After Hours',
      description: 'Forward all calls outside business hours',
      icon: <Clock className="w-5 h-5" />,
    },
  ]

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Call Forwarding
              </CardTitle>
              <CardDescription>
                Forward calls to your personal or office line
              </CardDescription>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {enabled && (
            <>
              <div>
                <Label htmlFor="forwardingNumber">Forwarding Number</Label>
                <Input
                  id="forwardingNumber"
                  type="tel"
                  value={forwardingNumber}
                  onChange={(e) => setForwardingNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter in E.164 format (e.g., +15551234567)
                </p>
              </div>

              <div>
                <Label className="mb-3 block">Forwarding Mode</Label>
                <div className="space-y-3">
                  {FORWARDING_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setForwardingType(type.value as any)}
                      className={`w-full p-4 border-2 rounded-lg transition-all text-left flex items-start gap-4 ${
                        forwardingType === type.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className={`mt-1 ${forwardingType === type.value ? 'text-blue-600' : 'text-gray-400'}`}>
                        {type.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold mb-1">{type.label}</div>
                        <div className="text-sm text-gray-600">{type.description}</div>
                      </div>
                      {forwardingType === type.value && (
                        <CheckCircle2 className="w-5 h-5 text-blue-600 mt-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <Label className="mb-3 block">Forwarding Conditions</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">Low AI Confidence</div>
                      <div className="text-xs text-gray-500">Forward when AI struggles to understand</div>
                    </div>
                    <Switch
                      checked={conditions.lowConfidence}
                      onCheckedChange={(checked) =>
                        setConditions({ ...conditions, lowConfidence: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">Customer Requests Human</div>
                      <div className="text-xs text-gray-500">Forward when customer asks for a person</div>
                    </div>
                    <Switch
                      checked={conditions.customerRequest}
                      onCheckedChange={(checked) =>
                        setConditions({ ...conditions, customerRequest: checked })
                      }
                    />
                  </div>

                  {forwardingType === 'after_hours' && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-sm mb-3">Business Hours</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="startTime" className="text-xs">Start Time</Label>
                          <Input
                            id="startTime"
                            type="time"
                            value={conditions.businessHours.start}
                            onChange={(e) =>
                              setConditions({
                                ...conditions,
                                businessHours: {
                                  ...conditions.businessHours,
                                  start: e.target.value,
                                },
                              })
                            }
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="endTime" className="text-xs">End Time</Label>
                          <Input
                            id="endTime"
                            type="time"
                            value={conditions.businessHours.end}
                            onChange={(e) =>
                              setConditions({
                                ...conditions,
                                businessHours: {
                                  ...conditions.businessHours,
                                  end: e.target.value,
                                },
                              })
                            }
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                          const isActive = conditions.businessHours.days.includes(idx + 1)
                          return (
                            <button
                              key={day}
                              onClick={() => {
                                const days = isActive
                                  ? conditions.businessHours.days.filter((d) => d !== idx + 1)
                                  : [...conditions.businessHours.days, idx + 1]
                                setConditions({
                                  ...conditions,
                                  businessHours: { ...conditions.businessHours, days },
                                })
                              }}
                              className={`flex-1 py-2 text-xs rounded border transition-all ${
                                isActive
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white border-gray-300 hover:border-blue-400'
                              }`}
                            >
                              {day}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {enabled && (
        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={saving || !forwardingNumber}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      )}
    </div>
  )
}
