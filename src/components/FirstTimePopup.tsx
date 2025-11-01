'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Settings, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface Props {
  projectId: string
  storageKey: string
}

export default function FirstTimePopup({ projectId, storageKey }: Props) {
  const [show, setShow] = useState(false)
  const [showNeverAgain, setShowNeverAgain] = useState(false)

  useEffect(() => {
    // Check if user has dismissed this popup
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

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full shadow-2xl relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            👋 First Time Here?
          </CardTitle>
          <CardDescription>
            Let's make sure everything is set up correctly for your AI receptionist
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium mb-3">
              Before your AI can start booking appointments, make sure you complete these settings:
            </p>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span><strong>Calendar & Scheduling:</strong> Connect Cal.com to enable appointment booking</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span><strong>Pricing & Costs:</strong> Set your trip fee and service rates</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span><strong>Business Hours:</strong> Configure when calls forward vs AI handles</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span><strong>Emergency On-Call:</strong> Add technicians for urgent after-hours requests</span>
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowNeverAgain(true)}
              className="text-sm"
            >
              Don't show this again
            </Button>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleClose}>
                I'll do this later
              </Button>
              <Link href={`/projects/${projectId}/settings`}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Settings className="w-4 h-4 mr-2" />
                  Go to Settings
                </Button>
              </Link>
            </div>
          </div>

          {showNeverAgain && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900 font-medium mb-3">
                Are you sure you want to hide this message permanently?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNeverAgain(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleNeverShowAgain}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Yes, never show again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
