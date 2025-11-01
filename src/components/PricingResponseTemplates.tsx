'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Sparkles, Copy, Check } from 'lucide-react'

interface ResponseTemplate {
  id: string
  scenario: string
  title: string
  description: string
  template: string
  category: 'simple' | 'detailed' | 'emergency'
}

interface PricingResponseTemplatesProps {
  projectId: string
  trade: string
  tripFee: number
  emergencyMultiplier: number
}

const DEFAULT_TEMPLATES: ResponseTemplate[] = [
  {
    id: 'simple-inquiry',
    scenario: 'Customer asks: "How much do you charge?"',
    title: 'General Pricing Inquiry',
    description: 'When customer asks about general pricing',
    template: `"Our pricing varies depending on the specific service you need. We charge a $[TRIP_FEE] trip fee to come out and assess the situation, and then the final price depends on the parts and labor required. Our technician will provide you with a detailed quote before starting any work. Would you like to schedule an appointment?"`,
    category: 'simple',
  },
  {
    id: 'no-trip-fee',
    scenario: 'Customer asks about pricing (No trip fee)',
    title: 'General Pricing - No Trip Fee',
    description: 'When no trip fee is configured',
    template: `"Our pricing depends on the specific service and parts needed. Our technician will assess the situation and provide you with a detailed quote before starting any work. There's no charge for the estimate. Would you like to schedule an appointment?"`,
    category: 'simple',
  },
  {
    id: 'specific-service',
    scenario: 'Customer asks about a specific service',
    title: 'Specific Service Quote',
    description: 'When customer asks about a particular service',
    template: `"For [SERVICE_NAME], we typically charge around $[BASE_PRICE] plus the $[TRIP_FEE] trip fee. However, the final price may vary depending on the specific situation and any parts needed. Our technician will give you an exact quote when they arrive. Would you like to book an appointment?"`,
    category: 'detailed',
  },
  {
    id: 'emergency-pricing',
    scenario: 'Emergency situation pricing',
    title: 'Emergency Rate Response',
    description: 'When customer needs emergency service',
    template: `"Since this is an emergency situation, our emergency rates apply, which are [EMERGENCY_MULTIPLIER]x our standard pricing. This includes the $[TRIP_FEE] trip fee and priority response. We can have someone there within 30 minutes. Would you like me to dispatch a technician right away?"`,
    category: 'emergency',
  },
  {
    id: 'after-hours',
    scenario: 'After-hours service request',
    title: 'After-Hours Rate Response',
    description: 'For calls outside business hours',
    template: `"Since we're outside of regular business hours, after-hours rates apply, which are [EMERGENCY_MULTIPLIER]x our normal pricing. This includes the $[TRIP_FEE] trip fee. Our technician can still come out tonight if it's urgent, or we can schedule you for first thing tomorrow morning at standard rates. Which would you prefer?"`,
    category: 'emergency',
  },
  {
    id: 'price-objection',
    scenario: 'Customer objects to pricing',
    title: 'Pricing Objection Handling',
    description: 'When customer thinks price is too high',
    template: `"I understand your concern. Our pricing reflects our licensed, insured technicians, quality parts, and warranty on all work. The $[TRIP_FEE] trip fee covers the cost of having a technician come out, and you'll get an exact quote before any work begins. We also offer financing options for larger jobs. Would you like to schedule an appointment to get a firm quote?"`,
    category: 'detailed',
  },
  {
    id: 'competitor-comparison',
    scenario: 'Customer mentions competitor pricing',
    title: 'Competitor Price Comparison',
    description: 'When customer compares to other companies',
    template: `"I appreciate you doing your research. While other companies may quote different prices, our rates include licensed technicians, quality parts, workmanship warranty, and 24/7 availability. We're transparent about our $[TRIP_FEE] trip fee upfront, and our technician will provide a detailed quote before starting. We're confident in the value we provide. Would you like to schedule an appointment?"`,
    category: 'detailed',
  },
  {
    id: 'free-estimate',
    scenario: 'Customer asks about free estimates',
    title: 'Free Estimate Response',
    description: 'When customer asks if estimates are free',
    template: `"We charge a $[TRIP_FEE] trip fee for our technician to come out and assess your situation. This fee covers their time and expertise in diagnosing the issue. Once they provide you with a quote and you approve the work, the trip fee is often included in the total service price. This ensures our technicians can give you accurate, professional assessments."`,
    category: 'detailed',
  },
]

export default function PricingResponseTemplates({
  projectId,
  trade,
  tripFee,
  emergencyMultiplier,
}: PricingResponseTemplatesProps) {
  const [templates, setTemplates] = useState<ResponseTemplate[]>(DEFAULT_TEMPLATES)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Replace placeholders in template text
  const fillTemplate = (template: string): string => {
    return template
      .replace(/\[TRIP_FEE\]/g, tripFee > 0 ? tripFee.toString() : '0')
      .replace(/\[EMERGENCY_MULTIPLIER\]/g, `${emergencyMultiplier}`)
      .replace(/\[SERVICE_NAME\]/g, '[specific service]')
      .replace(/\[BASE_PRICE\]/g, '[price]')
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/response-templates`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && Array.isArray(data.templates) && data.templates.length > 0) {
            setTemplates(data.templates)
          }
        }
      } catch {}
      finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [projectId])

  const resetToDefaults = async () => {
    setTemplates(DEFAULT_TEMPLATES)
  }

  const saveTemplates = async () => {
    try {
      setSaving(true)
      // Save templates to project settings
      const res = await fetch(`/api/projects/${projectId}/response-templates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates }),
      })
      if (!res.ok) throw new Error('Failed to save templates')
      alert('Response templates saved successfully!')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-purple-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-purple-900">AI Pricing Response Templates</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-purple-800 space-y-2">
          <p>
            These templates help your AI assistant respond professionally to different pricing questions.
            They automatically fill in your actual trip fee and emergency rates.
          </p>
          <p className="font-semibold">
            Your AI automatically uses these templates during calls - no configuration needed!
          </p>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold">Response Scenarios</Label>
          <div className="flex gap-2">
            <Badge variant="outline">Simple</Badge>
            <Badge variant="outline" className="bg-blue-50">Detailed</Badge>
            <Badge variant="outline" className="bg-red-50">Emergency</Badge>
            <Button variant="outline" size="sm" onClick={resetToDefaults}>
              Reset to defaults
            </Button>
            <Button variant="outline" size="sm" onClick={saveTemplates} disabled={saving}>
              {saving ? 'Saving...' : 'Save Templates'}
            </Button>
          </div>
        </div>

        {templates.map((template) => (
          <Card
            key={template.id}
            className={`transition-all ${
              template.category === 'emergency'
                ? 'border-red-200 bg-red-50/30'
                : template.category === 'detailed'
                ? 'border-blue-200 bg-blue-50/30'
                : ''
            }`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                    <CardTitle className="text-base">{template.title}</CardTitle>
                    <Badge
                      variant="outline"
                      className={
                        template.category === 'emergency'
                          ? 'bg-red-100 text-red-700'
                          : template.category === 'detailed'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }
                    >
                      {template.category}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    <span className="font-semibold">Scenario:</span> {template.scenario}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                >
                  {expandedId === template.id ? 'Hide' : 'View'}
                </Button>
              </div>
            </CardHeader>

            {expandedId === template.id && (
              <CardContent className="space-y-3 pt-0">
                <div>
                  <Label className="text-xs font-semibold text-gray-600">AI Response:</Label>
                  <div className="mt-2 p-4 bg-white border rounded-lg relative">
                    <p className="text-sm text-gray-800 italic whitespace-pre-wrap">
                      {fillTemplate(template.template)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(fillTemplate(template.template), template.id)}
                    >
                      {copiedId === template.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                  <p className="font-semibold mb-1">When to use:</p>
                  <p>{template.description}</p>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Variables Reference */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm">Current Values</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Trip Fee:</span>
            <span className="font-mono font-semibold">
              {tripFee > 0 ? `$${tripFee}` : 'Not set'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Emergency Multiplier:</span>
            <span className="font-mono font-semibold">{emergencyMultiplier}x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Trade:</span>
            <span className="font-semibold capitalize">{trade}</span>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 text-sm text-green-800">
            <Check className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">These templates are active!</p>
              <p>
                Your AI assistant automatically uses these responses during calls. They adapt based on your
                trip fee, emergency rates, and specific services in your pricing sheet.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
