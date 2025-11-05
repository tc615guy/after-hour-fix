'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, MapPin } from 'lucide-react'

declare global {
  interface Window {
    google: any
  }
}

interface AddressAutocompleteProps {
  value: string
  onChange: (address: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  className?: string
}

export default function AddressAutocomplete({
  value,
  onChange,
  label = 'Business Address',
  placeholder = '123 Main St, City, State ZIP',
  required = false,
  className = '',
}: AddressAutocompleteProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setError('Google Maps API key not configured')
      setLoading(false)
      return
    }

    // Load Google Places API script
    if (window.google?.maps?.places) {
      initializeAutocomplete()
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
    script.async = true
    script.defer = true

    script.onload = () => {
      if (window.google?.maps?.places) {
        initializeAutocomplete()
      } else {
        setError('Failed to load Google Places API')
        setLoading(false)
      }
    }

    script.onerror = () => {
      setError('Failed to load Google Maps script')
      setLoading(false)
    }

    document.head.appendChild(script)

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners?.(autocompleteRef.current)
      }
    }
  }, [])

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) {
      setLoading(false)
      return
    }

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
        fields: ['formatted_address', 'address_components', 'geometry'],
      })

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (place.formatted_address) {
          onChange(place.formatted_address)
          setError(null)
        }
      })

      autocompleteRef.current = autocomplete
      setLoading(false)
    } catch (err: any) {
      console.error('[AddressAutocomplete] Error initializing:', err)
      setError(err.message || 'Failed to initialize autocomplete')
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <Label htmlFor="address-input" className="flex items-center gap-2">
        {label}
        {required && <span className="text-red-500">*</span>}
        {loading && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
        {!loading && !error && <MapPin className="w-3 h-3 text-green-500" />}
      </Label>
      <div className="relative mt-1">
        <Input
          ref={inputRef}
          id="address-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={error ? 'border-red-300' : ''}
          disabled={loading}
        />
        {error && (
          <p className="text-xs text-red-600 mt-1">
            {error} {value && '(Entering manually is still possible)'}
          </p>
        )}
        {!error && !loading && value && (
          <p className="text-xs text-green-600 mt-1">
            ✓ Address validated by Google Maps
          </p>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Start typing your address and select from suggestions
      </p>
    </div>
  )
}
