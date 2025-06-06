import { Metadata } from 'next'
import { LandedCostCalculator } from '@/components/landed-cost/landed-cost-calculator'

export const metadata: Metadata = {
  title: 'Landed Cost Calculator | DutyLeak',
  description: 'Calculate comprehensive landed costs including duties, taxes, shipping, and FBA fees for your products.',
}

export default function LandedCostPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <LandedCostCalculator />
    </div>
  )
}