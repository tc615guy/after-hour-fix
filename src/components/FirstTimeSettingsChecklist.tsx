'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, CheckCircle2, Circle, Calendar, DollarSign, Clock, Users, Phone } from 'lucide-react'

interface Props {
  projectId: string
  storageKey: string
  calendarConnected: boolean
  pricingConfigured: boolean
  businessHoursConfigured: boolean
  onCallConfigured: boolean
  phoneConfigured?: boolean
}

export default function FirstTimeSettingsChecklist({
  projectId,
  storageKey,
  calendarConnected,
  pricingConfigured,
  businessHoursConfigured,
  onCallConfigured,
  phoneConfigured,
}: Props) {
  const [show, setShow] = useState(false)
  const [showNeverAgain, setShowNeverAgain] = useState(false)

  useEffect(() => {
    // Check if user has dismissed this checklist
    const dismissed = localStorage.getItem(storageKey)
    if (!dismissed) {
      setShow(true)
    }
  }, [storageKey])

  const handleClose = () => {
    setShow(false)
  }

  const handleNeverShowAgain = () => {
    localStorage.setItem(storageKey, 'true')
    setShow(false)
  }

  const tasks = [
    {
      id: 'phone',
      title: '1. Get a Phone Number',
      description: 'Purchase a business number or forward your existing number to your AI assistant',
      completed: Boolean(phoneConfigured),
      icon: Phone,
      tab: 'numbers',
    },
    {
      id: 'hours',
      title: '2. Set Business Hours',
      description: 'Configure your business hours and when the AI should answer (required)',
      completed: businessHoursConfigured,
      icon: Clock,
      tab: 'hours',
    },
    {
      id: 'pricing',
      title: '3. Upload Your Pricing',
      description: 'Add your service pricing sheet so AI can quote customers accurately (required)',
      completed: pricingConfigured,
      icon: DollarSign,
      tab: 'pricing',
    },
    {
      id: 'calendar',
      title: '4. Connect Cal.com',
      description: 'Link your Cal.com account to enable automated appointment booking (optional but recommended)',
      completed: calendarConnected,
      icon: Calendar,
      tab: 'scheduling',
    },
    {
      id: 'oncall',
      title: '5. Add On-Call Technicians',
      description: 'Set up emergency dispatch for after-hours urgent requests (optional)',
      completed: onCallConfigured,
      icon: Users,
      tab: 'oncall',
    },
  ]

  const completedCount = tasks.filter((t) => t.completed).length
  const totalCount = tasks.length
  const allComplete = completedCount === totalCount

  if (!show) return null

  return (
    <Card className="mb-6 border-2 border-blue-300 shadow-lg">
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <CardHeader>
        <div className="flex items-center justify-between pr-8">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              🚀 Setup Checklist - Get Live in 5 Steps
            </CardTitle>
            <CardDescription>
              Follow these steps in order to activate your AI receptionist. Tasks auto-complete as you configure them.
            </CardDescription>
          </div>
          <Badge variant={allComplete ? 'default' : 'secondary'} className="text-lg px-4 py-2">
            {completedCount}/{totalCount}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {allComplete ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
            <p className="text-green-900 font-semibold text-lg">All set! Your AI is ready to go!</p>
            <p className="text-sm text-green-700 mt-1">
              Your AI receptionist can now answer calls and book appointments 24/7.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const Icon = task.icon
              return (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    task.completed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {task.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className={`font-semibold ${task.completed ? 'text-green-900' : 'text-gray-900'}`}>
                          {task.title}
                        </div>
                        <div className="text-sm text-gray-600">{task.description}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Button asChild variant={task.completed ? 'outline' : 'default'} size="sm">
                      <Link href={`/projects/${projectId}/settings?tab=${task.tab}`}>
                        {task.completed ? 'Review' : 'Open'}
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={() => setShowNeverAgain(true)}>
            Don't show this again
          </Button>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>

        {showNeverAgain && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-900 font-medium mb-3">
              Are you sure? This checklist helps you track your setup progress.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowNeverAgain(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleNeverShowAgain} className="bg-yellow-600 hover:bg-yellow-700">
                Yes, hide permanently
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
