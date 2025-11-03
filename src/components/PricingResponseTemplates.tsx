'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Sparkles, Copy, Check, Edit2, Plus, Trash2, X } from 'lucide-react'

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
    id: 'general-pricing',
    scenario: 'Customer asks about general pricing',
    title: 'General Pricing Response',
    description: 'When customer asks "How much?" or "What do you charge?"',
    template: `"We charge $[TRIP_FEE] to come out and assess the situation. The final price depends on parts and labor needed. Our technician will give you an exact quote before starting any work. Would you like to book an appointment?"`,
    category: 'simple',
  },
  {
    id: 'emergency-pricing',
    scenario: 'Emergency situation pricing',
    title: 'Emergency Rate Response',
    description: 'When customer needs emergency service',
    template: `"Emergency rates apply, which are [EMERGENCY_MULTIPLIER]x our standard pricing with priority response. I can dispatch someone right away. Would you like to proceed?"`,
    category: 'emergency',
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
  const [pushing, setPushing] = useState<boolean>(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
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

  const pushToAssistant = async () => {
    try {
      setPushing(true)
      // Push pricing to assistant
      const res = await fetch('/api/agents/push-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to push to assistant')
      alert('Templates pushed to assistant successfully!')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setPushing(false)
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
            <Button size="sm" onClick={pushToAssistant} disabled={pushing}>
              {pushing ? 'Pushing...' : 'Update Assistant'}
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
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                  >
                    {expandedId === template.id ? 'Hide' : 'View'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setTemplates(templates.filter((t) => t.id !== template.id))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {expandedId === template.id && (
              <CardContent className="space-y-3 pt-0">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-semibold text-gray-600">AI Response:</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(editingId === template.id ? null : template.id)}
                    >
                      {editingId === template.id ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Done
                        </>
                      ) : (
                        <>
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </>
                      )}
                    </Button>
                  </div>
                  {editingId === template.id ? (
                    <Textarea
                      value={template.template}
                      onChange={(e) => {
                        setTemplates(
                          templates.map((t) =>
                            t.id === template.id ? { ...t, template: e.target.value } : t
                          )
                        )
                      }}
                      className="font-mono text-xs"
                      rows={6}
                    />
                  ) : (
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
                  )}
                </div>

                {editingId === template.id ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-semibold text-gray-600">Title:</Label>
                      <input
                        type="text"
                        value={template.title}
                        onChange={(e) => {
                          setTemplates(
                            templates.map((t) => (t.id === template.id ? { ...t, title: e.target.value } : t))
                          )
                        }}
                        className="w-full mt-1 px-2 py-1 border rounded text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-600">Scenario:</Label>
                      <input
                        type="text"
                        value={template.scenario}
                        onChange={(e) => {
                          setTemplates(
                            templates.map((t) => (t.id === template.id ? { ...t, scenario: e.target.value } : t))
                          )
                        }}
                        className="w-full mt-1 px-2 py-1 border rounded text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-600">Description:</Label>
                      <input
                        type="text"
                        value={template.description}
                        onChange={(e) => {
                          setTemplates(
                            templates.map((t) => (t.id === template.id ? { ...t, description: e.target.value } : t))
                          )
                        }}
                        className="w-full mt-1 px-2 py-1 border rounded text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-600">Category:</Label>
                      <select
                        value={template.category}
                        onChange={(e) => {
                          setTemplates(
                            templates.map((t) =>
                              t.id === template.id ? { ...t, category: e.target.value as any } : t
                            )
                          )
                        }}
                        className="w-full mt-1 px-2 py-1 border rounded text-xs"
                      >
                        <option value="simple">Simple</option>
                        <option value="detailed">Detailed</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                    <p className="font-semibold mb-1">When to use:</p>
                    <p>{template.description}</p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="pt-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const newId = `custom-${Date.now()}`
                setTemplates([
                  ...templates,
                  {
                    id: newId,
                    scenario: 'Custom pricing scenario',
                    title: 'Custom Response',
                    description: 'When customer asks about...',
                    template: `"[Your custom response here] Use variables: $[TRIP_FEE], [EMERGENCY_MULTIPLIER]x for emergencies"`,
                    category: 'simple',
                  },
                ])
                setExpandedId(newId)
                setEditingId(newId)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Template
            </Button>
          </CardContent>
        </Card>
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
