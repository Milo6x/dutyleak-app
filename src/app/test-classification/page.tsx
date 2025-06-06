'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import ClassificationDialog from '@/components/classification/classification-dialog'
import { ClassificationHistory } from '@/components/classification/classification-history'
import { Button } from '@/components/ui/button'
import { CpuChipIcon, ClockIcon } from '@heroicons/react/24/outline'

// Mock product data for testing
const mockProducts = [
  {
    id: 'test-product-1',
    title: 'Wireless Bluetooth Headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    asin: 'B08XYZ123',
  },
  {
    id: 'test-product-2',
    title: 'Laptop Computer',
    description: 'Gaming laptop with 16GB RAM and RTX graphics card',
    asin: 'B09ABC456',
  },
]

export default function TestClassificationPage() {
  const [showClassificationDialog, setShowClassificationDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState(mockProducts)

  const handleClassificationComplete = (results: any[]) => {
    // Log results for debugging in development only
    if (process.env.NODE_ENV === 'development') {
      console.log('Classification results:', results)
    }
    setShowClassificationDialog(false)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Classification Testing
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Test the HS Code classification functionality
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Test Classification Features
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Mock Products:
              </h3>
              <div className="space-y-2">
                {mockProducts.map((product) => (
                  <div key={product.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{product.title}</p>
                    <p className="text-sm text-gray-600">{product.description}</p>
                    <p className="text-xs text-gray-500">ASIN: {product.asin}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={() => setShowClassificationDialog(true)}
                className="flex items-center"
              >
                <CpuChipIcon className="h-4 w-4 mr-2" />
                Test Classification Dialog
              </Button>
              
              <Button
                onClick={() => setShowHistoryDialog(true)}
                variant="outline"
                className="flex items-center"
              >
                <ClockIcon className="h-4 w-4 mr-2" />
                Test History Dialog
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Testing Note
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  This page is for testing the classification components. 
                  The actual classification will require valid API keys for Zonos and OpenAI.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Classification Dialog */}
        <ClassificationDialog
          isOpen={showClassificationDialog}
          onClose={() => setShowClassificationDialog(false)}
          products={selectedProducts}
          onClassificationComplete={handleClassificationComplete}
        />

        {/* Classification History Dialog */}
        <ClassificationHistory
          isOpen={showHistoryDialog}
          onClose={() => setShowHistoryDialog(false)}
          productId="test-product-1"
        />
      </div>
    </DashboardLayout>
  )
}