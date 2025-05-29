import type { Metadata } from 'next'
import './globals-enhanced.css'

export const metadata: Metadata = {
  title: 'DutyLeak - Duty Optimization Platform',
  description: 'Optimize your import duties and reduce costs with AI-powered HS code classification',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}