'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Eye,
  Edit,
  MessageSquare,
  Filter,
  Search,
  RefreshCw,
  Download,
  MoreHorizontal,
  User,
  Calendar,
  Tag,
  FileText,
  Zap,
  TrendingUp,
  DollarSign,
  Shield,
  Users,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  History,
  Flag,
  Star,
  ArrowRight,
  ExternalLink
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createBrowserClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { ReviewAssignmentSystem } from './review-assignment-system'
import { AssignmentNotifications } from './assignment-notifications'

interface ReviewWorkflowItem {
  id: string
  product_id: string
  classification_id: string
  status: 'pending' | 'in-review' | 'approved' | 'rejected' | 'needs-info'
  priority: 'high' | 'medium' | 'low'
  confidence_score: number | null
  reason: string
  created_at: string
  reviewed_at: string | null
  reviewer_id: string | null
  reviewer_notes: string | null
  flagging_criteria: {
    confidence_threshold?: boolean
    historical_inconsistency?: boolean
    compliance_risk?: boolean
    duty_rate_impact?: boolean
    complexity_score?: number
  }
  products: {
    title: string | null
    asin: string | null
    category: string | null
    description: string | null
    weight: number | null
    dimensions: any
  }
  classifications: {
    hs6: string | null
    hs8: string | null
    description: string | null
    confidence: number | null
    alternative_codes?: Array<{
      code: string
      confidence: number
      description: string
    }>
  }
  historical_classifications?: Array<{
    hs_code: string
    confidence: number
    created_at: string
  }>
}

interface ReviewAction {
  type: 'approve' | 'reject' | 'modify' | 'request-info' | 'escalate'
  notes: string
  modifications?: {
    hs_code?: string
    confidence?: number
    description?: string
  }
  assignee?: string
}

interface EnhancedReviewWorkflowProps {
  className?: string
  onItemProcessed?: (itemId: string, action: ReviewAction) => void
  showBulkActions?: boolean
  enableInlineEditing?: boolean
}

export function EnhancedReviewWorkflow({ 
  className, 
  onItemProcessed,
  showBulkActions = true,
  enableInlineEditing = true
}: EnhancedReviewWorkflowProps) {
  const [items, setItems] = useState<ReviewWorkflowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set())
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [confidenceFilter, setConfidenceFilter] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Review dialog
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewingItem, setReviewingItem] = useState<ReviewWorkflowItem | null>(null)
  const [reviewAction, setReviewAction] = useState<ReviewAction>({ type: 'approve', notes: '' })
  
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchReviewItems()
  }, [statusFilter, priorityFilter, confidenceFilter])

  const fetchReviewItems = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {return}

      const { data: workspaceUser } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .single()

      if (!workspaceUser) {return}

      let query = supabase
        .from('review_queue')
        .select(`
          *,
          products!inner(
            title, asin, category, description, weight, dimensions
          ),
          classifications!inner(
            hs6, hs8, description, confidence
          )
        `)
        .eq('workspace_id', workspaceUser.workspace_id)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (confidenceFilter > 0) {
        query = query.lte('confidence_score', confidenceFilter / 100)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {throw error}

      // Enhance items with flagging criteria and historical data
      const enhancedItems = await Promise.all(
        (data || []).map(async (item) => {
          // Fetch historical classifications
          const { data: historical } = await supabase
            .from('classifications')
            .select('hs6, hs8, confidence_score, created_at')
            .eq('product_id', item.product_id)
            .neq('id', item.classification_id)
            .order('created_at', { ascending: false })
            .limit(5)

          // Ensure products data is properly structured
          const products = Array.isArray(item.products) ? item.products[0] : item.products
          
          return {
            ...item,
            status: item.status as 'pending' | 'in-review' | 'approved' | 'rejected' | 'needs-info',
            priority: 'medium' as 'high' | 'medium' | 'low',
            reviewer_id: null,
            products: products || {
              title: null,
              asin: null,
              category: null,
              description: null,
              weight: null,
              dimensions: null
            },
            classifications: Array.isArray(item.classifications) ? item.classifications[0] : item.classifications,
            flagging_criteria: JSON.parse(item.reason || '{}'),
            historical_classifications: historical?.map(h => ({
              hs_code: h.hs8 || h.hs6,
              confidence: h.confidence_score,
              created_at: h.created_at
            })) || []
          }
        })
      )

      setItems(enhancedItems)
    } catch (error) {
      console.error('Error fetching review items:', error)
      toast.error('Failed to load review items')
    } finally {
      setLoading(false)
    }
  }

  const handleReviewAction = async (item: ReviewWorkflowItem, action: ReviewAction) => {
    try {
      setProcessingItems(prev => new Set(Array.from(prev).concat([item.id])))

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {throw new Error('Not authenticated')}

      const response = await fetch('/api/review-queue/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          item_id: item.id,
          action: action.type,
          notes: action.notes,
          modifications: action.modifications,
          assignee: action.assignee
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process review')
      }

      toast.success(`Item ${action.type}d successfully`)
      onItemProcessed?.(item.id, action)
      await fetchReviewItems()
      setShowReviewDialog(false)
      setReviewingItem(null)
    } catch (error) {
      console.error('Error processing review:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process review')
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(item.id)
        return newSet
      })
    }
  }

  const handleBulkAction = async (action: 'approve' | 'reject', notes: string = '') => {
    if (selectedItems.size === 0) {return}

    const confirmed = confirm(
      `Are you sure you want to ${action} ${selectedItems.size} item(s)?`
    )
    if (!confirmed) {return}

    try {
      const promises = Array.from(selectedItems).map(itemId => {
        const item = items.find(i => i.id === itemId)
        if (!item) {return Promise.resolve()}
        return handleReviewAction(item, { type: action, notes })
      })
      
      await Promise.all(promises)
      setSelectedItems(new Set())
      toast.success(`Bulk ${action} completed`)
    } catch (error) {
      console.error('Error processing bulk action:', error)
      toast.error('Failed to process bulk action')
    }
  }

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'in-review':
        return <Eye className="h-4 w-4 text-blue-500" />
      case 'needs-info':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getConfidenceColor = (score: number | null) => {
    if (!score) {return 'text-gray-500'}
    if (score >= 0.8) {return 'text-green-600'}
    if (score >= 0.6) {return 'text-yellow-600'}
    return 'text-red-600'
  }

  const filteredItems = items.filter(item => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        item.products.title?.toLowerCase().includes(query) ||
        item.products.asin?.toLowerCase().includes(query) ||
        item.classifications.hs6?.includes(query) ||
        item.classifications.hs8?.includes(query)
      )
    }
    return true
  }).filter(item => {
    if (priorityFilter !== 'all') {
      return item.priority === priorityFilter
    }
    return true
  })

  const pendingCount = filteredItems.filter(item => item.status === 'pending').length
  const inReviewCount = filteredItems.filter(item => item.status === 'in-review').length

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Management System</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pendingCount} pending • {inReviewCount} in review
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <AssignmentNotifications userId="current-user" compact />
          {showBulkActions && selectedItems.size > 0 && (
            <div className="flex space-x-3">
              <Button
                onClick={() => handleBulkAction('approve')}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve ({selectedItems.size})
              </Button>
              <Button
                onClick={() => handleBulkAction('reject')}
                variant="destructive"
                size="sm"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject ({selectedItems.size})
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="queue" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="queue">Review Queue</TabsTrigger>
          <TabsTrigger value="assignments">Assignment System</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="queue" className="space-y-6">

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-review">In Review</SelectItem>
                  <SelectItem value="needs-info">Needs Info</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Max Confidence: {confidenceFilter}%</Label>
              <Input
                type="range"
                min="0"
                max="100"
                step="10"
                value={confidenceFilter}
                onChange={(e) => setConfidenceFilter(parseInt(e.target.value))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products, ASIN, HS codes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Items */}
      <div className="space-y-4">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Main Item Row */}
                <div className="p-4 hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    {showBulkActions && (
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={() => toggleItemSelection(item.id)}
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(item.status)}
                          <span className="text-sm font-medium capitalize">{item.status}</span>
                        </div>
                        
                        <Badge className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                        
                        {item.confidence_score && (
                          <Badge variant="outline" className={getConfidenceColor(item.confidence_score)}>
                            {Math.round(item.confidence_score * 100)}% confidence
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h3 className="font-medium text-gray-900 truncate">
                            {item.products.title || 'Untitled Product'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            ASIN: {item.products.asin || 'N/A'}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            HS Code: {item.classifications.hs8 || item.classifications.hs6 || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {item.classifications.description}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                          {item.flagging_criteria && Object.keys(item.flagging_criteria).length > 0 && (
                            <div className="flex justify-end mt-1">
                              <Flag className="h-4 w-4 text-orange-500" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleItemExpansion(item.id)}
                      >
                        {expandedItems.has(item.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      
                      {item.status === 'pending' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={processingItems.has(item.id)}>
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setReviewingItem(item)
                                setReviewAction({ type: 'approve', notes: '' })
                                setShowReviewDialog(true)
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setReviewingItem(item)
                                setReviewAction({ type: 'reject', notes: '' })
                                setShowReviewDialog(true)
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setReviewingItem(item)
                                setReviewAction({ type: 'modify', notes: '' })
                                setShowReviewDialog(true)
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Modify
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setReviewingItem(item)
                                setReviewAction({ type: 'request-info', notes: '' })
                                setShowReviewDialog(true)
                              }}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Request Info
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setReviewingItem(item)
                                setReviewAction({ type: 'escalate', notes: '' })
                                setShowReviewDialog(true)
                              }}
                            >
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Escalate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Expanded Details */}
                {expandedItems.has(item.id) && (
                  <div className="border-t bg-gray-50 p-4">
                    <Tabs defaultValue="details" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="flagging">Flagging Criteria</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                        <TabsTrigger value="notes">Notes</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="details" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">Product Information</h4>
                            <div className="space-y-2 text-sm">
                              <div><strong>Category:</strong> {item.products.category || 'N/A'}</div>
                              <div><strong>Weight:</strong> {item.products.weight || 'N/A'}</div>
                              <div><strong>Description:</strong> {item.products.description || 'N/A'}</div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">Classification Details</h4>
                            <div className="space-y-2 text-sm">
                              <div><strong>HS6:</strong> {item.classifications.hs6 || 'N/A'}</div>
                              <div><strong>HS8:</strong> {item.classifications.hs8 || 'N/A'}</div>
                              <div><strong>Confidence:</strong> {item.classifications.confidence ? `${Math.round(item.classifications.confidence * 100)}%` : 'N/A'}</div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="flagging" className="mt-4">
                        <div className="space-y-3">
                          <h4 className="font-medium">Flagging Criteria</h4>
                          {Object.entries(item.flagging_criteria || {}).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between p-2 bg-white rounded border">
                              <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                              <Badge variant={value ? "destructive" : "secondary"}>
                                {value ? 'Failed' : 'Passed'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="history" className="mt-4">
                        <div className="space-y-3">
                          <h4 className="font-medium">Historical Classifications</h4>
                          {item.historical_classifications && item.historical_classifications.length > 0 ? (
                            <div className="space-y-2">
                              {item.historical_classifications.map((hist, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                                  <div>
                                    <span className="font-medium">{hist.hs_code}</span>
                                    <span className="text-sm text-gray-500 ml-2">
                                      {new Date(hist.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <Badge variant="outline">
                                    {Math.round(hist.confidence * 100)}%
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No historical classifications found</p>
                          )}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="notes" className="mt-4">
                        <div className="space-y-3">
                          <h4 className="font-medium">Review Notes</h4>
                          {item.reviewer_notes ? (
                            <div className="p-3 bg-white rounded border">
                              <p className="text-sm">{item.reviewer_notes}</p>
                              {item.reviewed_at && (
                                <p className="text-xs text-gray-500 mt-2">
                                  Reviewed on {new Date(item.reviewed_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No review notes available</p>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No items in review queue
              </h3>
              <p className="text-gray-500">
                {statusFilter === 'pending'
                  ? 'All classifications have been reviewed.'
                  : 'No items match the current filters.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {reviewAction.type === 'approve' && 'Approve Classification'}
              {reviewAction.type === 'reject' && 'Reject Classification'}
              {reviewAction.type === 'modify' && 'Modify Classification'}
              {reviewAction.type === 'request-info' && 'Request Additional Information'}
              {reviewAction.type === 'escalate' && 'Escalate for Review'}
            </DialogTitle>
            <DialogDescription>
              {reviewingItem && (
                <span>
                  {reviewingItem.products.title} (ASIN: {reviewingItem.products.asin})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {reviewAction.type === 'modify' && (
              <div className="space-y-4">
                <div>
                  <Label>HS Code</Label>
                  <Input
                    value={reviewAction.modifications?.hs_code || reviewingItem?.classifications.hs8 || ''}
                    onChange={(e) => setReviewAction({
                      ...reviewAction,
                      modifications: {
                        ...reviewAction.modifications,
                        hs_code: e.target.value
                      }
                    })}
                    placeholder="Enter HS code"
                  />
                </div>
                
                <div>
                  <Label>Description</Label>
                  <Input
                    value={reviewAction.modifications?.description || reviewingItem?.classifications.description || ''}
                    onChange={(e) => setReviewAction({
                      ...reviewAction,
                      modifications: {
                        ...reviewAction.modifications,
                        description: e.target.value
                      }
                    })}
                    placeholder="Enter description"
                  />
                </div>
                
                <div>
                  <Label>Confidence (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={reviewAction.modifications?.confidence ? Math.round(reviewAction.modifications.confidence * 100) : ''}
                    onChange={(e) => setReviewAction({
                      ...reviewAction,
                      modifications: {
                        ...reviewAction.modifications,
                        confidence: parseInt(e.target.value) / 100
                      }
                    })}
                    placeholder="Enter confidence level"
                  />
                </div>
              </div>
            )}
            
            {reviewAction.type === 'escalate' && (
              <div>
                <Label>Assign to</Label>
                <Select
                  value={reviewAction.assignee || ''}
                  onValueChange={(value) => setReviewAction({ ...reviewAction, assignee: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="senior-reviewer">Senior Reviewer</SelectItem>
                    <SelectItem value="compliance-team">Compliance Team</SelectItem>
                    <SelectItem value="trade-specialist">Trade Specialist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label>Notes</Label>
              <Textarea
                value={reviewAction.notes}
                onChange={(e) => setReviewAction({ ...reviewAction, notes: e.target.value })}
                placeholder="Add review notes..."
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => reviewingItem && handleReviewAction(reviewingItem, reviewAction)}
              disabled={!reviewAction.notes.trim()}
            >
              {reviewAction.type === 'approve' && 'Approve'}
              {reviewAction.type === 'reject' && 'Reject'}
              {reviewAction.type === 'modify' && 'Save Changes'}
              {reviewAction.type === 'request-info' && 'Request Info'}
              {reviewAction.type === 'escalate' && 'Escalate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>
        
        <TabsContent value="assignments">
          <ReviewAssignmentSystem />
        </TabsContent>
        
        <TabsContent value="notifications">
          <AssignmentNotifications userId="current-user" />
        </TabsContent>
      </Tabs>
    </div>
  )
}