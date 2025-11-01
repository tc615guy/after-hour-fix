'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  projectId: string
  trade: string
  projectName: string
}

export default function CalendarSettings(_props: Props) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendar Settings</CardTitle>
          <CardDescription>
            This component has been temporarily simplified to unblock production builds. Full advanced calendar
            configuration will return after we sanitize the original file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Connected calendars and event type settings are preserved server-side.</p>
        </CardContent>
      </Card>
    </div>
  )
}

