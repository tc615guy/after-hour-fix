'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, CheckCircle2, ChevronRight, ArrowRight } from 'lucide-react'

const TRADES = [
  'Plumbing',
  'HVAC',
  'Electrical',
]

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Step 1: Business Info
  const [businessName, setBusinessName] = useState('')
  const [trade, setTrade] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')

  // Track completion
  const [projectId, setProjectId] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include'
        })
        if (!res.ok) {
          console.error('Auth check failed:', res.status, await res.text())
          router.push('/auth/login')
          return
        }
        const data = await res.json()
        console.log('Auth check success:', data.user?.email)
        setUserId(data.user?.id)
      } catch (e) {
        console.error('Auth check error:', e)
        router.push('/auth/login')
      }
    }
    checkAuth()
  }, [router])

  const handleCreateProject = async () => {
    if (!businessName || !trade) {
      alert('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: businessName,
          trade,
          timezone,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create project')

      setProjectId(data.project.id)
      setStep(2)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = () => {
    if (projectId) {
      router.push(`/dashboard?welcome=true`)
    } else {
      router.push('/dashboard')
    }
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-6">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                      step >= s
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                  </div>
                  {s < 2 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-600">Step {step} of 2</div>
          </div>

          <CardTitle>
            {step === 1 && 'Welcome to AfterHourFix'}
            {step === 2 && 'You\'re All Set!'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Let\'s get your AI receptionist set up in just a few steps'}
            {step === 2 && 'Your AI assistant is ready to answer calls 24/7'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input
                    id="business-name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Smith Plumbing Co."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="trade">Trade / Industry</Label>
                  <Select value={trade} onValueChange={setTrade}>
                    <SelectTrigger id="trade" className="mt-1">
                      <SelectValue placeholder="Select your trade" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRADES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger id="timezone" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Your AI assistant will be created automatically</li>
                  <li>• You can configure pricing, hours, and calendar integration</li>
                  <li>• Get a phone number or port your existing one</li>
                  <li>• Start receiving calls immediately</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  onClick={handleCreateProject}
                  disabled={loading || !businessName || !trade}
                  className="min-w-32"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Continue <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-900 mb-2">
                  Your AI Receptionist is Ready!
                </h3>
                <p className="text-green-800">
                  We've created your project and AI assistant. Head to your dashboard to complete setup.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Next Steps</h4>
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li>✓ Set your pricing and service rates</li>
                    <li>✓ Configure business hours</li>
                    <li>✓ Add emergency on-call technicians</li>
                    <li>✓ Get or port a phone number</li>
                    <li>✓ Connect your calendar (optional)</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4 bg-blue-50">
                  <h4 className="font-semibold mb-2 text-blue-900">Need Help?</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    Our setup checklist will guide you through each step in the dashboard.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href="https://docs.afterhourfix.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Documentation
                    </a>
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button onClick={handleComplete} className="min-w-32">
                  Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

