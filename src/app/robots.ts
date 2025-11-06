import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afterhourfix.com'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/admin/',
          '/auth/',
          '/onboarding/',
          '/projects/',
          '/feedback/',
          '/thank-you/',
          '/demos/',
          '/test-auth/',
          '/help/',
          '/jobs/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

