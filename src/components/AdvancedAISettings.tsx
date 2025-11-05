'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { AlertTriangle, Info, Settings } from 'lucide-react'

interface Props {
  projectId: string
  agentId?: string
}

interface AISettings {
  // Conversation Settings
  maxResponseLength?: number
  conversationStyle?: 'professional' | 'friendly' | 'casual'
  useCustomerName?: boolean
  
  // Behavior Settings
  askForCallback?: boolean
  collectEmail?: boolean
  confirmBeforeBooking?: boolean
  repeatBackDetails?: boolean
  
  // Advanced Settings
  temperature?: number
  maxTurns?: number
  silenceTimeout?: number
  interruptionSensitivity?: 'low' | 'medium' | 'high'
  
  // Custom Instructions
  customGreeting?: string
  customClosing?: string
  additionalInstructions?: string
  
  // Feature Toggles
  enableSmallTalk?: boolean
  enableJokes?: boolean
  strictBusinessHours?: boolean
}

export default function AdvancedAISettings({ projectId, agentId }: Props) {
  const [settings, setSettings] = useState<AISettings>({
    maxResponseLength: 150,
    conversationStyle: 'professional',
    useCustomerName: true,
    askForCallback: true,
    collectEmail: false,
    confirmBeforeBooking: true,
    repeatBackDetails: true,
    temperature: 0.7,
    maxTurns: 20,
    silenceTimeout: 3000,
    interruptionSensitivity: 'medium',
    customGreeting: '',
    customClosing: '',
    additionalInstructions: '',
    enableSmallTalk: true,
    enableJokes: false,
    strictBusinessHours: false,
  })
  
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [projectId])

  const loadSettings = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-settings`)
      if (res.ok) {
        const data = await res.json()
        setSettings({ ...settings, ...data.settings })
      }
    } catch (e) {
      console.error('Failed to load AI settings:', e)
    }
  }

  const saveSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/ai-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      
      if (!res.ok) throw new Error('Failed to save settings')
      
      alert('✅ AI settings saved successfully!')
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Conversation Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Conversation Settings
          </CardTitle>
          <CardDescription>
            Control how your AI assistant communicates with customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Conversation Style */}
          <div className="space-y-2">
            <Label>Conversation Style</Label>
            <div className="flex gap-2">
              {(['professional', 'friendly', 'casual'] as const).map((style) => (
                <Button
                  key={style}
                  variant={settings.conversationStyle === style ? 'default' : 'outline'}
                  onClick={() => setSettings({ ...settings, conversationStyle: style })}
                  className="flex-1"
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              {settings.conversationStyle === 'professional' && 'Formal, business-like tone'}
              {settings.conversationStyle === 'friendly' && 'Warm and approachable (recommended)'}
              {settings.conversationStyle === 'casual' && 'Relaxed and conversational'}
            </p>
          </div>

          {/* Custom Greeting */}
          <div className="space-y-2">
            <Label htmlFor="customGreeting">Custom Greeting (Optional)</Label>
            <Textarea
              id="customGreeting"
              placeholder="e.g., Thanks for calling Big Daddy Plumbing! How can I help you today?"
              value={settings.customGreeting}
              onChange={(e) => setSettings({ ...settings, customGreeting: e.target.value })}
              rows={2}
            />
            <p className="text-xs text-gray-500">
              Leave blank to use default greeting based on your business name
            </p>
          </div>

          {/* Custom Closing */}
          <div className="space-y-2">
            <Label htmlFor="customClosing">Custom Closing (Optional)</Label>
            <Textarea
              id="customClosing"
              placeholder="e.g., Thanks for calling! We look forward to serving you."
              value={settings.customClosing}
              onChange={(e) => setSettings({ ...settings, customClosing: e.target.value })}
              rows={2}
            />
            <p className="text-xs text-gray-500">
              Leave blank to use default closing
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Behavior Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Behavior Settings</CardTitle>
          <CardDescription>
            Configure how the AI handles customer interactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Use Customer Name</Label>
              <p className="text-xs text-gray-500">Address customers by name when provided</p>
            </div>
            <Switch
              checked={settings.useCustomerName}
              onCheckedChange={(checked) => setSettings({ ...settings, useCustomerName: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ask for Callback Number</Label>
              <p className="text-xs text-gray-500">Always collect a callback number</p>
            </div>
            <Switch
              checked={settings.askForCallback}
              onCheckedChange={(checked) => setSettings({ ...settings, askForCallback: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Collect Email Address</Label>
              <p className="text-xs text-gray-500">Ask for email for confirmations</p>
            </div>
            <Switch
              checked={settings.collectEmail}
              onCheckedChange={(checked) => setSettings({ ...settings, collectEmail: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Confirm Before Booking</Label>
              <p className="text-xs text-gray-500">Repeat back details before confirming appointment</p>
            </div>
            <Switch
              checked={settings.confirmBeforeBooking}
              onCheckedChange={(checked) => setSettings({ ...settings, confirmBeforeBooking: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Small Talk</Label>
              <p className="text-xs text-gray-500">Allow brief casual conversation</p>
            </div>
            <Switch
              checked={settings.enableSmallTalk}
              onCheckedChange={(checked) => setSettings({ ...settings, enableSmallTalk: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Strict Business Hours</Label>
              <p className="text-xs text-gray-500">Only book during configured business hours</p>
            </div>
            <Switch
              checked={settings.strictBusinessHours}
              onCheckedChange={(checked) => setSettings({ ...settings, strictBusinessHours: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Additional Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Instructions</CardTitle>
          <CardDescription>
            Add custom instructions for specific scenarios or policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="additionalInstructions">Custom Instructions</Label>
            <Textarea
              id="additionalInstructions"
              placeholder="e.g., Always mention our 10% senior discount. Never book same-day for water heater installs. Ask about pets before scheduling."
              value={settings.additionalInstructions}
              onChange={(e) => setSettings({ ...settings, additionalInstructions: e.target.value })}
              rows={4}
            />
            <p className="text-xs text-gray-500">
              Be specific and clear. The AI will follow these instructions during calls.
            </p>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Examples of good instructions:</strong>
                <ul className="list-disc ml-4 mt-1 space-y-1">
                  <li>"Always ask if they're a returning customer"</li>
                  <li>"Mention our warranty on all repairs"</li>
                  <li>"For commercial jobs, collect business name and tax ID"</li>
                  <li>"Never give estimates over the phone, only price ranges"</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Advanced Settings
              </CardTitle>
              <CardDescription>
                Fine-tune AI behavior (for advanced users only)
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Hide' : 'Show'}
            </Button>
          </div>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="space-y-6">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  <strong>Warning:</strong> Changing these settings can affect AI performance. Only adjust if you understand what they do.
                </p>
              </div>
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Response Creativity (Temperature)</Label>
                <Badge variant="outline">{settings.temperature?.toFixed(1)}</Badge>
              </div>
              <Slider
                value={[settings.temperature || 0.7]}
                onValueChange={([value]) => setSettings({ ...settings, temperature: value })}
                min={0.1}
                max={1.0}
                step={0.1}
              />
              <p className="text-xs text-gray-500">
                Lower = More predictable, Higher = More creative (recommended: 0.7)
              </p>
            </div>

            {/* Max Response Length */}
            <div className="space-y-2">
              <Label htmlFor="maxResponseLength">Max Response Length (words)</Label>
              <Input
                id="maxResponseLength"
                type="number"
                min={50}
                max={300}
                value={settings.maxResponseLength}
                onChange={(e) => setSettings({ ...settings, maxResponseLength: parseInt(e.target.value) })}
              />
              <p className="text-xs text-gray-500">
                Recommended: 150 words (keeps responses concise)
              </p>
            </div>

            {/* Silence Timeout */}
            <div className="space-y-2">
              <Label htmlFor="silenceTimeout">Silence Timeout (milliseconds)</Label>
              <Input
                id="silenceTimeout"
                type="number"
                min={1000}
                max={10000}
                step={500}
                value={settings.silenceTimeout}
                onChange={(e) => setSettings({ ...settings, silenceTimeout: parseInt(e.target.value) })}
              />
              <p className="text-xs text-gray-500">
                How long to wait before assuming customer is done speaking (recommended: 3000ms)
              </p>
            </div>

            {/* Interruption Sensitivity */}
            <div className="space-y-2">
              <Label>Interruption Sensitivity</Label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <Button
                    key={level}
                    variant={settings.interruptionSensitivity === level ? 'default' : 'outline'}
                    onClick={() => setSettings({ ...settings, interruptionSensitivity: level })}
                    className="flex-1"
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                How easily the AI can be interrupted (recommended: medium)
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={loadSettings} disabled={loading}>
          Reset
        </Button>
        <Button onClick={saveSettings} disabled={loading}>
          {loading ? 'Saving...' : 'Save AI Settings'}
        </Button>
      </div>
    </div>
  )
}

