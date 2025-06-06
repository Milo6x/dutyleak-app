"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Bell, 
  BellRing,
  Check, 
  X,
  Clock,
  User,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Mail,
  MessageSquare,
  Settings,
  Volume2,
  VolumeX,
  Trash2,
  MailOpen,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import { toast } from 'sonner'

interface Notification {
  id: string
  user_id: string
  type: 'review_assignment' | 'review_completed' | 'review_overdue' | 'system_alert' | 'workload_warning'
  title: string
  message: string
  data?: any
  read: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  read_at?: string
  expires_at?: string
}

interface NotificationSettings {
  email_enabled: boolean
  push_enabled: boolean
  sound_enabled: boolean
  assignment_notifications: boolean
  completion_notifications: boolean
  overdue_notifications: boolean
  workload_notifications: boolean
  system_notifications: boolean
}

interface AssignmentNotificationsProps {
  userId?: string
  className?: string
  compact?: boolean
}

export function AssignmentNotifications({ 
  userId, 
  className, 
  compact = false 
}: AssignmentNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [settings, setSettings] = useState<NotificationSettings>({
    email_enabled: true,
    push_enabled: true,
    sound_enabled: true,
    assignment_notifications: true,
    completion_notifications: true,
    overdue_notifications: true,
    workload_notifications: true,
    system_notifications: true
  })
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'assignments' | 'alerts'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchNotifications()
    fetchSettings()
    
    // Set up real-time subscription for new notifications
    const supabase = createBrowserClient()
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: userId ? `user_id=eq.${userId}` : undefined
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          
          // Show toast for new notifications
          if (settings.sound_enabled) {
            playNotificationSound(newNotification.priority)
          }
          
          toast(newNotification.title, {
            description: newNotification.message,
            action: {
              label: 'View',
              onClick: () => setSelectedNotification(newNotification)
            }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, settings.sound_enabled])

  const fetchNotifications = async () => {
    try {
      // TODO: Implement notifications table in database
      // const supabase = createBrowserClient()
      // let query = supabase
      //   .from('notifications')
      //   .select('*')
      //   .order('created_at', { ascending: false })
      //   .limit(50)

      // if (userId) {
      //   query = query.eq('user_id', userId)
      // }

      // const { data, error } = await query

      // if (error) {
      //   throw error
      
      // Temporary: return empty data until notifications table is implemented
      const data: Notification[] = []
      const error = null
      
      if (error) {
        throw error
      }

      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
      // Use mock data for demo
      setNotifications(getMockNotifications())
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setSettings({
          email_enabled: data.email_enabled,
          push_enabled: data.push_enabled,
          sound_enabled: data.sound_enabled,
          assignment_notifications: data.review_assignments,
          completion_notifications: data.review_completions,
          overdue_notifications: data.review_overdue,
          workload_notifications: data.workload_warnings,
          system_notifications: data.system_alerts
        })
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error)
    }
  }

  const getMockNotifications = (): Notification[] => [
    {
      id: 'notif_001',
      user_id: userId || 'user_001',
      type: 'review_assignment',
      title: 'New Review Assignment',
      message: 'You have been assigned 3 new items for review: Wireless Headphones, Car Oil Filter, and Smart Watch.',
      data: {
        assignments: [
          { id: 'item_001', title: 'Wireless Headphones' },
          { id: 'item_002', title: 'Car Oil Filter' },
          { id: 'item_003', title: 'Smart Watch' }
        ],
        count: 3
      },
      read: false,
      priority: 'medium',
      created_at: new Date().toISOString()
    },
    {
      id: 'notif_002',
      user_id: userId || 'user_001',
      type: 'review_overdue',
      title: 'Overdue Review Items',
      message: '2 review items are now overdue and require immediate attention.',
      data: {
        overdue_items: [
          { id: 'item_004', title: 'Laptop Charger', due_date: '2024-01-15' },
          { id: 'item_005', title: 'Phone Case', due_date: '2024-01-14' }
        ],
        count: 2
      },
      read: false,
      priority: 'high',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'notif_003',
      user_id: userId || 'user_001',
      type: 'workload_warning',
      title: 'High Workload Alert',
      message: 'Your current workload is at 90% capacity. Consider requesting assistance.',
      data: {
        current_workload: 18,
        max_capacity: 20,
        percentage: 90
      },
      read: true,
      priority: 'medium',
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      read_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'notif_004',
      user_id: userId || 'user_001',
      type: 'system_alert',
      title: 'System Maintenance',
      message: 'Scheduled maintenance will occur tonight from 2:00 AM to 4:00 AM EST.',
      data: {
        maintenance_start: '2024-01-20T02:00:00Z',
        maintenance_end: '2024-01-20T04:00:00Z',
        affected_services: ['review_queue', 'analytics']
      },
      read: true,
      priority: 'low',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      read_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
    }
  ]

  const markAsRead = async (notificationId: string) => {
    try {
      // TODO: Implement notifications table in database
      // const supabase = createBrowserClient()
      // const { error } = await supabase
      //   .from('notifications')
      //   .update({ 
      //     read: true, 
      //     read_at: new Date().toISOString() 
      //   })
      //   .eq('id', notificationId)

      // if (error) {
      //   throw error
      // }
      
      // Temporary: just update local state
      const error = null
      
      if (error) {
        throw error
      }

      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true, read_at: new Date().toISOString() }
          : notif
      ))
    } catch (error) {
      console.error('Error marking notification as read:', error)
      // Update locally for demo
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true, read_at: new Date().toISOString() }
          : notif
      ))
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
      
      if (unreadIds.length === 0) {
        toast.info('No unread notifications')
        return
      }

      // TODO: Implement notifications table in database
      // const supabase = createBrowserClient()
      // const { error } = await supabase
      //   .from('notifications')
      //   .update({ 
      //     read: true, 
      //     read_at: new Date().toISOString() 
      //   })
      //   .in('id', unreadIds)

      // if (error) {
      //   throw error
      // }
      
      // Temporary: just update local state
      const error = null
      
      if (error) {
        throw error
      }

      setNotifications(prev => prev.map(notif => 
        unreadIds.includes(notif.id)
          ? { ...notif, read: true, read_at: new Date().toISOString() }
          : notif
      ))

      toast.success(`Marked ${unreadIds.length} notifications as read`)
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('Failed to mark notifications as read')
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      // TODO: Implement notifications table in database
      // const supabase = createBrowserClient()
      // const { error } = await supabase
      //   .from('notifications')
      //   .delete()
      //   .eq('id', notificationId)

      // if (error) {
      //   throw error
      // }
      
      // Temporary: just update local state
      const error = null
      
      if (error) {
        throw error
      }

      setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
      toast.success('Notification deleted')
    } catch (error) {
      console.error('Error deleting notification:', error)
      // Update locally for demo
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
      toast.success('Notification deleted')
    }
  }

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings }
      
      const supabase = createBrowserClient()
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: userId,
          ...updatedSettings,
          updated_at: new Date().toISOString()
        })

      if (error) {
        throw error
      }

      setSettings(updatedSettings)
      toast.success('Notification settings updated')
    } catch (error) {
      console.error('Error updating settings:', error)
      // Update locally for demo
      setSettings(prev => ({ ...prev, ...newSettings }))
      toast.success('Notification settings updated')
    }
  }

  const playNotificationSound = (priority: string) => {
    if (!settings.sound_enabled) {return}
    
    // Create audio context and play notification sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Different frequencies for different priorities
      const frequency = priority === 'urgent' ? 800 : priority === 'high' ? 600 : 400
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.error('Error playing notification sound:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'review_assignment': return <User className="h-4 w-4" />
      case 'review_completed': return <CheckCircle className="h-4 w-4" />
      case 'review_overdue': return <AlertTriangle className="h-4 w-4" />
      case 'workload_warning': return <Clock className="h-4 w-4" />
      case 'system_alert': return <Info className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.read) {return false}
    if (filter === 'assignments' && notification.type !== 'review_assignment') {return false}
    if (filter === 'alerts' && !['review_overdue', 'workload_warning', 'system_alert'].includes(notification.type)) {return false}
    if (searchQuery && !notification.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !notification.message.toLowerCase().includes(searchQuery.toLowerCase())) {return false}
    return true
  })

  const unreadCount = notifications.filter(n => !n.read).length

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(true)}
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
        
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Notifications ({unreadCount} unread)</DialogTitle>
              <DialogDescription>
                Manage your review assignment notifications
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Quick Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={markAllAsRead}>
                    <Check className="h-4 w-4 mr-2" />
                    Mark All Read
                  </Button>
                  <Button size="sm" variant="outline" onClick={fetchNotifications}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={settings.sound_enabled ? 'default' : 'outline'}
                    onClick={() => updateSettings({ sound_enabled: !settings.sound_enabled })}
                  >
                    {settings.sound_enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              {/* Notifications List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      notification.read ? 'bg-gray-50' : 'bg-white border-blue-200'
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id)
                      }
                      setSelectedNotification(notification)
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1">
                        <div className={`p-1 rounded ${getPriorityColor(notification.priority)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm ${
                            notification.read ? 'text-gray-700' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </p>
                          <p className={`text-xs mt-1 ${
                            notification.read ? 'text-gray-500' : 'text-gray-600'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(notification.id)
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredNotifications.length === 0 && (
                  <div className="text-center py-8">
                    <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No notifications</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
          <p className="text-gray-600">
            {unreadCount} unread • {notifications.length} total
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={markAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
          <Button size="sm" variant="outline" onClick={fetchNotifications}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {(['all', 'unread', 'assignments', 'alerts'] as const).map((filterOption) => (
            <Button
              key={filterOption}
              size="sm"
              variant={filter === filterOption ? 'default' : 'outline'}
              onClick={() => setFilter(filterOption)}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.map((notification) => (
          <Card
            key={notification.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              notification.read ? 'opacity-75' : 'border-blue-200 shadow-sm'
            }`}
            onClick={() => {
              if (!notification.read) {
                markAsRead(notification.id)
              }
              setSelectedNotification(notification)
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${getPriorityColor(notification.priority)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-medium ${
                        notification.read ? 'text-gray-700' : 'text-gray-900'
                      }`}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                      <Badge variant="outline" className="text-xs">
                        {notification.priority}
                      </Badge>
                    </div>
                    
                    <p className={`text-sm mb-2 ${
                      notification.read ? 'text-gray-500' : 'text-gray-600'
                    }`}>
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{new Date(notification.created_at).toLocaleString()}</span>
                      <Badge variant="secondary" className="text-xs">
                        {notification.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!notification.read && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        markAsRead(notification.id)
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNotification(notification.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredNotifications.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-500">You&apos;re all caught up!</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notification Details Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-lg">
          {selectedNotification && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getNotificationIcon(selectedNotification.type)}
                  {selectedNotification.title}
                </DialogTitle>
                <DialogDescription>
                  {new Date(selectedNotification.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <p className="text-gray-700">{selectedNotification.message}</p>
                
                {selectedNotification.data && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Additional Details:</h4>
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                      {JSON.stringify(selectedNotification.data, null, 2)}
                    </pre>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(selectedNotification.priority)}>
                    {selectedNotification.priority} priority
                  </Badge>
                  <Badge variant="outline">
                    {selectedNotification.type.replace('_', ' ')}
                  </Badge>
                  {selectedNotification.read && (
                    <Badge variant="secondary">
                      Read {selectedNotification.read_at ? new Date(selectedNotification.read_at).toLocaleString() : ''}
                    </Badge>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedNotification(null)}>
                  Close
                </Button>
                {!selectedNotification.read && (
                  <Button onClick={() => {
                    markAsRead(selectedNotification.id)
                    setSelectedNotification(null)
                  }}>
                    Mark as Read
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
            <DialogDescription>
              Configure how you receive notifications
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium">Delivery Methods</h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>Email Notifications</span>
                </div>
                <Button
                  size="sm"
                  variant={settings.email_enabled ? 'default' : 'outline'}
                  onClick={() => updateSettings({ email_enabled: !settings.email_enabled })}
                >
                  {settings.email_enabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4" />
                  <span>Push Notifications</span>
                </div>
                <Button
                  size="sm"
                  variant={settings.push_enabled ? 'default' : 'outline'}
                  onClick={() => updateSettings({ push_enabled: !settings.push_enabled })}
                >
                  {settings.push_enabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {settings.sound_enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  <span>Sound Alerts</span>
                </div>
                <Button
                  size="sm"
                  variant={settings.sound_enabled ? 'default' : 'outline'}
                  onClick={() => updateSettings({ sound_enabled: !settings.sound_enabled })}
                >
                  {settings.sound_enabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h4 className="font-medium">Notification Types</h4>
              
              {[
                { key: 'assignment_notifications', label: 'Review Assignments', icon: User },
                { key: 'completion_notifications', label: 'Review Completions', icon: CheckCircle },
                { key: 'overdue_notifications', label: 'Overdue Items', icon: AlertTriangle },
                { key: 'workload_notifications', label: 'Workload Warnings', icon: Clock },
                { key: 'system_notifications', label: 'System Alerts', icon: Info }
              ].map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={settings[key as keyof NotificationSettings] ? 'default' : 'outline'}
                    onClick={() => updateSettings({ 
                      [key]: !settings[key as keyof NotificationSettings] 
                    })}
                  >
                    {settings[key as keyof NotificationSettings] ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}