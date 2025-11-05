'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import PhoneInput, { toE164 } from '@/components/PhoneInput'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ExternalLink, Phone } from 'lucide-react'
import MobileNav from '@/components/MobileNav'
import AssistantConfig from '@/components/AssistantConfig'
import PricingSheetEditor from '@/components/PricingSheetEditor'
import BusinessHoursEditor from '@/components/BusinessHoursEditor'
import OnCallManager from '@/components/OnCallManager'
import CalendarSettings from '@/components/CalendarSettings'
import KnowledgeManager from '@/components/KnowledgeManager'
import FirstTimeSettingsChecklist from '@/components/FirstTimeSettingsChecklist'
import PricingResponseTemplates from '@/components/PricingResponseTemplates'
import PhoneSetup from '@/components/PhoneSetup'


export default function SettingsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.id as string

  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<any>(null)
  const [calApiKey, setCalApiKey] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyInfo, setVerifyInfo] = useState<any>(null)
  const [connecting, setConnecting] = useState(false)
  const [purchasingNumber, setPurchasingNumber] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('general')

  useEffect(() => {
    const validTabs = new Set([
      'general',
      'pricing',
      'hours',
      'oncall',
      'scheduling',
      'assistant',
      'numbers',
      'billing',
    ])
    const t = searchParams?.get('tab') || ''
    if (t && validTabs.has(t)) setActiveTab(t)
  }, [searchParams])

  useEffect(() => {
    loadProject()
  }, [projectId])

  const loadProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      const data = await res.json()
      setProject(data.project)
      try {
        const sres = await fetch(`/api/projects/${projectId}/subscription`)
        const sdata = await sres.json()
        setSubscription(sdata.subscription || null)
      } catch (e) {
        console.warn('Failed to load subscription:', (e as any)?.message)
      }
    } catch (error) {
      console.error('Failed to load project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStripePortal = async () => {
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json()
      if (!res.ok || !data?.url) {
        alert(data?.error || 'No active subscription found. Complete checkout first.')
        return
      }
      window.location.href = data.url
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleVerifyCalApiKey = async () => {
    try {
      setVerifying(true)
      setVerifyInfo(null)
      const res = await fetch('/api/calcom/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: calApiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')
      setVerifyInfo(data)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setVerifying(false)
    }
  }

  const handleConnectCalApiKey = async () => {
    try {
      setConnecting(true)
      const res = await fetch('/api/calcom/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, apiKey: calApiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Connect failed')
      alert('Cal.com connected and event type created!')
      await loadProject()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setConnecting(false)
    }
  }

  const handleOAuthConnect = () => {
    window.location.href = `/api/calcom/oauth/authorize?projectId=${projectId}`
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Project Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <div className="md:hidden">
              <MobileNav projectId={projectId} />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Settings - {project.name}</h1>

        {/* First Time Settings Checklist */}
        <FirstTimeSettingsChecklist
          projectId={projectId}
          storageKey={`first-time-settings-${projectId}`}
          calendarConnected={Boolean(project.calcomApiKey || project.calcomAccessToken)}
          pricingConfigured={Boolean(project.pricingSheet)}
          businessHoursConfigured={Boolean(project.businessHours && Object.keys(project.businessHours || {}).length > 0)}
          onCallConfigured={Boolean(project.technicians && project.technicians.length > 0)}
          phoneConfigured={Boolean((project.numbers && project.numbers.length > 0) || (project.forwardingEnabled && project.forwardingNumber))}
        />

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v)
            try {
              const sp = new URLSearchParams(window.location.search)
              sp.set('tab', v)
              router.replace(`?${sp.toString()}`, { scroll: false })
            } catch (_) {
              // no-op in non-browser
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Costs</TabsTrigger>
            <TabsTrigger value="hours">Business Hours</TabsTrigger>
            <TabsTrigger value="oncall">Emergency On-Call</TabsTrigger>
            <TabsTrigger value="scheduling">Calendar & Scheduling</TabsTrigger>
            <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
            <TabsTrigger value="numbers">Phone Numbers</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Basic project information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Business Name</Label>
                  <Input value={project.name} disabled />
                </div>
                <div>
                  <Label>Trade</Label>
                  <Input value={project.trade} disabled />
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Input value={project.timezone} disabled />
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Warranty & Business Info</CardTitle>
                <CardDescription>Information the AI uses when talking to customers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Business Address</Label>
                  <Input
                    value={project.businessAddress || ''}
                    onChange={(e) => setProject({ ...project, businessAddress: e.target.value })}
                    placeholder="123 Main St, City, State ZIP"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used for service area validation and distance calculations</p>
                </div>
                <div>
                  <Label>Service Radius (miles)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="500"
                    value={project.serviceRadius || ''}
                    onChange={(e) => setProject({ ...project, serviceRadius: parseInt(e.target.value) || null })}
                    placeholder="25"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum distance from your business address to accept jobs (recommended: 25-50 miles)</p>
                </div>
                <div>
                  <Label>Warranty Information</Label>
                  <Textarea
                    value={
                      typeof project.warrantyInfo === 'object' && project.warrantyInfo?.coverage
                        ? project.warrantyInfo.coverage
                        : typeof project.warrantyInfo === 'string'
                        ? project.warrantyInfo
                        : ''
                    }
                    onChange={(e) => {
                      const warranty = typeof project.warrantyInfo === 'object' 
                        ? { ...project.warrantyInfo, coverage: e.target.value }
                        : e.target.value
                      setProject({ ...project, warrantyInfo: warranty })
                    }}
                    placeholder="e.g., 90-day warranty on all workmanship. Parts warranty per manufacturer. Labor not included in parts warranty."
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">Payment terms, warranties, disclaimers, etc.</p>
                </div>
                <Button
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/projects/${projectId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          businessAddress: project.businessAddress,
                          serviceRadius: project.serviceRadius,
                          warrantyInfo: project.warrantyInfo,
                        }),
                      })
                      if (!res.ok) throw new Error('Failed to save')
                      alert('Saved!')
                      loadProject() // Reload to confirm save
                    } catch (e: any) {
                      alert(e.message)
                    }
                  }}
                >
                  Save
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="mt-6">
            <PricingSheetEditor projectId={projectId} trade={project.trade} />
            <div className="mt-8">
              <PricingResponseTemplates
                projectId={projectId}
                trade={project.trade}
                tripFee={project.pricingSheet?.tripFee || 0}
                emergencyMultiplier={project.emergencyMultiplier || 1.5}
              />
            </div>
          </TabsContent>

          <TabsContent value="hours" className="mt-6">
            <BusinessHoursEditor projectId={projectId} />
          </TabsContent>

          <TabsContent value="oncall" className="mt-6">
            <OnCallManager projectId={projectId} />
          </TabsContent>

          <TabsContent value="scheduling" className="mt-6">
            <CalendarSettings
              projectId={projectId}
              trade={project.trade}
              projectName={project.name}
            />
          </TabsContent>

          <TabsContent value="assistant" className="mt-6">
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">How Your AI Assistant Works</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-800 space-y-3">
                <p>
                  <strong>Your AI assistant answers calls 24/7 on your behalf.</strong> It handles emergencies, books appointments, and provides pricing information automatically.
                </p>
                <div className="space-y-2">
                  <p><strong>Current Features:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Emergency Detection:</strong> Detects urgent keywords (burst pipe, sparking, flooding) and routes to on-call techs</li>
                    <li><strong>Appointment Booking:</strong> Collects customer info and books via Cal.com automatically</li>
                    <li><strong>Pricing Responses:</strong> Uses your pricing sheet from the Pricing & Costs tab</li>
                    <li><strong>Business Hours Forwarding:</strong> Forwards calls to your phone during business hours, AI handles after-hours</li>
                    <li><strong>Ultra-Low Latency:</strong> Powered by OpenAI Realtime API for natural, real-time conversations with minimal delay</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {project.agents && project.agents.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Assistant Configuration</CardTitle>
                      <CardDescription>
                        Customize your AI assistant settings below. Changes take effect immediately.
                      </CardDescription>
                    </div>
                    <Badge className="bg-green-600">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <AssistantConfig
                    activeAgent={project.agents?.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]}
                    projectName={project.name}
                    trade={project.trade}
                    onUpdated={loadProject}
                  />
                </CardContent>
              </Card>
            )}



            {(!project.agents || project.agents.length === 0) && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600 mb-2">No AI assistant configured yet.</p>
                  <p className="text-sm text-gray-500 mb-6">Create an AI assistant to start answering calls.</p>
                  <Button
                    onClick={async () => {
                      try {
                        setLoading(true)
                        const res = await fetch('/api/agents', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            projectId: project.id,
                            name: `${project.name} AI Assistant`,
                            voice: 'alloy',
                          }),
                        })
                        const data = await res.json()
                        if (!res.ok) throw new Error(data.error || 'Failed to create agent')
                        await loadProject()
                      } catch (error: any) {
                        alert(error.message || 'Failed to create agent')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create AI Assistant'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="numbers" className="mt-6">
            <div className="mb-6">
              <PhoneSetup projectId={projectId} aiNumber={project.numbers?.[0]?.e164} />
            </div>
            {/* How It Works Card */}
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">How Phone Numbers Work</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-800 space-y-3">
                <p>
                  Your AI assistant answers calls on your business phone number 24/7. You have two options:
                </p>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold mb-2">Option 1: Get a New Number</h4>
                    <p className="text-xs">Purchase a dedicated business number through Vapi. Fully managed, no setup required!</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold mb-2">Option 2: Forward Your Number</h4>
                    <p className="text-xs">Keep your current carrier. Set up call forwarding to your AI number after business hours.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Phone Number Card */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      AI Assistant Phone Number
                      <Badge variant="default" className="bg-blue-600">OpenAI Realtime</Badge>
                    </CardTitle>
                    <CardDescription>This number is answered by your OpenAI Realtime AI assistant 24/7</CardDescription>
                  </div>
                  <Badge className="bg-green-600 text-white">Active</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {project.numbers?.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Phone className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="font-medium">No phone number configured</p>
                    <p className="text-sm mt-2 mb-4">
                      Get a dedicated business number powered by AI
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <Button
                        disabled={purchasingNumber}
                        onClick={async () => {
                          try {
                            setPurchasingNumber(true)
                            const activeAgent = (project.agents || []).sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
                            if (!activeAgent) {
                              alert('No assistant found to attach number to.')
                              return
                            }
                            const res = await fetch('/api/numbers', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ projectId, agentId: activeAgent.id }),
                            })
                            const data = await res.json()
                            if (!res.ok) {
                              // Handle subscription required
                              if (data.requiresSubscription) {
                                if (confirm(`${data.error}\n\nWould you like to view pricing plans?`)) {
                                  window.location.href = '/pricing'
                                }
                                return
                              }
                              // Handle Twilio upgrade required
                              if (data.requiresTwilioUpgrade) {
                                alert(data.error)
                                return
                              }
                              throw new Error(data.error || 'Failed to purchase number')
                            }
                            alert(`Number purchased: ${data?.phoneNumber?.e164 || 'success'}`)
                            await loadProject()
                          } catch (e: any) {
                            alert(`Error: ${e.message}`)
                          } finally {
                            setPurchasingNumber(false)
                          }
                        }}
                      >
                        {purchasingNumber ? 'Purchasing...' : 'Purchase Number'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/projects/${projectId}/numbers/sync`, { method: 'POST' })
                            const data = await res.json()
                            if (!res.ok) throw new Error(data.error || 'Failed to sync numbers')
                            alert(`Synced ${data.upserts || 0} number(s).`)
                            await loadProject()
                          } catch (e: any) {
                            alert(e.message)
                          }
                        }}
                      >
                        Sync from Vapi
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {project.numbers?.map((num: any) => (
                      <div key={num.id} className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="bg-blue-600 p-3 rounded-full">
                              <Phone className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold font-mono text-gray-900">
                                {num.e164.replace(/(\+1)(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4')}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {num.label || 'Business Line'} • Powered by AI
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-blue-200">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Call Routing</p>
                              <p className="font-medium text-gray-900">
                                {project.forwardingEnabled ? 'AI + Forwarding' : 'AI Only'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Status</p>
                              <p className="font-medium text-green-600">Active & Receiving Calls</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Hours Forwarding Card */}
            <Card>
              <CardHeader>
                <CardTitle>Business Hours Call Forwarding</CardTitle>
                <CardDescription>
                  Optionally forward calls to your personal phone during business hours
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <div className="text-amber-600 mt-0.5">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-sm text-amber-800">
                      <p className="font-semibold mb-1">How it works:</p>
                      <ul className="space-y-1 list-disc pl-4">
                        <li><strong>During business hours:</strong> Calls ring your forwarding number first. If no answer, AI takes over.</li>
                        <li><strong>After hours:</strong> AI answers immediately (no ringing).</li>
                        <li><strong>Emergencies:</strong> AI detects urgency and routes to on-call techs automatically.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Your Phone Number (Owner Line)</Label>
                  <div className="flex items-center gap-3">
                    <PhoneInput
                      value={project.forwardingNumber || ''}
                      onChange={(v) => setProject({ ...project, forwardingNumber: v })}
                      placeholder="(555) 123-4567"
                    />
                    <Button
                      onClick={async () => {
                        try {
                          const e164 = toE164(project.forwardingNumber || '')
                          const res = await fetch(`/api/projects/${projectId}/forwarding`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              forwardingEnabled: true,
                              forwardingNumber: e164,
                            }),
                          })
                          const data = await res.json()
                          if (!res.ok) throw new Error(data.error || 'Failed to save')
                          alert('Forwarding number saved successfully!')
                        } catch (e: any) {
                          alert(`Error: ${e.message}`)
                        }
                      }}
                    >
                      Save
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    This is where calls will ring during your business hours (set in Business Hours tab)
                  </p>
                </div>

                {project.forwardingNumber && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="text-green-600 mt-0.5">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-sm text-green-800">
                        <p className="font-semibold">Forwarding configured</p>
                        <p className="mt-1">
                          Calls to <span className="font-mono font-semibold">{project.numbers?.[0]?.e164}</span> will ring{' '}
                          <span className="font-mono font-semibold">{project.forwardingNumber}</span> during business hours.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Knowledge manager under Assistant tab for both plans */}
          <TabsContent value="assistant" className="mt-6">
            <KnowledgeManager projectId={projectId} plan={(project as any).plan || 'starter'} />
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/agents/sync', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ projectId }),
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || 'Failed to sync')
                    alert('Assistant updated with latest settings')
                  } catch (e: any) {
                    alert(e.message)
                  }
                }}
              >
                Apply Settings to Assistant
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Billing & Subscription</CardTitle>
                <CardDescription>Manage your subscription and payment methods</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscription ? (
                  <>
                    <div>
                      <Label>Current Plan</Label>
                      <div className="mt-2">
                        {(() => {
                          const proId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
                          const starterId = process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER
                          let planName = 'Starter'
                          if (subscription.priceId) {
                            if (proId && subscription.priceId === proId) planName = 'Pro'
                            else if (starterId && subscription.priceId === starterId) planName = 'Starter'
                          }
                          const price = planName === 'Pro' ? '299' : '149'
                          return (
                            <Badge variant="default" className="text-lg px-4 py-2">
                              {planName} - ${price}/mo
                            </Badge>
                          )
                        })()}
                      </div>
                    </div>
                    <div>
                      <Label>Billing Period</Label>
                      <p className="text-sm text-gray-600 mt-1">
                        Current period ends on {subscription.currentPeriodEnd 
                          ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="pt-4 flex gap-3">
                      <Button onClick={handleStripePortal}>
                        Manage Subscription <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center py-6 border rounded-lg">
                      <p className="font-medium text-lg mb-2">No Active Subscription</p>
                      <p className="text-sm text-gray-600 mb-4">Subscribe to unlock AI receptionist features</p>
                      <Button asChild>
                        <Link href="/pricing">View Pricing Plans</Link>
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
