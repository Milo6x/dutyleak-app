import { Metadata } from 'next'
import Link from 'next/link'
import { Calculator, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: {
    template: '%s | Landed Cost Calculator | DutyLeak',
    default: 'Landed Cost Calculator | DutyLeak',
  },
  description: 'Calculate comprehensive landed costs for your products with advanced duty and tax calculations.',
}

interface LandedCostLayoutProps {
  children: React.ReactNode
}

export default function LandedCostLayout({ children }: LandedCostLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Calculator className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-semibold">Landed Cost Calculator</h1>
              </div>
            </div>
            
            <nav className="flex items-center gap-2">
              <Link href="/optimization">
                <Button variant="outline" size="sm">
                  Optimization
                </Button>
              </Link>
              <Link href="/classification">
                <Button variant="outline" size="sm">
                  Classification
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>
              Need help? Check out our{' '}
              <Link href="/help/landed-cost" className="text-blue-600 hover:underline">
                landed cost calculation guide
              </Link>
              {' '}or{' '}
              <Link href="/support" className="text-blue-600 hover:underline">
                contact support
              </Link>
              .
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}