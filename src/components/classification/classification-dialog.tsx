'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import LoadingSpinner from '@/components/ui/loading-spinner'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline'

interface Product {
  id: string
  title: string
  description?: string | null
  asin?: string | null
}

interface ClassificationResult {
  success: boolean
  productId: string
  hsCode?: string
  hs6?: string
  hs8?: string
  confidenceScore?: number
  source?: string
  rulingReference?: string
  classificationId?: string
  addedToReviewQueue?: boolean
  reviewQueueId?: string
  error?: string
}

interface ClassificationDialogProps {
  isOpen: boolean
  onClose: () => void
  products: Product[]
  onClassificationComplete?: (results: ClassificationResult[]) => void
}

export default function ClassificationDialog({
  isOpen,
  onClose,
  products,
  onClassificationComplete,
}: ClassificationDialogProps) {
  const [isClassifying, setIsClassifying] = useState(false)
  const [results, setResults] = useState<ClassificationResult[]>([])
  const [currentStep, setCurrentStep] = useState<'confirm' | 'processing' | 'results'>('confirm')
  const [processedCount, setProcessedCount] = useState(0)

  const handleClassify = async () => {
    setIsClassifying(true)
    setCurrentStep('processing')
    setResults([])
    setProcessedCount(0)

    try {
      if (products.length === 1) {
        // Single product classification
        const product = products[0]
        const response = await fetch('/api/core/classify-hs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: product.id,
            productName: product.title,
            productDescription: product.description,
          }),
        })

        const result = await response.json()
        setResults([result])
        setProcessedCount(1)
      } else {
        // Batch classification
        const requests = products.map(product => ({
          productId: product.id,
          productName: product.title,
          productDescription: product.description,
        }))

        const response = await fetch('/api/core/classify-hs/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests }),
        })

        const batchResult = await response.json()
        setResults(batchResult.results || [])
        setProcessedCount(batchResult.totalProcessed || 0)
      }

      setCurrentStep('results')
      if (onClassificationComplete) {
        onClassificationComplete(results)
      }
    } catch (error) {
      console.error('Classification failed:', error)
      setResults([
        {
          success: false,
          productId: products[0]?.id || '',
          error: 'Classification failed. Please try again.',
        },
      ])
      setCurrentStep('results')
    } finally {
      setIsClassifying(false)
    }
  }

  const handleClose = () => {
    setCurrentStep('confirm')
    setResults([])
    setProcessedCount(0)
    onClose()
  }

  const getConfidenceColor = (score?: number) => {
    if (!score) {return 'bg-gray-100 text-gray-800'}
    if (score >= 0.8) {return 'bg-green-100 text-green-800'}
    if (score >= 0.6) {return 'bg-yellow-100 text-yellow-800'}
    return 'bg-red-100 text-red-800'
  }

  const getConfidenceLabel = (score?: number) => {
    if (!score) {return 'Unknown'}
    if (score >= 0.8) {return 'High'}
    if (score >= 0.6) {return 'Medium'}
    return 'Low'
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CpuChipIcon className="h-5 w-5" />
            Classify HS Codes
          </DialogTitle>
        </DialogHeader>

        {currentStep === 'confirm' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <CpuChipIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    HS Code Classification
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      This will classify {products.length} product{products.length > 1 ? 's' : ''} using
                      AI-powered classification services. The process may take a few moments.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">
                Products to classify ({products.length}):
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.title}
                      </p>
                      {product.asin && (
                        <p className="text-xs text-gray-500">ASIN: {product.asin}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleClassify} disabled={isClassifying}>
                {isClassifying ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Classifying...
                  </>
                ) : (
                  'Start Classification'
                )}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'processing' && (
          <div className="space-y-6">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Classifying Products
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Processing {products.length} product{products.length > 1 ? 's' : ''}...
              </p>
              {processedCount > 0 && (
                <div className="mt-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(processedCount / products.length) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {processedCount} of {products.length} completed
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 'results' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Classification Results
              </h3>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {results.filter(r => r.success).length} successful
                </Badge>
                <Badge variant="destructive">
                  {results.filter(r => !r.success).length} failed
                </Badge>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3">
              {results.map((result, index) => {
                const product = products.find(p => p.id === result.productId)
                return (
                  <div
                    key={result.productId}
                    className={`p-4 rounded-lg border ${
                      result.success
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          {result.success ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-red-500" />
                          )}
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product?.title || 'Unknown Product'}
                          </p>
                        </div>

                        {result.success ? (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center space-x-4">
                              <div>
                                <span className="text-xs text-gray-500">HS Code:</span>
                                <p className="text-sm font-mono font-medium">
                                  {result.hsCode || result.hs8 || result.hs6 || 'N/A'}
                                </p>
                              </div>
                              {result.confidenceScore && (
                                <div>
                                  <span className="text-xs text-gray-500">Confidence:</span>
                                  <Badge
                                    className={`ml-1 ${getConfidenceColor(
                                      result.confidenceScore
                                    )}`}
                                  >
                                    {getConfidenceLabel(result.confidenceScore)} (
                                    {Math.round(result.confidenceScore * 100)}%)
                                  </Badge>
                                </div>
                              )}
                              {result.source && (
                                <div>
                                  <span className="text-xs text-gray-500">Source:</span>
                                  <Badge variant="outline" className="ml-1">
                                    {result.source}
                                  </Badge>
                                </div>
                              )}
                            </div>

                            {result.addedToReviewQueue && (
                              <div className="flex items-center space-x-1 text-yellow-600">
                                <ClockIcon className="h-4 w-4" />
                                <span className="text-xs">
                                  Added to review queue for manual verification
                                </span>
                              </div>
                            )}

                            {result.rulingReference && (
                              <p className="text-xs text-gray-500">
                                Reference: {result.rulingReference}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2">
                            <div className="flex items-center space-x-1 text-red-600">
                              <ExclamationTriangleIcon className="h-4 w-4" />
                              <span className="text-sm">{result.error}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              {results.some(r => !r.success) && (
                <Button
                  onClick={() => {
                    const failedProducts = products.filter(p =>
                      results.find(r => r.productId === p.id && !r.success)
                    )
                    setCurrentStep('confirm')
                    // You could implement retry logic here
                  }}
                >
                  Retry Failed
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}