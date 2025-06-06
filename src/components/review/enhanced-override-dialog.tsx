'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Search, 
  History, 
  User, 
  Calendar,
  FileText,
  Zap,
  Clock,
  Shield,
  AlertCircle,
  Info
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'

interface ReviewItem {
  id: string
  product_id: string
  classification_id: string
  status: string
  confidence_score: number | null
  created_at: string
  products: {
    title: string | null
    asin: string | null
    category: string | null
    description?: string | null
  }
  classifications: {
    hs6: string | null
    hs8: string | null
    description: string | null
    confidence_score?: number
    source?: string
  }
}

interface ValidationResult {
  isValid: boolean
  warnings: string[]
  errors: string[]
  suggestions: string[]
}

interface OverrideReason {
  category: string
  subcategory: string
  description: string
  requiresApproval: boolean
}

interface EnhancedOverrideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reviewItem: ReviewItem | null
  onOverrideComplete?: (success: boolean, message?: string) => void
  mode?: 'single' | 'bulk'
  selectedItems?: ReviewItem[]
}

const OVERRIDE_REASONS = [
  {
    category: 'Classification Error',
    subcategories: [
      { value: 'incorrect_category', label: 'Incorrect Product Category', requiresApproval: false },
      { value: 'wrong_material', label: 'Wrong Material Classification', requiresApproval: false },
      { value: 'function_mismatch', label: 'Function/Use Mismatch', requiresApproval: true },
      { value: 'technical_specs', label: 'Technical Specifications Error', requiresApproval: true }
    ]
  },
  {
    category: 'Regulatory Compliance',
    subcategories: [
      { value: 'country_specific', label: 'Country-Specific Requirements', requiresApproval: true },
      { value: 'trade_agreement', label: 'Trade Agreement Considerations', requiresApproval: true },
      { value: 'restricted_goods', label: 'Restricted/Controlled Goods', requiresApproval: true },
      { value: 'duty_optimization', label: 'Duty Rate Optimization', requiresApproval: false }
    ]
  },
  {
    category: 'Data Quality',
    subcategories: [
      { value: 'incomplete_description', label: 'Incomplete Product Description', requiresApproval: false },
      { value: 'outdated_info', label: 'Outdated Product Information', requiresApproval: false },
      { value: 'vendor_correction', label: 'Vendor/Supplier Correction', requiresApproval: false },
      { value: 'expert_knowledge', label: 'Expert Domain Knowledge', requiresApproval: true }
    ]
  }
]

const PRODUCT_CATEGORIES = [
  'Electronics', 'Clothing & Accessories', 'Home & Garden', 'Sports & Outdoors',
  'Health & Beauty', 'Automotive', 'Books & Media', 'Toys & Games',
  'Food & Beverages', 'Industrial & Scientific', 'Office Products', 'Other'
]

export function EnhancedOverrideDialog({
  open,
  onOpenChange,
  reviewItem,
  onOverrideComplete,
  mode = 'single',
  selectedItems = []
}: EnhancedOverrideDialogProps) {
  const [newHsCode, setNewHsCode] = useState('')
  const [reasonCategory, setReasonCategory] = useState('')
  const [reasonSubcategory, setReasonSubcategory] = useState('')
  const [justification, setJustification] = useState('')
  const [productCategory, setProductCategory] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [classificationHistory, setClassificationHistory] = useState<any[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [requiresApproval, setRequiresApproval] = useState(false)
  
  const supabase = createBrowserClient()
  const items = mode === 'bulk' ? selectedItems : (reviewItem ? [reviewItem] : [])

  useEffect(() => {
    if (open && reviewItem) {
      // Reset form
      setNewHsCode('')
      setReasonCategory('')
      setReasonSubcategory('')
      setJustification('')
      setProductCategory(reviewItem.products?.category || '')
      setValidation(null)
      setSearchResults([])
      setClassificationHistory([])
      setShowAdvanced(false)
      setRequiresApproval(false)
      
      // Load classification history
      loadClassificationHistory(reviewItem.product_id)
    }
  }, [open, reviewItem])

  useEffect(() => {
    if (newHsCode && newHsCode.length >= 6) {
      validateHsCode(newHsCode)
    } else {
      setValidation(null)
    }
  }, [newHsCode, productCategory])

  useEffect(() => {
    // Check if approval is required based on reason
    const category = OVERRIDE_REASONS.find(r => r.category === reasonCategory)
    const subcategory = category?.subcategories.find(s => s.value === reasonSubcategory)
    setRequiresApproval(subcategory?.requiresApproval || false)
  }, [reasonCategory, reasonSubcategory])

  const loadClassificationHistory = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('classifications')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {throw error}
      setClassificationHistory(data || [])
    } catch (error) {
      console.error('Error loading classification history:', error)
    }
  }

  const validateHsCode = async (hsCode: string) => {
    try {
      const response = await fetch('/api/classification/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          hsCode, 
          productCategory,
          productDescription: reviewItem?.products?.description
        })
      })

      if (response.ok) {
        const result = await response.json()
        setValidation(result)
      }
    } catch (error) {
      console.error('Error validating HS code:', error)
    }
  }

  const searchHsCodes = async (query: string) => {
    if (!query || query.length < 3) {return}
    
    setIsSearching(true)
    try {
      const response = await fetch('/api/classification/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 10 })
      })

      if (response.ok) {
        const results = await response.json()
        setSearchResults(results.codes || [])
      }
    } catch (error) {
      console.error('Error searching HS codes:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubmit = async () => {
    if (!newHsCode || !reasonCategory || !reasonSubcategory || !justification.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      const overrideData = {
        newHsCode,
        justification,
        reasonCategory,
        reasonSubcategory,
        productCategory,
        requiresApproval,
        metadata: {
          originalConfidence: reviewItem?.confidence_score,
          validationResults: validation,
          overrideTimestamp: new Date().toISOString()
        }
      }

      if (mode === 'bulk') {
        // Handle bulk override
        const promises = items.map(item => 
          fetch(`/api/review-queue/${item.id}/override`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(overrideData)
          })
        )

        const results = await Promise.allSettled(promises)
        const successful = results.filter(r => r.status === 'fulfilled').length
        const failed = results.length - successful

        onOverrideComplete?.(failed === 0, 
          failed === 0 
            ? `Successfully overridden ${successful} items`
            : `${successful} successful, ${failed} failed`
        )
      } else {
        // Handle single override
        const response = await fetch(`/api/review-queue/${reviewItem?.id}/override`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(overrideData)
        })

        if (response.ok) {
          onOverrideComplete?.(true, 'Classification overridden successfully')
        } else {
          const error = await response.json()
          onOverrideComplete?.(false, error.error || 'Failed to override classification')
        }
      }

      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting override:', error)
      onOverrideComplete?.(false, 'An error occurred while processing the override')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getValidationIcon = (type: 'error' | 'warning' | 'suggestion') => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'suggestion': return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {mode === 'bulk' ? `Override ${items.length} Classifications` : 'Override Classification'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'bulk' 
              ? `Apply manual override to ${items.length} selected items`
              : 'Manually override the AI classification with expert knowledge'
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="override" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="override">Override Details</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="override" className="space-y-4">
            {/* Current Classification */}
            {mode === 'single' && reviewItem && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Current Classification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">Product</Label>
                      <p className="text-sm font-medium">{reviewItem.products?.title}</p>
                      <p className="text-xs text-gray-500">{reviewItem.products?.asin}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Current HS Code</Label>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {reviewItem.classifications?.hs8 || reviewItem.classifications?.hs6}
                        </code>
                        {reviewItem.confidence_score && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(reviewItem.confidence_score * 100)}% confidence
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {reviewItem.classifications?.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bulk Override Summary */}
            {mode === 'bulk' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Bulk Override Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    You are about to override {items.length} classifications. This action will apply the same HS code and reasoning to all selected items.
                  </p>
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    {items.slice(0, 5).map((item, index) => (
                      <div key={item.id} className="text-xs text-gray-500 py-1">
                        {index + 1}. {item.products?.title} ({item.products?.asin})
                      </div>
                    ))}
                    {items.length > 5 && (
                      <div className="text-xs text-gray-400">...and {items.length - 5} more items</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* New HS Code */}
            <div className="space-y-2">
              <Label htmlFor="new-hs-code">New HS Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="new-hs-code"
                  value={newHsCode}
                  onChange={(e) => setNewHsCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Enter 6-10 digit HS code"
                  maxLength={10}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => searchHsCodes(reviewItem?.products?.title || '')}
                  disabled={isSearching}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <Card className="mt-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Suggested HS Codes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {searchResults.map((result, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => setNewHsCode(result.code)}
                      >
                        <div>
                          <code className="text-sm font-mono">{result.code}</code>
                          <p className="text-xs text-gray-600">{result.description}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {result.confidence}%
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Override Reason */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reason-category">Reason Category *</Label>
                <Select value={reasonCategory} onValueChange={setReasonCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {OVERRIDE_REASONS.map((category) => (
                      <SelectItem key={category.category} value={category.category}>
                        {category.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="reason-subcategory">Specific Reason *</Label>
                <Select 
                  value={reasonSubcategory} 
                  onValueChange={setReasonSubcategory}
                  disabled={!reasonCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select specific reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {OVERRIDE_REASONS
                      .find(r => r.category === reasonCategory)
                      ?.subcategories.map((sub) => (
                        <SelectItem key={sub.value} value={sub.value}>
                          {sub.label}
                          {sub.requiresApproval && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Requires Approval
                            </Badge>
                          )}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Category */}
            <div>
              <Label htmlFor="product-category">Product Category</Label>
              <Select value={productCategory} onValueChange={setProductCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product category" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Justification */}
            <div>
              <Label htmlFor="justification">Detailed Justification *</Label>
              <Textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Provide detailed reasoning for this override..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {justification.length}/500 characters
              </p>
            </div>

            {/* Approval Warning */}
            {requiresApproval && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This override requires approval from a supervisor before taking effect.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            {validation ? (
              <div className="space-y-4">
                {/* Validation Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {validation.isValid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      Validation Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge 
                      variant={validation.isValid ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {validation.isValid ? 'Valid HS Code' : 'Invalid HS Code'}
                    </Badge>
                  </CardContent>
                </Card>

                {/* Validation Messages */}
                {(validation.errors.length > 0 || validation.warnings.length > 0 || validation.suggestions.length > 0) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Validation Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {validation.errors.length > 0 && (
                        <div>
                          <Label className="text-xs font-medium text-red-600">Errors</Label>
                          <div className="space-y-1 mt-1">
                            {validation.errors.map((error, index) => (
                              <div key={index} className="flex items-start gap-2 text-sm">
                                {getValidationIcon('error')}
                                <span className="text-red-700">{error}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {validation.warnings.length > 0 && (
                        <div>
                          <Label className="text-xs font-medium text-yellow-600">Warnings</Label>
                          <div className="space-y-1 mt-1">
                            {validation.warnings.map((warning, index) => (
                              <div key={index} className="flex items-start gap-2 text-sm">
                                {getValidationIcon('warning')}
                                <span className="text-yellow-700">{warning}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {validation.suggestions.length > 0 && (
                        <div>
                          <Label className="text-xs font-medium text-blue-600">Suggestions</Label>
                          <div className="space-y-1 mt-1">
                            {validation.suggestions.map((suggestion, index) => (
                              <div key={index} className="flex items-start gap-2 text-sm">
                                {getValidationIcon('suggestion')}
                                <span className="text-blue-700">{suggestion}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>Enter an HS code to see validation results</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {classificationHistory.length > 0 ? (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Classification History</Label>
                {classificationHistory.map((classification, index) => (
                  <Card key={classification.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {classification.hs8 || classification.hs6}
                            </code>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getStatusColor(classification.source || 'unknown')}`}
                            >
                              {classification.source || 'Unknown'}
                            </Badge>
                            {classification.confidence_score && (
                              <Badge variant="outline" className="text-xs">
                                {Math.round(classification.confidence_score * 100)}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">
                            {classification.description || 'No description available'}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(classification.created_at)}
                            </span>
                            {classification.ruling_reference && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {classification.ruling_reference}
                              </span>
                            )}
                          </div>
                        </div>
                        {index === 0 && (
                          <Badge className="text-xs">Current</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <History className="h-8 w-8 mx-auto mb-2" />
                <p>No classification history available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>Override will be logged and auditable</span>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!newHsCode || !reasonCategory || !reasonSubcategory || !justification.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'bulk' ? 'Processing...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {mode === 'bulk' ? `Override ${items.length} Items` : 'Submit Override'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}