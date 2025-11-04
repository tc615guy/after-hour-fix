'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, CheckCircle2, Circle, Calendar, DollarSign, Clock, Users, Phone, Sparkles, Settings, MessageSquare, TrendingUp } from 'lucide-react'

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
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Check if user has dismissed this checklist
    const dismissed = localStorage.getItem(storageKey)
    if (!dismissed) {
      setShow(true)
    }
    
    // Load user's checked tasks
    const saved = localStorage.getItem(`${storageKey}-checked`)
    if (saved) {
      setCheckedTasks(new Set(JSON.parse(saved)))
    }
  }, [storageKey])

  const handleClose = () => {
    setShow(false)
  }

  const handleNeverShowAgain = () => {
    localStorage.setItem(storageKey, 'true')
    setShow(false)
  }

  const handleTaskCheck = (taskId: string) => {
    const newChecked = new Set(checkedTasks)
    if (newChecked.has(taskId)) {
      newChecked.delete(taskId)
    } else {
      newChecked.add(taskId)
    }
    setCheckedTasks(newChecked)
    localStorage.setItem(`${storageKey}-checked`, JSON.stringify(Array.from(newChecked)))
  }

  const tasks = [
    {
      id: 'phone',
      title: 'Get Your Phone Number',
      description: 'Purchase a business number or forward your existing number to your AI assistant',
      completed: Boolean(phoneConfigured),
      icon: Phone,
      tab: 'numbers',
      category: 'Essentials',
      details: ['Purchase a dedicated number through Vapi', 'Or set up call forwarding from your existing number'],
    },
    {
      id: 'hours',
      title: 'Set Business Hours',
      description: 'Configure your business hours and when the AI should answer',
      completed: businessHoursConfigured,
      icon: Clock,
      tab: 'hours',
      category: 'Essentials',
      details: ['Define when your business is open', 'Set when AI should answer vs forward'],
    },
    {
      id: 'pricing',
      title: 'Upload Your Pricing',
      description: 'Add your service pricing sheet so AI can quote customers accurately',
      completed: pricingConfigured,
      icon: DollarSign,
      tab: 'pricing',
      category: 'Essentials',
      details: ['Upload your service pricing CSV', 'Set trip fees and emergency multipliers'],
    },
    {
      id: 'calendar',
      title: 'Connect Cal.com',
      description: 'Link your Cal.com account to enable automated appointment booking',
      completed: calendarConnected,
      icon: Calendar,
      tab: 'scheduling',
      category: 'Recommended',
      details: ['Connect your Cal.com API key', 'Enable automated booking'],
    },
    {
      id: 'oncall',
      title: 'Add On-Call Technicians',
      description: 'Set up emergency dispatch for after-hours urgent requests',
      completed: onCallConfigured,
      icon: Users,
      tab: 'oncall',
      category: 'Optional',
      details: ['Add technician contact info', 'Set priority levels for dispatch'],
    },
    {
      id: 'assistant',
      title: 'Configure AI Assistant',
      description: 'Customize your OpenAI Realtime AI receptionist voice, tone, and behavior',
      completed: true, // Always available
      icon: Sparkles,
      tab: 'assistant',
      category: 'Advanced',
      details: ['Review OpenAI Realtime voice settings', 'Customize greeting message'],
    },
    {
      id: 'templates',
      title: 'Set Response Templates',
      description: 'Create custom responses for pricing questions',
      completed: false,
      icon: MessageSquare,
      tab: 'general',
      category: 'Advanced',
      details: ['Add pricing response templates', 'Customize customer interactions'],
    },
    {
      id: 'knowledge',
      title: 'Upload Knowledge Base',
      description: 'Add FAQs and service info to improve AI accuracy',
      completed: false,
      icon: Settings,
      tab: 'general',
      category: 'Optional',
      details: ['Upload service documentation', 'Add common customer questions'],
    },
  ]

  const completedCount = tasks.filter((t) => t.completed).length
  const totalCount = tasks.length
  const manualCheckedCount = checkedTasks.size
  const allComplete = completedCount === totalCount && manualCheckedCount === totalCount

  if (!show) return null

  // Group tasks by category
  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = []
    }
    acc[task.category].push(task)
    return acc
  }, {} as Record<string, typeof tasks>)

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'Essentials': return 'bg-red-100 text-red-800 border-red-200'
      case 'Recommended': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Advanced': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Optional': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card className="mb-6 border-2 border-blue-300 shadow-lg relative">
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
      >
        <X className="w-5 h-5" />
      </button>

      <CardHeader>
        <div className="flex items-center justify-between pr-8">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              🚀 Complete Setup Checklist
            </CardTitle>
            <CardDescription>
              Follow these steps to fully activate your AI receptionist. Click checkboxes as you complete each task.
            </CardDescription>
          </div>
          <Badge variant={allComplete ? 'default' : 'secondary'} className="text-lg px-4 py-2">
            {completedCount}/{totalCount}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {allComplete ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-3" />
            <p className="text-green-900 font-semibold text-xl mb-2">🎉 All Complete! Your AI is Ready!</p>
            <p className="text-sm text-green-700 mt-1 mb-4">
              Your AI receptionist can now answer calls and book appointments 24/7.
            </p>
            <div className="flex gap-2 justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-green-900 font-medium">Ready to start booking jobs!</span>
            </div>
          </div>
        ) : (
          Object.entries(groupedTasks).map(([category, categoryTasks]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900">{category}</h3>
                <Badge className={getCategoryBadgeColor(category)} variant="outline">
                  {category}
                </Badge>
              </div>
              
              {categoryTasks.map((task) => {
                const Icon = task.icon
                const isChecked = checkedTasks.has(task.id)
                const isAutoComplete = task.completed
                const showAsDone = isAutoComplete || isChecked
                
                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      showAsDone
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => handleTaskCheck(task.id)}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTaskCheck(task.id)
                        }}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {showAsDone ? (
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-400" />
                        )}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-5 h-5 text-gray-600" />
                          <div className={`font-semibold ${showAsDone ? 'text-green-900' : 'text-gray-900'}`}>
                            {task.title}
                          </div>
                          {isAutoComplete && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                              Auto-complete
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          {task.description}
                        </div>
                        
                        {task.details && task.details.length > 0 && (
                          <ul className="text-xs text-gray-500 space-y-1 ml-6 mb-3">
                            {task.details.map((detail, idx) => (
                              <li key={idx} className="list-disc">{detail}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      
                      <Link 
                        href={`/projects/${projectId}/settings?tab=${task.tab}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant={showAsDone ? 'outline' : 'default'} size="sm">
                          {showAsDone ? 'Review' : 'Configure'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
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
