import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com'),
  title: {
    default: 'AfterHourFix - AI Receptionist for Trades',
    template: '%s',
  },
  description: 'AI receptionist that answers calls 24/7, books jobs, and sends confirmations for plumbing, HVAC, locksmith, and towing services.',
  keywords: ['AI receptionist', '24/7 call answering', 'automatic booking', 'trade professionals'],
  authors: [{ name: 'AfterHourFix' }],
  creator: 'AfterHourFix',
  publisher: 'AfterHourFix',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com',
    siteName: 'AfterHourFix',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AfterHourFix - AI Receptionist for Trades',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@afterhourfix',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={cn(inter.className, 'antialiased')}>{children}</body>
    </html>
  )
}
