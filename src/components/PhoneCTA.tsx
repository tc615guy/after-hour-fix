import { Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhoneCTAProps {
  className?: string
  title?: string
  description?: string
}

export function PhoneCTA({
  className,
  title = "Prefer to talk it through?",
  description = "Call our team 24/7 and we'll walk you through setup, pricing, or anything else you need.",
}: PhoneCTAProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-blue-100 bg-blue-50/80 px-6 py-6 shadow-sm',
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-blue-900">{title}</h3>
          <p className="text-sm text-blue-700">{description}</p>
        </div>
        <a
          href="tel:8446075052"
          className="inline-flex items-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-500"
        >
          <Phone className="h-4 w-4" />
          Call 844-607-5052
        </a>
      </div>
    </div>
  )
}

