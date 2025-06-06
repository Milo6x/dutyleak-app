import { DashboardErrorBoundary } from '@/components/error/error-boundary'
import DashboardLayout from '@/components/layout/dashboard-layout'

export default function DashboardLayoutWrapper({
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