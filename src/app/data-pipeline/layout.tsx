'use client'

import DashboardLayout from '@/components/layout/dashboard-layout'
import { DashboardErrorBoundary } from '@/components/error/error-boundary'

export default function DataPipelineLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardErrorBoundary>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </DashboardErrorBoundary>
  )
}