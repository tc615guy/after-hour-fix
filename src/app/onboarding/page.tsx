'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-6">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Onboarding</CardTitle>
          <CardDescription>
            This onboarding screen is temporarily simplified for production build stability.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            All core features are available from the Dashboard. We’ll restore the full onboarding UI after we
            sanitize corrupted characters and re-enable the rich flow.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

