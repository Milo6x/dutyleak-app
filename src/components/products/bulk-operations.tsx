'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/lib/external/sonner-mock'
import { Trash2, Tag, FileText, Play, Pause, Square } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import { useBatchProcessor } from '@/hooks/use-batch-processor'
import BatchProcessingDashboard from '@/components/batch/batch-processing-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface BulkOperationsProps {
  selectedProducts: string[]
  onOperationComplete: () => void
  onClearSelection: () => void
}

interface BulkProgress {
  total: number
  completed: number
  failed: number
  currentItem?: string
}

const CATEGORIES = [
  'Electronics',
  'Clothing & Accessories',
  'Home & Garden',
  'Sports & Outdoors',
  'Books & Media',
  'Health & Beauty',
  'Toys & Games',
  'Automotive',
  'Industrial & Scientific',
  'Food & Beverages',
  'Other'
]

export default function BulkOperations({ selectedProducts, onOperationComplete, onClearSelection }: BulkOperationsProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<BulkProgress | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showBatchDashboard, setShowBatchDashboard] = useState(false)
  const supabase = createBrowserClient()
  const { createJob, isLoading: batchLoading } = useBatchProcessor()

  const handleBulkDelete = async () => {
    const confirmed = confirm(
      `Are you sure you want to delete ${selectedProducts.length} products? This action cannot be undone.`
    )
    
    if (!confirmed) {return}

    try {
      setIsProcessing(true)
      setProgress({ total: selectedProducts.length, completed: 0, failed: 0 })

      let completed = 0
      let failed = 0

      // Process in batches of 10
      const batchSize = 10
      for (let i = 0; i < selectedProducts.length; i += batchSize) {
        const batch = selectedProducts.slice(i, i + batchSize)
        
        try {
          const { error } = await supabase
            .from('products')
            .delete()
            .in('id', batch)

          if (error) {throw error}
          completed += batch.length
        } catch (err) {
          console.error('Batch delete error:', err)
          failed += batch.length
        }

        setProgress({ total: selectedProducts.length, completed, failed })
      }

      if (failed === 0) {
        toast.success(`Successfully deleted ${completed} products`)
      } else {
        toast.error(`Deleted ${completed} products, ${failed} failed`)
      }

      onOperationComplete()
      onClearSelection()
    } catch (err) {
      console.error('Bulk delete error:', err)
      toast.error('Failed to delete products')
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }

  const handleBulkClassify = async () => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected')
      return
    }

    try {
      await createJob('classification', selectedProducts, 'medium')
      onClearSelection()
      setShowBatchDashboard(true)
    } catch (error) {
      console.error('Failed to create classification job:', error)
    }
  }

  const handleBulkCategorize = async () => {
    if (!selectedCategory) {
      toast.error('Please select a category')
      return
    }

    try {
      await createJob('data_export', selectedProducts, 'medium', { 
        operation: 'categorize',
        category: selectedCategory 
      })
      onClearSelection()
      setSelectedCategory('')
      setShowBatchDashboard(true)
    } catch (error) {
      console.error('Failed to create categorization job:', error)
    }
  }

  // Mock HS code generator (replace with actual classification logic)
  const generateMockHSCode = (category: string | null): string => {
    const hsCodeMap: { [key: string]: string[] } = {
      'Electronics': ['8517.12.00', '8471.30.01', '8528.72.64'],
      'Clothing & Accessories': ['6109.10.00', '6203.42.40', '6404.11.90'],
      'Home & Garden': ['9403.60.80', '6302.60.00', '8516.60.40'],
      'Sports & Outdoors': ['9506.62.40', '9506.91.00', '6211.43.40'],
      'Books & Media': ['4901.99.00', '8523.49.40', '9504.50.00'],
      'Health & Beauty': ['3304.99.00', '9018.39.00', '3307.49.00'],
      'Toys & Games': ['9503.00.00', '9504.90.90', '9505.90.60'],
      'Automotive': ['8708.99.81', '8512.20.20', '4011.10.10'],
      'Industrial & Scientific': ['8479.89.98', '9027.80.45', '8481.80.90'],
      'Food & Beverages': ['2106.90.99', '2202.99.90', '1905.90.90']
    }

    const codes = hsCodeMap[category || 'Other'] || ['9999.99.99']
    return codes[Math.floor(Math.random() * codes.length)]
  }

  if (selectedProducts.length === 0) {
    return (
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Select products to perform bulk operations.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Bulk Operations</span>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              {selectedProducts.length} selected
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearSelection}
              disabled={isProcessing}
            >
              <Square className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing...</span>
              <span>{progress.completed + progress.failed} / {progress.total}</span>
            </div>
            <Progress value={(progress.completed + progress.failed) / progress.total * 100} />
            {progress.currentItem && (
              <p className="text-xs text-gray-500">Current: {progress.currentItem}</p>
            )}
            {progress.failed > 0 && (
              <p className="text-xs text-red-600">{progress.failed} failed</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bulk Classify */}
          <div className="space-y-2">
            <Button
              onClick={handleBulkClassify}
              disabled={isProcessing || batchLoading}
              className="w-full"
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              Classify Products
            </Button>
            <p className="text-xs text-gray-500">
              Generate HS codes using AI classification
            </p>
          </div>

          {/* Bulk Categorize */}
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleBulkCategorize}
                disabled={isProcessing || !selectedCategory || batchLoading}
                variant="outline"
              >
                <Tag className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Update category for selected products
            </p>
          </div>

          {/* Bulk Delete */}
          <div className="space-y-2">
            <Button
              onClick={handleBulkDelete}
              disabled={isProcessing}
              variant="destructive"
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Products
            </Button>
            <p className="text-xs text-gray-500">
              Permanently delete selected products
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <Button
            onClick={() => setShowBatchDashboard(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Batch Dashboard
          </Button>
        </div>

        {showBatchDashboard && (
          <BatchProcessingDashboard selectedProducts={selectedProducts} />
        )}

        {isProcessing && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Operation in progress. Please do not close this page.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}