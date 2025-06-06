'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/dashboard-layout'
import {
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import { AlertTriangle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EnhancedReviewWorkflow } from '@/components/review/enhanced-review-workflow'

interface ReviewItem {
  id: string
  product_id: string
  classification_id: string
  status: string
  confidence_score: number | null
  created_at: string
  reviewed_at: string | null
  reviewer_notes: string | null
  products: {
    title: string | null
    asin: string | null
    category: string | null
  }
  classifications: {
    hs6: string | null
    hs8: string | null
    description: string | null
  }
}

interface Filters {
  status: 'all' | 'pending' | 'approved' | 'rejected'
  confidenceThreshold: number
}

export default function ReviewQueuePage() {
  const handleItemProcessed = (itemId: string, action: any) => {
    // Handle any additional logic after item processing
    console.log('Item processed:', itemId, action)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Enhanced Review Workflow */}
        <EnhancedReviewWorkflow 
          onItemProcessed={handleItemProcessed}
          showBulkActions={true}
          enableInlineEditing={true}
          className=""
        />
        
        {/* Legacy Tab for Comparison */}
        <Tabs defaultValue="enhanced" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="enhanced" className="flex items-center gap-2">
              <BoltIcon className="h-4 w-4" />
              Enhanced Workflow
            </TabsTrigger>
            <TabsTrigger value="legacy">Legacy View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="enhanced" className="mt-6">
            <Alert>
              <BoltIcon className="h-4 w-4" />
              <AlertDescription>
                You&apos;re using the enhanced review workflow with improved flagging criteria, 
                inline editing, and better user experience.
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="legacy" className="mt-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Legacy view is deprecated. Please use the enhanced workflow above for better functionality.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}