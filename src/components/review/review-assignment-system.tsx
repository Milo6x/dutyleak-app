"use client"

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
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Users, 
  User, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Settings,
  Zap,
  Target,
  TrendingUp,
  BarChart3,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  ArrowRight,
  UserCheck,
  UserX,
  Crown,
  Shield,
  Star,
  Award,
  Activity
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import { toast } from 'sonner'

interface Reviewer {
  id: string
  email: string
  full_name: string
  role: 'junior' | 'senior' | 'expert' | 'specialist'
  expertise_areas: string[]
  current_workload: number
  max_capacity: number
  availability_status: 'available' | 'busy' | 'unavailable'
  performance_metrics: {
    reviews_completed: number
    average_time: number
    accuracy_rate: number
    escalation_rate: number
  }
  created_at: string
  last_active: string
}

interface ReviewItem {
  id: string
  product_id: string
  classification_id: string
  status: 'pending' | 'assigned' | 'in-review' | 'completed'
  priority: 'high' | 'medium' | 'low'
  complexity_score: number
  estimated_time: number
  assigned_to: string | null
  assigned_at: string | null
  due_date: string | null
  category: string
  requires_expertise: string[]
  products: {
    title: string
    asin: string
    category: string
  }
  classifications: {
    hs_code: string
    description: string
    confidence: number
  }
}

interface AssignmentRule {
  id: string
  name: string
  description: string
  enabled: boolean
  priority: number
  conditions: {
    category?: string[]
    complexity_min?: number
    complexity_max?: number
    priority?: string[]
    requires_expertise?: string[]
  }
  assignment_logic: {
    type: 'round_robin' | 'workload_balanced' | 'expertise_match' | 'manual'
    target_reviewers?: string[]
    max_workload_threshold?: number
    expertise_weight?: number
  }
  created_at: string
  updated_at: string
}

interface ReviewAssignmentSystemProps {
  className?: string
}

export function ReviewAssignmentSystem({ className }: ReviewAssignmentSystemProps) {
  const [reviewers, setReviewers] = useState<Reviewer[]>([])
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [assignmentRules, setAssignmentRules] = useState<AssignmentRule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('overview')
  
  // Assignment dialog
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [assignmentType, setAssignmentType] = useState<'auto' | 'manual'>('auto')
  const [selectedReviewer, setSelectedReviewer] = useState<string>('')
  const [assignmentNotes, setAssignmentNotes] = useState('')
  
  // Rule management
  const [showRuleDialog, setShowRuleDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<AssignmentRule | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [reviewerFilter, setReviewerFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchReviewers(),
        fetchReviewItems(),
        fetchAssignmentRules()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load assignment system data')
    } finally {
      setLoading(false)
    }
  }

  const fetchReviewers = async () => {
    // Mock data for now - replace with actual API call
    const mockReviewers: Reviewer[] = [
      {
        id: 'rev_001',
        email: 'sarah.chen@company.com',
        full_name: 'Sarah Chen',
        role: 'senior',
        expertise_areas: ['electronics', 'automotive', 'machinery'],
        current_workload: 12,
        max_capacity: 20,
        availability_status: 'available',
        performance_metrics: {
          reviews_completed: 234,
          average_time: 3.2,
          accuracy_rate: 0.94,
          escalation_rate: 0.08
        },
        created_at: '2024-01-15T00:00:00Z',
        last_active: new Date().toISOString()
      },
      {
        id: 'rev_002',
        email: 'mike.johnson@company.com',
        full_name: 'Mike Johnson',
        role: 'expert',
        expertise_areas: ['textiles', 'chemicals', 'pharmaceuticals'],
        current_workload: 8,
        max_capacity: 15,
        availability_status: 'available',
        performance_metrics: {
          reviews_completed: 198,
          average_time: 4.1,
          accuracy_rate: 0.97,
          escalation_rate: 0.03
        },
        created_at: '2024-01-10T00:00:00Z',
        last_active: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'rev_003',
        email: 'emily.rodriguez@company.com',
        full_name: 'Emily Rodriguez',
        role: 'junior',
        expertise_areas: ['food', 'beverages', 'consumer_goods'],
        current_workload: 15,
        max_capacity: 25,
        availability_status: 'busy',
        performance_metrics: {
          reviews_completed: 156,
          average_time: 5.8,
          accuracy_rate: 0.89,
          escalation_rate: 0.15
        },
        created_at: '2024-02-01T00:00:00Z',
        last_active: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      }
    ]
    setReviewers(mockReviewers)
  }

  const fetchReviewItems = async () => {
    // Mock data for now - replace with actual API call
    const mockItems: ReviewItem[] = [
      {
        id: 'item_001',
        product_id: 'prod_001',
        classification_id: 'class_001',
        status: 'pending',
        priority: 'high',
        complexity_score: 8.5,
        estimated_time: 45,
        assigned_to: null,
        assigned_at: null,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        category: 'electronics',
        requires_expertise: ['electronics', 'compliance'],
        products: {
          title: 'Wireless Bluetooth Headphones',
          asin: 'B08XYZ123',
          category: 'Electronics'
        },
        classifications: {
          hs_code: '8518.30.20',
          description: 'Headphones and earphones',
          confidence: 0.75
        }
      },
      {
        id: 'item_002',
        product_id: 'prod_002',
        classification_id: 'class_002',
        status: 'assigned',
        priority: 'medium',
        complexity_score: 6.2,
        estimated_time: 30,
        assigned_to: 'rev_001',
        assigned_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        category: 'automotive',
        requires_expertise: ['automotive'],
        products: {
          title: 'Car Engine Oil Filter',
          asin: 'B09ABC456',
          category: 'Automotive'
        },
        classifications: {
          hs_code: '8421.23.00',
          description: 'Oil filters for internal combustion engines',
          confidence: 0.88
        }
      }
    ]
    setReviewItems(mockItems)
  }

  const fetchAssignmentRules = async () => {
    // Mock data for now - replace with actual API call
    const mockRules: AssignmentRule[] = [
      {
        id: 'rule_001',
        name: 'High Priority Auto-Assignment',
        description: 'Automatically assign high priority items to available senior reviewers',
        enabled: true,
        priority: 1,
        conditions: {
          priority: ['high'],
          complexity_max: 7
        },
        assignment_logic: {
          type: 'workload_balanced',
          max_workload_threshold: 15,
          expertise_weight: 0.7
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      },
      {
        id: 'rule_002',
        name: 'Expert Review Required',
        description: 'Route complex items requiring specialized expertise to expert reviewers',
        enabled: true,
        priority: 2,
        conditions: {
          complexity_min: 8,
          requires_expertise: ['pharmaceuticals', 'chemicals']
        },
        assignment_logic: {
          type: 'expertise_match',
          expertise_weight: 0.9
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-10T00:00:00Z'
      }
    ]
    setAssignmentRules(mockRules)
  }

  const handleAutoAssignment = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select items to assign')
      return
    }

    try {
      // Implement auto-assignment logic
      const assignments = await calculateOptimalAssignments(selectedItems)
      
      for (const assignment of assignments) {
        await assignItemToReviewer(assignment.itemId, assignment.reviewerId, 'Auto-assigned based on workload and expertise')
      }
      
      toast.success(`Successfully assigned ${assignments.length} items`)
      setSelectedItems([])
      setShowAssignmentDialog(false)
      await fetchReviewItems()
    } catch (error) {
      console.error('Error in auto-assignment:', error)
      toast.error('Failed to auto-assign items')
    }
  }

  const handleManualAssignment = async () => {
    if (selectedItems.length === 0 || !selectedReviewer) {
      toast.error('Please select items and a reviewer')
      return
    }

    try {
      for (const itemId of selectedItems) {
        await assignItemToReviewer(itemId, selectedReviewer, assignmentNotes || 'Manually assigned')
      }
      
      toast.success(`Successfully assigned ${selectedItems.length} items to reviewer`)
      setSelectedItems([])
      setSelectedReviewer('')
      setAssignmentNotes('')
      setShowAssignmentDialog(false)
      await fetchReviewItems()
    } catch (error) {
      console.error('Error in manual assignment:', error)
      toast.error('Failed to assign items')
    }
  }

  const assignItemToReviewer = async (itemId: string, reviewerId: string, notes: string) => {
    // Mock implementation - replace with actual API call
    console.log('Assigning item:', { itemId, reviewerId, notes })
    
    // Update local state for demo
    setReviewItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            status: 'assigned' as const,
            assigned_to: reviewerId,
            assigned_at: new Date().toISOString()
          }
        : item
    ))
    
    // Update reviewer workload
    setReviewers(prev => prev.map(reviewer => 
      reviewer.id === reviewerId
        ? { ...reviewer, current_workload: reviewer.current_workload + 1 }
        : reviewer
    ))
  }

  const calculateOptimalAssignments = async (itemIds: string[]) => {
    // Implement intelligent assignment algorithm
    const assignments = []
    
    for (const itemId of itemIds) {
      const item = reviewItems.find(i => i.id === itemId)
      if (!item) {continue}
      
      // Find best reviewer based on:
      // 1. Expertise match
      // 2. Current workload
      // 3. Availability
      // 4. Performance metrics
      
      const availableReviewers = reviewers.filter(r => 
        r.availability_status === 'available' && 
        r.current_workload < r.max_capacity
      )
      
      let bestReviewer = null
      let bestScore = 0
      
      for (const reviewer of availableReviewers) {
        let score = 0
        
        // Expertise match (40% weight)
        const expertiseMatch = item.requires_expertise.some(exp => 
          reviewer.expertise_areas.includes(exp)
        )
        if (expertiseMatch) {score += 40}
        
        // Workload balance (30% weight)
        const workloadRatio = reviewer.current_workload / reviewer.max_capacity
        score += (1 - workloadRatio) * 30
        
        // Performance metrics (30% weight)
        score += reviewer.performance_metrics.accuracy_rate * 15
        score += (1 - reviewer.performance_metrics.escalation_rate) * 15
        
        if (score > bestScore) {
          bestScore = score
          bestReviewer = reviewer
        }
      }
      
      if (bestReviewer) {
        assignments.push({
          itemId,
          reviewerId: bestReviewer.id,
          score: bestScore
        })
      }
    }
    
    return assignments
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'assigned': return 'bg-blue-100 text-blue-800'
      case 'in-review': return 'bg-purple-100 text-purple-800'
      case 'completed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'expert': return <Crown className="h-4 w-4" />
      case 'senior': return <Shield className="h-4 w-4" />
      case 'specialist': return <Star className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const filteredItems = reviewItems.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) {return false}
    if (priorityFilter !== 'all' && item.priority !== priorityFilter) {return false}
    if (reviewerFilter !== 'all' && item.assigned_to !== reviewerFilter) {return false}
    if (searchQuery && !item.products.title.toLowerCase().includes(searchQuery.toLowerCase())) {return false}
    return true
  })

  const stats = {
    totalItems: reviewItems.length,
    pendingItems: reviewItems.filter(i => i.status === 'pending').length,
    assignedItems: reviewItems.filter(i => i.status === 'assigned').length,
    inReviewItems: reviewItems.filter(i => i.status === 'in-review').length,
    completedItems: reviewItems.filter(i => i.status === 'completed').length,
    totalReviewers: reviewers.length,
    availableReviewers: reviewers.filter(r => r.availability_status === 'available').length,
    averageWorkload: reviewers.length > 0 ? reviewers.reduce((sum, r) => sum + r.current_workload, 0) / reviewers.length : 0
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Loading assignment system...</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Review Assignment System</h1>
          <p className="text-gray-600">
            Manage reviewer assignments and workload distribution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => setShowAssignmentDialog(true)}
            disabled={selectedItems.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Assign Items ({selectedItems.length})
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Items</p>
                <p className="text-2xl font-bold text-yellow-700">{stats.pendingItems}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Assigned Items</p>
                <p className="text-2xl font-bold text-blue-700">{stats.assignedItems}</p>
              </div>
              <UserCheck className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available Reviewers</p>
                <p className="text-2xl font-bold text-green-700">{stats.availableReviewers}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Workload</p>
                <p className="text-2xl font-bold text-purple-700">{stats.averageWorkload.toFixed(1)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reviewers">Reviewers</TabsTrigger>
          <TabsTrigger value="items">Review Items</TabsTrigger>
          <TabsTrigger value="rules">Assignment Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reviewer Workload */}
            <Card>
              <CardHeader>
                <CardTitle>Reviewer Workload</CardTitle>
                <CardDescription>Current capacity and availability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {reviewers.map((reviewer) => {
                  const workloadPercentage = (reviewer.current_workload / reviewer.max_capacity) * 100
                  return (
                    <div key={reviewer.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(reviewer.role)}
                          <span className="font-medium">{reviewer.full_name}</span>
                          <Badge 
                            variant="outline" 
                            className={reviewer.availability_status === 'available' ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'}
                          >
                            {reviewer.availability_status}
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          {reviewer.current_workload}/{reviewer.max_capacity}
                        </span>
                      </div>
                      <Progress value={workloadPercentage} className="h-2" />
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Assignment Queue */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment Queue</CardTitle>
                <CardDescription>Items waiting for assignment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reviewItems.filter(item => item.status === 'pending').slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.products.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getPriorityColor(item.priority)}>
                            {item.priority}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Complexity: {item.complexity_score}/10
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Assign
                      </Button>
                    </div>
                  ))}
                  {stats.pendingItems === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      No items pending assignment
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reviewers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reviewer Management</CardTitle>
              <CardDescription>Manage reviewer profiles and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reviewers.map((reviewer) => (
                  <div key={reviewer.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getRoleIcon(reviewer.role)}
                          <h3 className="font-semibold">{reviewer.full_name}</h3>
                          <Badge variant="outline">{reviewer.role}</Badge>
                          <Badge 
                            className={reviewer.availability_status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                          >
                            {reviewer.availability_status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{reviewer.email}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <Label className="text-xs text-gray-500">Workload</Label>
                            <p className="font-medium">{reviewer.current_workload}/{reviewer.max_capacity}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Accuracy</Label>
                            <p className="font-medium">{(reviewer.performance_metrics.accuracy_rate * 100).toFixed(1)}%</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Avg Time</Label>
                            <p className="font-medium">{reviewer.performance_metrics.average_time}h</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Reviews</Label>
                            <p className="font-medium">{reviewer.performance_metrics.reviews_completed}</p>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <Label className="text-xs text-gray-500">Expertise Areas</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {reviewer.expertise_areas.map((area) => (
                              <Badge key={area} variant="secondary" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Activity className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in-review">In Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={reviewerFilter} onValueChange={setReviewerFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reviewers</SelectItem>
                    {reviewers.map((reviewer) => (
                      <SelectItem key={reviewer.id} value={reviewer.id}>
                        {reviewer.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Items List */}
          <Card>
            <CardHeader>
              <CardTitle>Review Items</CardTitle>
              <CardDescription>
                {filteredItems.length} items • {selectedItems.length} selected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredItems.map((item) => {
                  const assignedReviewer = reviewers.find(r => r.id === item.assigned_to)
                  return (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedItems(prev => [...prev, item.id])
                            } else {
                              setSelectedItems(prev => prev.filter(id => id !== item.id))
                            }
                          }}
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">{item.products.title}</h3>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(item.status)}>
                                {item.status}
                              </Badge>
                              <Badge className={getPriorityColor(item.priority)}>
                                {item.priority}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                            <div>
                              <Label className="text-xs">ASIN</Label>
                              <p>{item.products.asin}</p>
                            </div>
                            <div>
                              <Label className="text-xs">HS Code</Label>
                              <p>{item.classifications.hs_code}</p>
                            </div>
                            <div>
                              <Label className="text-xs">Complexity</Label>
                              <p>{item.complexity_score}/10</p>
                            </div>
                            <div>
                              <Label className="text-xs">Est. Time</Label>
                              <p>{item.estimated_time}min</p>
                            </div>
                          </div>
                          
                          {assignedReviewer && (
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4" />
                              <span>Assigned to {assignedReviewer.full_name}</span>
                              {item.assigned_at && (
                                <span className="text-gray-500">
                                  • {new Date(item.assigned_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {item.requires_expertise.length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <Label className="text-xs text-gray-500">Requires:</Label>
                              <div className="flex flex-wrap gap-1">
                                {item.requires_expertise.map((exp) => (
                                  <Badge key={exp} variant="outline" className="text-xs">
                                    {exp}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                
                {filteredItems.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No items match the current filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Assignment Rules</CardTitle>
                  <CardDescription>Configure automatic assignment logic</CardDescription>
                </div>
                <Button onClick={() => setShowRuleDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignmentRules.map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{rule.name}</h3>
                          <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Badge variant="outline">Priority {rule.priority}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <Label className="text-xs text-gray-500">Conditions</Label>
                            <div className="space-y-1">
                              {rule.conditions.priority && (
                                <p>Priority: {rule.conditions.priority.join(', ')}</p>
                              )}
                              {rule.conditions.complexity_min && (
                                <p>Min Complexity: {rule.conditions.complexity_min}</p>
                              )}
                              {rule.conditions.complexity_max && (
                                <p>Max Complexity: {rule.conditions.complexity_max}</p>
                              )}
                              {rule.conditions.requires_expertise && (
                                <p>Expertise: {rule.conditions.requires_expertise.join(', ')}</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Assignment Logic</Label>
                            <div className="space-y-1">
                              <p>Type: {rule.assignment_logic.type.replace('_', ' ')}</p>
                              {rule.assignment_logic.max_workload_threshold && (
                                <p>Max Workload: {rule.assignment_logic.max_workload_threshold}</p>
                              )}
                              {rule.assignment_logic.expertise_weight && (
                                <p>Expertise Weight: {rule.assignment_logic.expertise_weight}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          setEditingRule(rule)
                          setShowRuleDialog(true)
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assignment Dialog */}
      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Review Items</DialogTitle>
            <DialogDescription>
              Assign {selectedItems.length} selected items to reviewers
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label>Assignment Type:</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="auto"
                    name="assignmentType"
                    checked={assignmentType === 'auto'}
                    onChange={() => setAssignmentType('auto')}
                  />
                  <Label htmlFor="auto">Auto Assignment</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="manual"
                    name="assignmentType"
                    checked={assignmentType === 'manual'}
                    onChange={() => setAssignmentType('manual')}
                  />
                  <Label htmlFor="manual">Manual Assignment</Label>
                </div>
              </div>
            </div>
            
            {assignmentType === 'auto' && (
              <Alert>
                <Zap className="h-4 w-4" />
                <AlertDescription>
                  Items will be automatically assigned based on reviewer expertise, workload, and performance metrics.
                </AlertDescription>
              </Alert>
            )}
            
            {assignmentType === 'manual' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reviewer">Select Reviewer</Label>
                  <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a reviewer" />
                    </SelectTrigger>
                    <SelectContent>
                      {reviewers.filter(r => r.availability_status === 'available').map((reviewer) => (
                        <SelectItem key={reviewer.id} value={reviewer.id}>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(reviewer.role)}
                            <span>{reviewer.full_name}</span>
                            <span className="text-sm text-gray-500">({reviewer.current_workload}/{reviewer.max_capacity})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="notes">Assignment Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add notes for the assignment..."
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            {/* Selected Items Preview */}
            <div>
              <Label>Selected Items ({selectedItems.length})</Label>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2">
                {selectedItems.map((itemId) => {
                  const item = reviewItems.find(i => i.id === itemId)
                  return item ? (
                    <div key={itemId} className="text-sm p-2 bg-gray-50 rounded">
                      <p className="font-medium">{item.products.title}</p>
                      <p className="text-gray-500">{item.products.asin} • {item.priority} priority</p>
                    </div>
                  ) : null
                })}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={assignmentType === 'auto' ? handleAutoAssignment : handleManualAssignment}
              disabled={assignmentType === 'manual' && !selectedReviewer}
            >
              {assignmentType === 'auto' ? (
                <><Zap className="h-4 w-4 mr-2" />Auto Assign</>
              ) : (
                <><UserCheck className="h-4 w-4 mr-2" />Manual Assign</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}