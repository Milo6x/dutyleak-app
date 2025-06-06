'use client'

import { Suspense } from 'react'
import ComprehensiveDashboard from '@/components/analytics/comprehensive-dashboard'

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto p-6">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      }>
        <ComprehensiveDashboard />
      </Suspense>
    </div>
  )
}