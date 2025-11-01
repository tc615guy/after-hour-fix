/** @type {import('next').NextConfig} */
let nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000']
    }
  }
}

// Wrap with Sentry (source maps upload) when available
try {
  const { withSentryConfig } = require('@sentry/nextjs')
  const sentryOptions = {
    // Use env: SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT
    silent: true,
  }
  const sentryBuildOptions = {
    widenClientFileUpload: true,
    hideSourceMaps: false,
    disableLogger: true,
  }
  module.exports = withSentryConfig(nextConfig, sentryOptions, sentryBuildOptions)
} catch (e) {
  module.exports = nextConfig
}
