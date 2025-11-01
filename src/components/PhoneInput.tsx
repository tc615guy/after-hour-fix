'use client'

import { Input } from '@/components/ui/input'
import React from 'react'

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string
  onChange: (value: string) => void
}

function formatDisplay(digitsOnly: string): string {
  const d = digitsOnly.replace(/\D/g, '').slice(0, 10)
  if (d.length <= 3) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 3)})-${d.slice(3)}`
  return `(${d.slice(0, 3)})-${d.slice(3, 6)}-${d.slice(6)}`
}

export default function PhoneInput({ value, onChange, placeholder = '(xxx)-xxx-xxxx', ...rest }: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDisplay(e.target.value)
    onChange(formatted)
  }

  return (
    <Input
      {...rest}
      type="tel"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={`font-mono ${rest.className || ''}`}
    />
  )
}

// Helper to convert display to E.164 (+1XXXXXXXXXX) if needed upstream
export function toE164(displayValue: string): string {
  const digits = displayValue.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return displayValue
}
