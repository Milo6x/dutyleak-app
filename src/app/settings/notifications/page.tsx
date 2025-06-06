'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from '@/lib/external/sonner-mock'
import { BellIcon, EnvelopeIcon, DevicePhoneMobileIcon, SpeakerXMarkIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline'
import { Separator } from '@/components/ui/separator'

interface NotificationSettings {
  id?: string
  user_id: string
  email_enabled: boolean
  push_enabled: boolean
  sound_enabled: boolean
  review_assignments: boolean
  review_completions: boolean
  review_overdue: boolean
  system_alerts: boolean
  workload_warnings: boolean
  created_at?: string
  updated_at?: string
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchNotificationSettings()
  }, [])

  const fetchNotificationSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please log in to view notification settings')
        return
      }

      // Fetch existing notification settings
      const { data: existingSettings, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching notification settings:', error)
        toast.error('Failed to load notification settings')
        return
      }

      if (existingSettings) {
        setSettings(existingSettings)
      } else {
        // Create default settings if none exist
        const defaultSettings = {
          user_id: user.id,
          email_enabled: true,
          push_enabled: true,
          sound_enabled: true,
          review_assignments: true,
          review_completions: true,
          review_overdue: true,
          system_alerts: true,
          workload_warnings: true
        }
        
        const { data: newSettings, error: insertError } = await supabase
          .from('notification_settings')
          .insert(defaultSettings)
          .select()
          .single()

        if (insertError) {
          console.error('Error creating default settings:', insertError)
          toast.error('Failed to initialize notification settings')
        } else {
          setSettings(newSettings)
        }
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error)
      toast.error('Failed to load notification settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) {return}
    
    try {
      setSaving(true)
      
      const { error } = await supabase
        .from('notification_settings')
        .update({
          email_enabled: settings.email_enabled,
          push_enabled: settings.push_enabled,
          sound_enabled: settings.sound_enabled,
          review_assignments: settings.review_assignments,
          review_completions: settings.review_completions,
          review_overdue: settings.review_overdue,
          system_alerts: settings.system_alerts,
          workload_warnings: settings.workload_warnings,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', settings.user_id)
      
      if (error) {
        console.error('Error saving notification settings:', error)
        toast.error('Failed to save notification settings')
      } else {
        toast.success('Notification settings saved successfully')
        // Refresh settings to get updated timestamp
        await fetchNotificationSettings()
      }
    } catch (error) {
      console.error('Error saving notification settings:', error)
      toast.error('Failed to save notification settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    if (settings) {
      setSettings({ ...settings, [key]: value })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load notification settings</p>
        <Button onClick={fetchNotificationSettings} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage how and when you receive notifications
        </p>
      </div>

      <div className="grid gap-6">
        {/* Notification Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellIcon className="h-5 w-5" />
              Notification Channels
            </CardTitle>
            <CardDescription>
              Choose how you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <Label htmlFor="email-enabled" className="text-sm font-medium">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
              </div>
              <Switch
                id="email-enabled"
                checked={settings.email_enabled}
                onCheckedChange={(checked) => updateSetting('email_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <Label htmlFor="push-enabled" className="text-sm font-medium">
                    Push Notifications
                  </Label>
                  <p className="text-sm text-gray-500">Receive push notifications in your browser</p>
                </div>
              </div>
              <Switch
                id="push-enabled"
                checked={settings.push_enabled}
                onCheckedChange={(checked) => updateSetting('push_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.sound_enabled ? (
                  <SpeakerWaveIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <SpeakerXMarkIcon className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <Label htmlFor="sound-enabled" className="text-sm font-medium">
                    Sound Notifications
                  </Label>
                  <p className="text-sm text-gray-500">Play sound when notifications arrive</p>
                </div>
              </div>
              <Switch
                id="sound-enabled"
                checked={settings.sound_enabled}
                onCheckedChange={(checked) => updateSetting('sound_enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Review Notification Types */}
        <Card>
          <CardHeader>
            <CardTitle>Review Notifications</CardTitle>
            <CardDescription>
              Configure notifications for review-related activities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="review-assignments" className="text-sm font-medium">
                  Review Assignments
                </Label>
                <p className="text-xs text-gray-500">When new reviews are assigned to you</p>
              </div>
              <Switch
                id="review-assignments"
                checked={settings.review_assignments}
                onCheckedChange={(checked) => updateSetting('review_assignments', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="review-completions" className="text-sm font-medium">
                  Review Completions
                </Label>
                <p className="text-xs text-gray-500">When reviews you assigned are completed</p>
              </div>
              <Switch
                id="review-completions"
                checked={settings.review_completions}
                onCheckedChange={(checked) => updateSetting('review_completions', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="review-overdue" className="text-sm font-medium">
                  Overdue Reviews
                </Label>
                <p className="text-xs text-gray-500">When assigned reviews become overdue</p>
              </div>
              <Switch
                id="review-overdue"
                checked={settings.review_overdue}
                onCheckedChange={(checked) => updateSetting('review_overdue', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="workload-warnings" className="text-sm font-medium">
                  Workload Warnings
                </Label>
                <p className="text-xs text-gray-500">When your review workload is high</p>
              </div>
              <Switch
                id="workload-warnings"
                checked={settings.workload_warnings}
                onCheckedChange={(checked) => updateSetting('workload_warnings', checked)}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* System Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>System Notifications</CardTitle>
            <CardDescription>
              Important system alerts and updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="system-alerts" className="text-sm font-medium">
                  System Alerts
                </Label>
                <p className="text-xs text-gray-500">Critical system updates and maintenance notices</p>
              </div>
              <Switch
                id="system-alerts"
                checked={settings.system_alerts}
                onCheckedChange={(checked) => updateSetting('system_alerts', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Summary</CardTitle>
            <CardDescription>
              Current notification preferences overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Channels Enabled:</h4>
                <ul className="space-y-1 text-gray-600">
                  {settings.email_enabled && <li>• Email notifications</li>}
                  {settings.push_enabled && <li>• Push notifications</li>}
                  {settings.sound_enabled && <li>• Sound alerts</li>}
                  {!settings.email_enabled && !settings.push_enabled && !settings.sound_enabled && (
                    <li className="text-gray-400">No channels enabled</li>
                  )}
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Active Notifications:</h4>
                <ul className="space-y-1 text-gray-600">
                  {settings.review_assignments && <li>• Review assignments</li>}
                  {settings.review_completions && <li>• Review completions</li>}
                  {settings.review_overdue && <li>• Overdue reviews</li>}
                  {settings.workload_warnings && <li>• Workload warnings</li>}
                  {settings.system_alerts && <li>• System alerts</li>}
                  {!settings.review_assignments && !settings.review_completions && !settings.review_overdue && !settings.workload_warnings && !settings.system_alerts && (
                    <li className="text-gray-400">No notifications enabled</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />
      
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {settings.updated_at && (
            <span>Last updated: {new Date(settings.updated_at).toLocaleString()}</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchNotificationSettings}
            disabled={loading || saving}
          >
            Reset
          </Button>
          <Button
            onClick={saveSettings}
            disabled={saving || loading}
            className="min-w-[120px]"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}