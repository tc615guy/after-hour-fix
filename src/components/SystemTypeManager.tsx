'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

import { Loader2, Sparkles, Phone, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface SystemTypeManagerProps {
  agentId: string
  projectId: string
  currentSystemType?: string
  onUpdate?: () => void
}

export default function SystemTypeManager({
  agentId,
  projectId,
  currentSystemType = 'vapi',
  onUpdate,
}: SystemTypeManagerProps) {
  const [systemType, setSystemType] = useState(currentSystemType)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadSystemType()
  }, [agentId])

  const loadSystemType = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/agents/${agentId}/system-type`)
      if (res.ok) {
        const data = await res.json()
        setSystemType(data.systemType || 'vapi')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load system type')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (checked: boolean) => {
    const newSystemType = checked ? 'openai-realtime' : 'vapi'
    
    if (!confirm(
      `Are you sure you want to ${checked ? 'migrate to OpenAI Realtime' : 'switch back to Vapi'}?\n\n` +
      `This will update your agent and phone numbers. Phone numbers will be reconfigured automatically.`
    )) {
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const res = await fetch(`/api/agents/${agentId}/system-type`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemType: newSystemType }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update system type')
      }

      setSystemType(newSystemType)
      setSuccess(true)
      
      if (onUpdate) {
        onUpdate()
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update system type')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  const isOpenAIRealtime = systemType === 'openai-realtime'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              AI System Type
            </CardTitle>
            <CardDescription>
              Choose between Vapi or OpenAI Realtime for your AI assistant
            </CardDescription>
          </div>
          <Badge variant={isOpenAIRealtime ? 'default' : 'secondary'} className="text-sm">
            {isOpenAIRealtime ? (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                OpenAI Realtime
              </>
            ) : (
              <>
                <Phone className="w-3 h-3 mr-1" />
                Vapi
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
            <p className="text-sm text-green-800">
              System type updated successfully! Your phone numbers have been reconfigured.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">OpenAI Realtime</span>
              {isOpenAIRealtime && (
                <Badge variant="outline" className="text-xs">Active</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {isOpenAIRealtime
                ? 'Using OpenAI Realtime API for faster, more cost-effective calls'
                : 'Switch to OpenAI Realtime for lower costs and better control'}
            </p>
          </div>
          <Switch
            checked={isOpenAIRealtime}
            onCheckedChange={handleToggle}
            disabled={saving}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-sm">Vapi</span>
            </div>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Fully managed service</li>
              <li>• Easy setup & configuration</li>
              <li>• Built-in features</li>
            </ul>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-sm">OpenAI Realtime</span>
            </div>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Lower costs at scale</li>
              <li>• Direct API control</li>
              <li>• Custom features</li>
            </ul>
          </div>
        </div>

        {isOpenAIRealtime && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> OpenAI Realtime requires the OpenAI Realtime server to be running.
              Make sure your server is deployed and configured correctly.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
