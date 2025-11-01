"use client"

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Agent = {
  name?: string
  basePrompt?: string
  minutesThisPeriod?: number
  updatedAt?: string
  vapiAssistantId: string
}

export default function AssistantConfig({
  activeAgent,
  projectName,
  trade,
  onUpdated,
}: {
  activeAgent: Agent | undefined
  projectName: string
  trade: string
  onUpdated: () => Promise<void> | void
}) {
  // System prompt editing disabled by product policy

  return (
    <>
      {/* Assistant Name */}
      <div>
        <Label className="text-base font-semibold">Assistant Name</Label>
        <Input value={activeAgent?.name || ''} disabled className="mt-2 max-w-md" />
        <p className="text-xs text-gray-500 mt-1">
          {projectName} - {trade.charAt(0).toUpperCase() + trade.slice(1)} Assistant
        </p>
      </div>

      {/* Voice Settings */}
      <div>
        <Label className="text-base font-semibold">Voice</Label>
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Cartesia Sonic 3 - Ariana</p>
              <p className="text-xs text-gray-600">Professional female voice (FREE)</p>
            </div>
            <Badge variant="outline">Active</Badge>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          This voice is optimized for service businesses and provides natural, expressive communication.
        </p>
      </div>

      {/* Model Settings */}
      <div>
        <Label className="text-base font-semibold">AI Model</Label>
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">OpenAI GPT-4o Mini</p>
              <p className="text-xs text-gray-600">Fast, cost-effective responses</p>
            </div>
            <Badge variant="outline">Active</Badge>
          </div>
        </div>
      </div>

      {/* System Prompt removed from UI by policy */}
      <div className="border-t pt-6">
        <Label className="text-base font-semibold">Assistant Behavior</Label>
        <div className="mt-3 p-3 bg-gray-50 rounded border max-w-2xl text-sm text-gray-700">
          The AI assistant’s system prompt is managed automatically based on your settings (pricing, hours, on‑call, and tools).
          If you need adjustments, contact support and we’ll apply safe updates for you.
        </div>
      </div>

      {/* Usage Stats */}
      <div className="border-t pt-6">
        <Label className="text-base font-semibold">Usage Statistics</Label>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Minutes Used This Period</p>
            <p className="text-3xl font-bold mt-1">{activeAgent?.minutesThisPeriod || 0}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Last Updated</p>
            <p className="text-sm font-medium mt-1">{activeAgent?.updatedAt ? new Date(activeAgent.updatedAt).toLocaleString() : ''}</p>
          </div>
        </div>
      </div>

      {/* Advanced Info */}
      <div className="border-t pt-6">
        <Label className="text-base font-semibold">Advanced</Label>
        <div className="mt-3 space-y-2">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
            <span className="text-sm text-gray-600">Assistant ID</span>
            <code className="text-xs bg-white px-2 py-1 rounded border">{activeAgent?.vapiAssistantId}</code>
          </div>
        </div>
      </div>
    </>
  )
}
