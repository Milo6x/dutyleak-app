'use client'

import React, { useState } from 'react'
import { Bell, Check, CheckCheck, Eye, EyeOff, Filter, MoreVertical, Trash2, X } from 'lucide-react'
import { useReviewNotifications } from '@/hooks/use-review-notifications'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface ReviewNotificationsProps {
  className?: string
  showHeader?: boolean
  maxHeight?: string
  compact?: boolean
}

const notificationTypeLabels = {
  review_assignment: 'Assignment',
  review_completed: 'Completed',
  review_overdue: 'Overdue',
  workload_warning: 'Workload'
}

const priorityColors = {
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  urgent: 'bg-red-100 text-red-800 border-red-200'
}

const typeColors = {
  review_assignment: 'bg-green-100 text-green-800 border-green-200',
  review_completed: 'bg-blue-100 text-blue-800 border-blue-200',
  review_overdue: 'bg-red-100 text-red-800 border-red-200',
  workload_warning: 'bg-yellow-100 text-yellow-800 border-yellow-200'
}

export function ReviewNotifications({
  className,
  showHeader = true,
  maxHeight = '600px',
  compact = false
}: ReviewNotificationsProps) {
  const {
    notifications,
    stats,
    loading,
    error,
    hasMore,
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    refresh,
    filterByType,
    showUnreadOnly
  } = useReviewNotifications()

  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [showUnread, setShowUnread] = useState(false)

  const handleSelectNotification = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    )
  }

  const handleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([])
    } else {
      setSelectedNotifications(notifications.map(n => n.id))
    }
  }

  const handleMarkSelectedAsRead = async () => {
    if (selectedNotifications.length === 0) {return}
    
    const count = await markMultipleAsRead(selectedNotifications)
    if (count > 0) {
      toast.success(`Marked ${count} notifications as read`)
      setSelectedNotifications([])
    }
  }

  const handleMarkAllAsRead = async () => {
    const success = await markAllAsRead()
    if (success) {
      toast.success('All notifications marked as read')
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedNotifications.length === 0) {return}
    
    const promises = selectedNotifications.map(id => deleteNotification(id))
    const results = await Promise.all(promises)
    const successCount = results.filter(Boolean).length
    
    if (successCount > 0) {
      toast.success(`Deleted ${successCount} notifications`)
      setSelectedNotifications([])
    }
  }

  const handleFilterChange = (type: string) => {
    setFilterType(type)
    if (type === 'all') {
      filterByType()
    } else {
      filterByType(type)
    }
  }

  const handleUnreadToggle = () => {
    const newShowUnread = !showUnread
    setShowUnread(newShowUnread)
    if (newShowUnread) {
      showUnreadOnly()
    } else {
      filterByType(filterType === 'all' ? undefined : filterType)
    }
  }

  const handleNotificationClick = async (notification: any) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    
    // Navigate to action URL if available
    if (notification.action_url) {
      window.location.href = notification.action_url
    }
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading notifications</p>
            <Button variant="outline" onClick={refresh} className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle className="text-lg">Review Notifications</CardTitle>
              {stats.unread > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats.unread}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="assignments">Assignments</SelectItem>
                  <SelectItem value="completions">Completions</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="workload">Workload</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant={showUnread ? "default" : "outline"}
                size="sm"
                onClick={handleUnreadToggle}
              >
                {showUnread ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {showUnread ? 'All' : 'Unread'}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSelectAll}>
                    <CheckCheck className="h-4 w-4 mr-2" />
                    {selectedNotifications.length === notifications.length ? 'Deselect All' : 'Select All'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleMarkSelectedAsRead}
                    disabled={selectedNotifications.length === 0}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark Selected as Read
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleMarkAllAsRead}>
                    <CheckCheck className="h-4 w-4 mr-2" />
                    Mark All as Read
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDeleteSelected}
                    disabled={selectedNotifications.length === 0}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={refresh}>
                    <Filter className="h-4 w-4 mr-2" />
                    Refresh
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex gap-4 text-sm text-muted-foreground mt-2">
            <span>Total: {stats.total}</span>
            <span>Unread: {stats.unread}</span>
            <span>Assignments: {stats.reviewNotifications.assignments}</span>
            <span>Overdue: {stats.reviewNotifications.overdue}</span>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="p-0">
        <ScrollArea className="h-full" style={{ maxHeight }}>
          {loading && notifications.length === 0 ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-4 w-4 mt-1" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications found</p>
              {showUnread && (
                <p className="text-sm mt-1">Try showing all notifications</p>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                    !notification.read && "bg-blue-50/50 border-l-4 border-l-blue-500",
                    selectedNotifications.includes(notification.id) && "bg-blue-100"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleSelectNotification(notification.id)
                      }}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={cn(
                              "font-medium text-sm",
                              !notification.read && "font-semibold"
                            )}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="h-2 w-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", typeColors[notification.type])}
                            >
                              {notificationTypeLabels[notification.type]}
                            </Badge>
                            
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", priorityColors[notification.priority])}
                            >
                              {notification.priority}
                            </Badge>
                            
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!notification.read && (
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Mark as Read
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {hasMore && (
                <div className="p-4 text-center">
                  <Button 
                    variant="outline" 
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// Compact notification bell component for header/navbar
export function NotificationBell({ className }: { className?: string }) {
  const { stats } = useReviewNotifications({ autoRefresh: true })
  
  return (
    <div className={cn("relative", className)}>
      <Bell className="h-5 w-5" />
      {stats.unread > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
        >
          {stats.unread > 99 ? '99+' : stats.unread}
        </Badge>
      )}
    </div>
  )
}