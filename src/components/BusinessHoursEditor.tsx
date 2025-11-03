'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PhoneInput, { toE164 } from '@/components/PhoneInput'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Clock, Phone, Calendar } from 'lucide-react'

interface DayHours {
  enabled: boolean
  open: string
  close: string
  aiAllDay?: boolean
}

interface BusinessHours {
  mon: DayHours
  tue: DayHours
  wed: DayHours
  thu: DayHours
  fri: DayHours
  sat: DayHours
  sun: DayHours
}

const DEFAULT_HOURS: DayHours = { enabled: true, open: '08:00', close: '17:00' }
const DAY_NAMES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface BusinessHoursEditorProps {
  projectId: string
}

export default function BusinessHoursEditor({ projectId }: BusinessHoursEditorProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hours, setHours] = useState<BusinessHours>({
    mon: DEFAULT_HOURS,
    tue: DEFAULT_HOURS,
    wed: DEFAULT_HOURS,
    thu: DEFAULT_HOURS,
    fri: DEFAULT_HOURS,
    sat: { enabled: false, open: '08:00', close: '17:00' },
    sun: { enabled: false, open: '08:00', close: '17:00' },
  })
  const [forwardingNumber, setForwardingNumber] = useState('')
  const [forwardingEnabled, setForwardingEnabled] = useState(true)
  const [holidays, setHolidays] = useState<Array<{ date: string; name: string; enabled?: boolean }>>([])
  const [alwaysOn, setAlwaysOn] = useState(false)
  const [allowWeekendBooking, setAllowWeekendBooking] = useState(true)
  const [requireOnCallForWeekend, setRequireOnCallForWeekend] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [projectId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.ok) {
        const { project } = await res.json()
        if (project.businessHours) {
          setHours(project.businessHours)
        }
        if (project.forwardingNumber) {
          setForwardingNumber(project.forwardingNumber)
        }
        if (typeof project.forwardingEnabled === 'boolean') {
          setForwardingEnabled(project.forwardingEnabled)
        }
        if (Array.isArray(project.holidays)) {
          setHolidays(project.holidays)
        }
        if (typeof project.allowWeekendBooking === 'boolean') {
          setAllowWeekendBooking(project.allowWeekendBooking)
        }
        if (typeof project.requireOnCallForWeekend === 'boolean') {
          setRequireOnCallForWeekend(project.requireOnCallForWeekend)
        }
        // Detect always-on (24/7 AI, no forwarding)
        try {
          const h = project.businessHours
          const allDay = ['mon','tue','wed','thu','fri','sat','sun'].every((d:string)=> h?.[d]?.enabled && h?.[d]?.open==='00:00' && h?.[d]?.close==='23:59')
          setAlwaysOn(Boolean(allDay && project.forwardingEnabled === false))
        } catch {}
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateDay = (day: keyof BusinessHours, field: keyof DayHours, value: any) => {
    setHours({
      ...hours,
      [day]: {
        ...hours[day],
        [field]: value,
      },
    })
  }

  const copyToAll = (day: keyof BusinessHours) => {
    const template = hours[day]
    const newHours = { ...hours }
    DAY_NAMES.forEach((d) => {
      newHours[d as keyof BusinessHours] = { ...template }
    })
    setHours(newHours)
  }

  const saveSettings = async () => {
    try {
      setSaving(true)

      // Validate forwarding number if enabled
      if (forwardingEnabled && !forwardingNumber) {
        alert('Please enter a forwarding number or disable call forwarding')
        return
      }

      // Convert display phone to E.164 for API
      const e164 = toE164(forwardingNumber)

      // If always-on, force 24/7 and disable forwarding
      let hoursToSave = hours
      let forwardingEnabledToSave = forwardingEnabled
      if (alwaysOn) {
        const full: BusinessHours = {
          mon: { enabled: true, open: '00:00', close: '23:59' },
          tue: { enabled: true, open: '00:00', close: '23:59' },
          wed: { enabled: true, open: '00:00', close: '23:59' },
          thu: { enabled: true, open: '00:00', close: '23:59' },
          fri: { enabled: true, open: '00:00', close: '23:59' },
          sat: { enabled: true, open: '00:00', close: '23:59' },
          sun: { enabled: true, open: '00:00', close: '23:59' },
        }
        hoursToSave = full
        forwardingEnabledToSave = false
      }

      const res = await fetch(`/api/projects/${projectId}/hours`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessHours: hoursToSave,
          forwardingEnabled: forwardingEnabledToSave,
          forwardingNumber: e164,
          holidays,
          allowWeekendBooking,
          requireOnCallForWeekend,
        }),
      })

      if (!res.ok) throw new Error('Failed to save settings')

      alert('Settings saved successfully!')
    } catch (error: any) {
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  const getCurrentStatus = () => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const todayHoliday = holidays.find((h) => (h.enabled !== false) && h.date === todayStr)
    if (todayHoliday) {
      return { open: false, message: `Closed for ${todayHoliday.name || 'Holiday'}` }
    }
    const day = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()]
    const dayHours = hours[day as keyof BusinessHours]

    if (!dayHours.enabled) {
      return { open: false, message: 'Closed today' }
    }

    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const isOpen = currentTime >= dayHours.open && currentTime <= dayHours.close

    return {
      open: isOpen,
      message: isOpen
        ? `Open now (until ${dayHours.close})`
        : `Closed (opens at ${dayHours.open})`,
    }
  }

  const status = getCurrentStatus()

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
      {/* Current Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${status.open ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            <div>
              <div className="font-semibold">
                {status.open ? 'Currently Open' : 'Currently Closed'}
              </div>
              <div className="text-sm text-gray-600">{status.message}</div>
              {status.open && forwardingEnabled && forwardingNumber && (
                <div className="text-sm text-blue-600 mt-1">
                  Calls forwarding to {forwardingNumber}
                </div>
              )}
              {!status.open && (
                <div className="text-sm text-green-600 mt-1">
                  AI handling calls now
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Business Hours
          </CardTitle>
          <CardDescription>
            When AI handles calls vs. when calls forward to your phone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-6 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Allow weekend booking</Label>
              <Switch checked={allowWeekendBooking} onCheckedChange={setAllowWeekendBooking} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Require on-call coverage for weekend booking</Label>
              <Switch checked={requireOnCallForWeekend} onCheckedChange={setRequireOnCallForWeekend} />
            </div>
          </div>
          {DAY_NAMES.map((day, idx) => {
            const dayHours = hours[day as keyof BusinessHours]
            return (
              <div key={day} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="w-24">
                  <span className="font-medium">{DAY_LABELS[idx]}</span>
                </div>

                <Switch
                  checked={dayHours.enabled}
                  onCheckedChange={(checked) => updateDay(day as keyof BusinessHours, 'enabled', checked)}
                />

                {dayHours.enabled ? (
                  <>
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={dayHours.open}
                        onChange={(e) => updateDay(day as keyof BusinessHours, 'open', e.target.value)}
                        disabled={Boolean(dayHours.aiAllDay)}
                        className="w-32"
                      />
                      <span className="text-gray-500">to</span>
                      <Input
                        type="time"
                        value={dayHours.close}
                        onChange={(e) => updateDay(day as keyof BusinessHours, 'close', e.target.value)}
                        disabled={Boolean(dayHours.aiAllDay)}
                        className="w-32"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToAll(day as keyof BusinessHours)}
                      className="text-xs"
                    >
                      Copy to all
                    </Button>
                    <div className="flex items-center gap-2 ml-2">
                      <Label className="text-xs">AI answers all day</Label>
                      <Switch
                        checked={Boolean((hours[day as keyof BusinessHours] as any).aiAllDay)}
                        onCheckedChange={(checked) => updateDay(day as keyof BusinessHours, 'aiAllDay', checked as any)}
                      />
                    </div>
                  </>
                ) : (
                  <span className="text-gray-500 flex-1">Closed</span>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Call Forwarding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Business Hours Call Forwarding
          </CardTitle>
          <CardDescription>
            Forward calls to your phone/office during Business Hours (AI handles after-hours)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">Enable Call Forwarding</div>
              <div className="text-sm text-gray-600">
                Forward calls during Business Hours
              </div>
            </div>
            <Switch checked={forwardingEnabled} onCheckedChange={setForwardingEnabled} />
          </div>

          {forwardingEnabled && (
            <div>
              <Label htmlFor="forwardingNumber">Forwarding Phone Number</Label>
              <PhoneInput id="forwardingNumber" value={forwardingNumber} onChange={setForwardingNumber} />
              <p className="text-xs text-gray-500 mt-2">
                Your business line or personal cell. Saved in +E.164 format automatically.
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2">How it works:</h4>
            <ul className="text-xs space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span><strong>During Business Hours:</strong> Calls forward to your phone (you're available!)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span><strong>Outside Business Hours:</strong> AI answers automatically (24/7 service)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span><strong>On closed days:</strong> AI handles all calls (never miss emergency)</span>
              </li>
            </ul>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2 text-red-800">⚠️ Important Setup Required:</h4>
            <p className="text-xs text-red-700 mb-2">
              This forwards calls <strong>from your AI number TO your business line</strong> during Business Hours.
            </p>
            <p className="text-xs text-red-700 font-semibold">
              You also need to configure your carrier to forward calls from your business line TO your AI number after hours/weekends.
              <a href="/help/forwarding" target="_blank" className="underline ml-1">See instructions →</a>
            </p>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2 text-amber-800">💡 How It Works:</h4>
            <p className="text-xs text-amber-700 mb-1">
              <strong>Scenario:</strong> Using your existing business line + AfterHourFix AI number
            </p>
            <ul className="text-xs text-amber-700 space-y-1 ml-4">
              <li className="list-disc">Your business line forwards to AI after hours (carrier config)</li>
              <li className="list-disc">AI forwards to your business line during business hours (above setting)</li>
              <li className="list-disc">You get all the calls when you're available!</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Holiday Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Holiday Closures
          </CardTitle>
          <CardDescription>
            Add dates when your business is closed. AI handles all calls on these days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {holidays.length === 0 && (
              <div className="text-sm text-gray-500">No holidays added.</div>
            )}
            {holidays.map((h, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg">
                <input
                  type="date"
                  value={h.date}
                  onChange={(e) => {
                    const v = e.target.value
                    setHolidays(holidays.map((x, i) => i === idx ? { ...x, date: v } : x))
                  }}
                  className="h-10 px-3 rounded-md border border-input bg-background"
                />
                <Input
                  placeholder="Holiday name (e.g., Thanksgiving)"
                  value={h.name}
                  onChange={(e) => setHolidays(holidays.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                />
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Enabled</Label>
                  <Switch
                    checked={h.enabled !== false}
                    onCheckedChange={(checked) => setHolidays(holidays.map((x, i) => i === idx ? { ...x, enabled: checked } : x))}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() => setHolidays(holidays.filter((_, i) => i !== idx))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setHolidays([...holidays, { date: new Date().toISOString().split('T')[0], name: '' }])}
          >
            Add Holiday
          </Button>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving}>
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  )
}


