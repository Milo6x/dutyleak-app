'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { 
  Eye, 
  Filter, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  MessageSquare, 
  User, 
  Calendar,
  Package,
  TrendingUp,
  DollarSign,
  FileText,
  Settings,
  Download,
  RefreshCw
} from 'lucide-react'
import { EnhancedOverrideDialog } from './enhanced-override-dialog'

// Updated interface to match the expected structure
interface ReviewItem {
  id: string
  product_id: string
  classification_id: string
  status: 'pending' | 'approved' | 'rejected' | 'needs-info' | 'in-review' | 'completed'
  confidence_score: number
  created_at: string
  products: {
    title: string
    asin: string
    category: string
    description: string
  }
  classifications: {
    hs6: string
    hs8: string
    description: string
    confidence_score: number
    source: string
  }
  // Optional legacy properties for backward compatibility
  type?: 'classification' | 'optimization' | 'fee-calculation' | 'data-quality'
  priority?: 'high' | 'medium' | 'low'
  title?: string
  description?: string
  submittedBy?: string
  submittedAt?: string
  reviewedBy?: string
  reviewedAt?: string
  productId?: string
  productName?: string
  currentValue?: string
  suggestedValue?: string
  confidence?: number
  impact?: {
    costSavings?: number
    accuracyImprovement?: number
    riskReduction?: number
  }
  comments?: Array<{
    id: string
    author: string
    content: string
    createdAt: string
    type: 'comment' | 'system' | 'approval' | 'rejection'
  }>
  attachments?: Array<{
    id: string
    name: string
    url: string
    type: string
  }>
  relatedItems?: string[]
}

interface ReviewQueueProps {
  className?: string
}

const ITEM_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'classification', label: 'Classification' },
  { value: 'optimization', label: 'Optimization' },
  { value: 'fee-calculation', label: 'Fee Calculation' },
  { value: 'data-quality', label: 'Data Quality' }
]

const STATUS_FILTERS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'in-review', label: 'In Review' },
  { value: 'needs-info', label: 'Needs Info' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' }
]

const PRIORITY_FILTERS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
]

export function ReviewQueue({ className }: ReviewQueueProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [error, setError] = useState<string | null>(null)
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  // Mock data with proper structure
  const mockReviewItems: ReviewItem[] = [
    {
      id: 'review-1',
      product_id: 'prod-123',
      classification_id: 'class-123',
      status: 'pending',
      confidence_score: 0.85,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      products: {
        title: 'Wireless Bluetooth Headphones',
        asin: 'B08XYZ123',
        category: 'Electronics',
        description: 'High-quality wireless headphones with noise cancellation'
      },
      classifications: {
        hs6: '851830',
        hs8: '85183000',
        description: 'Headphones and earphones, whether or not combined with a microphone',
        confidence_score: 0.85,
        source: 'AI Classification Engine'
      },
      type: 'classification',
      priority: 'high',
      title: 'Product Classification Review',
      description: 'AI-suggested HS code classification needs human verification',
      submittedBy: 'AI Classification Engine',
      submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      productId: 'prod-123',
      productName: 'Wireless Bluetooth Headphones',
      currentValue: '8518.30.00',
      suggestedValue: '8518.40.00',
      confidence: 0.85,
      impact: {
        accuracyImprovement: 15,
        riskReduction: 8
      },
      comments: [
        {
          id: 'comment-1',
          author: 'AI Classification Engine',
          content: 'Based on product features and description, this appears to be a wireless audio device with noise cancellation.',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          type: 'comment'
        }
      ]
    }
  ]

  const [reviewItems] = useState<ReviewItem[]>(mockReviewItems)

  // Filter items based on current filters
  const filteredItems = useMemo(() => {
    return reviewItems.filter(item => {
      const typeMatch = typeFilter === 'all' || item.type === typeFilter
      const statusMatch = statusFilter === 'all' || item.status === statusFilter
      const priorityMatch = priorityFilter === 'all' || item.priority === priorityFilter
      return typeMatch && statusMatch && priorityMatch
    })
  }, [reviewItems, typeFilter, statusFilter, priorityFilter])

  // Stats calculations
  const stats = useMemo(() => {
    const total = filteredItems.length
    const pending = filteredItems.filter(item => item.status === 'pending').length
    const inReview = filteredItems.filter(item => item.status === 'in-review').length
    const completed = filteredItems.filter(item => 
      item.status === 'approved' || item.status === 'completed'
    ).length
    
    return { total, pending, inReview, completed }
  }, [filteredItems])

  // Helper functions
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'classification': return <Package className="h-4 w-4" />
      case 'optimization': return <TrendingUp className="h-4 w-4" />
      case 'fee-calculation': return <DollarSign className="h-4 w-4" />
      case 'data-quality': return <FileText className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in-review': return 'bg-blue-100 text-blue-800'
      case 'needs-info': return 'bg-orange-100 text-orange-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Selection handlers
  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(itemId)
    } else {
      newSelected.delete(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handleSelectAll = () => {
    const selectableItems = filteredItems.filter(item => 
      item.type === 'classification' && 
      (item.status === 'pending' || item.status === 'needs-info')
    )
    
    if (selectedItems.size === selectableItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(selectableItems.map(item => item.id)))
    }
  }

  const getSelectedItemsData = () => {
    return filteredItems.filter(item => selectedItems.has(item.id))
  }

  // Action handlers
  const handleBulkApprove = () => {
    console.log('Bulk approving items:', Array.from(selectedItems))
    setSelectedItems(new Set())
  }

  const handleBulkReject = () => {
    console.log('Bulk rejecting items:', Array.from(selectedItems))
    setSelectedItems(new Set())
  }

  const handleItemAction = (itemId: string, action: 'approve' | 'reject' | 'needs-info') => {
    console.log(`${action} item:`, itemId)
  }

  const handleAddComment = async () => {
    if (!selectedItem || !newComment.trim()) {return}
    
    setIsSubmittingComment(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update the selected item with new comment
      const updatedItem = {
        ...selectedItem,
        comments: [
          ...selectedItem.comments || [],
          {
            id: `comment-${Date.now()}`,
            author: 'current-user@company.com',
            content: newComment,
            createdAt: new Date().toISOString(),
            type: 'comment' as const
          }
        ]
      }
      
      setSelectedItem(updatedItem)
      setNewComment('')
    } catch (error) {
      setError('Failed to add comment')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Review Queue</h2>
          <p className="text-muted-foreground">
            Review and approve AI-generated classifications and optimizations
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedItems.size > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkApprove}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve ({selectedItems.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkReject}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Reject ({selectedItems.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOverrideDialog(true)}
              >
                Override ({selectedItems.size})
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Review Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
              <div className="text-sm text-yellow-600">Pending</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{stats.inReview}</div>
              <div className="text-sm text-blue-600">In Review</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{stats.completed}</div>
              <div className="text-sm text-green-600">Completed</div>
            </div>
          </div>

          <Tabs defaultValue="queue" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="queue">Review Queue</TabsTrigger>
              <TabsTrigger value="details">Item Details</TabsTrigger>
            </TabsList>

            <TabsContent value="queue" className="space-y-6">
              {/* Filters */}
              {showFilters && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ITEM_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_FILTERS.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_FILTERS.map(priority => (
                          <SelectItem key={priority.value} value={priority.value}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Bulk Selection Header */}
              {filteredItems.some(item => 
                item.type === 'classification' && 
                (item.status === 'pending' || item.status === 'needs-info')
              ) && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Checkbox
                    checked={selectedItems.size > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    Select All Classification Items
                  </span>
                  {selectedItems.size > 0 && (
                    <Badge variant="secondary">
                      {selectedItems.size} selected
                    </Badge>
                  )}
                </div>
              )}

              {/* Items List */}
              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No items match your current filters</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredItems.map((item) => {
                    const canBeSelected = item.type === 'classification' && 
                      (item.status === 'pending' || item.status === 'needs-info')
                    const isSelected = selectedItems.has(item.id)

                    return (
                      <Card 
                        key={item.id} 
                        className={`cursor-pointer transition-colors ${
                          selectedItem?.id === item.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setSelectedItem(item)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center gap-2">
                              {canBeSelected && (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => 
                                    handleSelectItem(item.id, checked as boolean)
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                />
                              )}
                              {getTypeIcon(item.type || 'classification')}
                              <AlertTriangle className={`h-4 w-4 ${getPriorityColor(item.priority || 'medium')}`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold">{item.title || item.products.title}</h4>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {item.description || item.products.description}
                                  </p>
                                  {item.productName && (
                                    <p className="text-sm text-blue-600 mt-1">
                                      Product: {item.productName}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {canBeSelected && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleItemAction(item.id, 'approve')
                                  }}
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                >
                                  Approve
                                </Button>
                              )}
                              <Badge className={getStatusColor(item.status)}>
                                {item.status.replace('-', ' ')}
                              </Badge>
                              <Badge variant="outline">
                                {item.priority || 'medium'}
                              </Badge>
                              {item.confidence && (
                                <Badge variant="secondary">
                                  {Math.round(item.confidence * 100)}% confidence
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Current vs Suggested Values */}
                          {item.currentValue && item.suggestedValue && (
                            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg text-sm">
                              <div className="flex-1">
                                <span className="text-muted-foreground">Current:</span>
                                <span className="ml-2 font-mono">{item.currentValue}</span>
                              </div>
                              <div className="flex-1">
                                <span className="text-muted-foreground">Suggested:</span>
                                <span className="ml-2 font-mono text-blue-600">{item.suggestedValue}</span>
                              </div>
                            </div>
                          )}

                          {/* Impact Metrics */}
                          {item.impact && (
                            <div className="flex items-center gap-4 text-sm">
                              {item.impact.costSavings && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3 text-green-600" />
                                  <span>{formatCurrency(item.impact.costSavings)} savings</span>
                                </div>
                              )}
                              {item.impact.accuracyImprovement && (
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3 text-blue-600" />
                                  <span>+{item.impact.accuracyImprovement}% accuracy</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{item.submittedBy || 'System'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(item.submittedAt || item.created_at)}</span>
                              </div>
                              {(item.comments?.length || 0) > 0 && (
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  <span>{item.comments?.length} comments</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              {selectedItem ? (
                <div className="space-y-6">
                  {/* Item Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">{selectedItem.title || selectedItem.products.title}</h3>
                      <p className="text-muted-foreground mt-1">{selectedItem.description || selectedItem.products.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(selectedItem.status)}>
                        {selectedItem.status.replace('-', ' ')}
                      </Badge>
                      <Badge variant="outline">
                        {selectedItem.priority || 'medium'} priority
                      </Badge>
                    </div>
                  </div>

                  {/* Product Information */}
                  {selectedItem.productName && (
                    <Card className="p-4">
                      <h4 className="font-medium mb-2">Product Information</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-muted-foreground">Product Name:</span>
                          <div className="font-medium">{selectedItem.productName}</div>
                        </div>
                        {selectedItem.productId && (
                          <div>
                            <span className="text-muted-foreground">Product ID:</span>
                            <div className="font-mono text-sm">{selectedItem.productId}</div>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* Current vs Suggested */}
                  {selectedItem.currentValue && selectedItem.suggestedValue && (
                    <Card className="p-4">
                      <h4 className="font-medium mb-3">Proposed Changes</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-muted-foreground text-sm">Current Value</span>
                          <div className="font-mono text-lg">{selectedItem.currentValue}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-sm">Suggested Value</span>
                          <div className="font-mono text-lg text-blue-600">{selectedItem.suggestedValue}</div>
                        </div>
                      </div>
                      {selectedItem.confidence && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Confidence Score</span>
                            <span>{Math.round(selectedItem.confidence * 100)}%</span>
                          </div>
                          <Progress value={selectedItem.confidence * 100} className="h-2" />
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Impact Analysis */}
                  {selectedItem.impact && (
                    <Card className="p-4">
                      <h4 className="font-medium mb-3">Expected Impact</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {selectedItem.impact.costSavings && (
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-lg font-bold text-green-700">
                              {formatCurrency(selectedItem.impact.costSavings)}
                            </div>
                            <div className="text-sm text-green-600">Cost Savings</div>
                          </div>
                        )}
                        {selectedItem.impact.accuracyImprovement && (
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-lg font-bold text-blue-700">
                              +{selectedItem.impact.accuracyImprovement}%
                            </div>
                            <div className="text-sm text-blue-600">Accuracy Improvement</div>
                          </div>
                        )}
                        {selectedItem.impact.riskReduction && (
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-lg font-bold text-purple-700">
                              -{selectedItem.impact.riskReduction}%
                            </div>
                            <div className="text-sm text-purple-600">Risk Reduction</div>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* Comments */}
                  <Card className="p-4">
                    <h4 className="font-medium mb-3">Comments & Discussion</h4>
                    <div className="space-y-4">
                      {(selectedItem.comments || []).map((comment) => (
                        <div key={comment.id} className="border-l-4 border-blue-200 pl-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{comment.author}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                          <Badge variant="outline" className="mt-1">
                            {comment.type.replace('-', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Review Actions */}
                  {selectedItem.status === 'pending' || selectedItem.status === 'in-review' || selectedItem.status === 'needs-info' ? (
                    <Card className="p-4">
                      <h4 className="font-medium mb-3">Review Actions</h4>
                      <div className="flex items-center gap-3">
                        <Button 
                          onClick={() => handleItemAction(selectedItem.id, 'approve')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleItemAction(selectedItem.id, 'reject')}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Reject
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleItemAction(selectedItem.id, 'needs-info')}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Request Info
                        </Button>
                      </div>
                      
                      {/* Add Comment Section */}
                      <div className="mt-4 space-y-3">
                        <Textarea
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <Button 
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || isSubmittingComment}
                          size="sm"
                        >
                          {isSubmittingComment ? 'Adding...' : 'Add Comment'}
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-4">
                      <div className="text-center py-4 text-muted-foreground">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                        <p>This item has been {selectedItem.status}.</p>
                        {selectedItem.reviewedBy && selectedItem.reviewedAt && (
                          <p className="text-sm mt-1">
                            Reviewed by {selectedItem.reviewedBy} on {formatDate(selectedItem.reviewedAt)}
                          </p>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select an item from the queue to view details</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        
        {/* Enhanced Override Dialog */}
        <EnhancedOverrideDialog
          open={showOverrideDialog}
          onOpenChange={setShowOverrideDialog}
          reviewItem={selectedItem}
          selectedItems={getSelectedItemsData()}
          mode={selectedItems.size > 1 ? 'bulk' : 'single'}
          onOverrideComplete={(success, message) => {
            console.log('Override completed:', { success, message })
            setShowOverrideDialog(false)
            setSelectedItems(new Set())
          }}
        />
      </Card>
    </div>
  )
}