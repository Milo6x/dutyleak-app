import ErrorBoundaryTest from '@/components/test/error-test'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Error Boundary Testing - DutyLeak',
  description: 'Test error boundary functionality and error handling',
}

export default function ErrorBoundaryTestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Error Boundary Testing
          </h1>
          <p className="text-gray-600">
            This page demonstrates error boundary functionality and error handling capabilities.
          </p>
        </div>
        
        <ErrorBoundaryTest />
      </div>
    </div>
  )
}