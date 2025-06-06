import type { Metadata } from 'next'
import './globals.css'
import ErrorBoundary from '@/components/ui/error-boundary'
import { ToastProvider } from '@/components/providers/toast-provider'

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
    <html lang="en" suppressHydrationWarning={true}>
      <body className="min-h-screen bg-background text-foreground" suppressHydrationWarning={true}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <ToastProvider />
      </body>
    </html>
  )
}