const nextConfig = {
  // Configuration options here
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https: wss: https://*.supabase.co wss://*.supabase.co; frame-src 'self' https:; media-src 'self' https: data:; object-src 'none'; base-uri 'self'; form-action 'self';"
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig