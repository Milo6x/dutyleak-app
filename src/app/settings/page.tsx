'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/lib/external/sonner-mock'
import { 
  BuildingOfficeIcon, 
  GlobeAltIcon,
  CurrencyDollarIcon,
  ClockIcon,
  LanguageIcon
} from '@heroicons/react/24/outline'

interface WorkspaceSettings {
  id: string
  name: string
  plan: string
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

interface FormData {
  workspace_name: string
  workspace_description: string
  timezone: string
  currency: string
  language: string
  auto_classification: boolean
  notification_frequency: 'immediate' | 'daily' | 'weekly'
  data_retention_days: number
}

export default function GeneralSettingsPage() {
  const [workspace, setWorkspace] = useState<WorkspaceSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    workspace_name: '',
    workspace_description: '',
    timezone: 'UTC',
    currency: 'USD',
    language: 'en',
    auto_classification: true,
    notification_frequency: 'immediate' as 'immediate' | 'daily' | 'weekly',
    data_retention_days: 365
  })

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchWorkspaceData()
  }, [])

  const fetchWorkspaceData = async () => {
    try {
      const response = await fetch('/api/settings/workspaces')
      if (!response.ok) {
        throw new Error('Failed to fetch workspaces')
      }
      
      const { workspaces } = await response.json()
      const currentWorkspace = workspaces?.[0] // Get the first workspace for now

      if (currentWorkspace) {
        setWorkspace(currentWorkspace)
        setFormData({
          workspace_name: currentWorkspace.name || '',
          workspace_description: '',
          timezone: 'UTC',
          currency: 'USD',
          language: 'en',
          auto_classification: true,
          notification_frequency: 'immediate',
          data_retention_days: 365
        })
      }
    } catch (error) {
      console.error('Error fetching workspace data:', error)
      toast.error('Failed to load workspace settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      if (!workspace?.id) {
        throw new Error('No workspace selected')
      }

      const response = await fetch(`/api/settings/workspaces/${workspace.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.workspace_name
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }

      const result = await response.json()
      toast.success(result.message || 'General settings updated successfully')
      fetchWorkspaceData()
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">General Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your workspace and application preferences
        </p>
      </div>

      {/* Workspace Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BuildingOfficeIcon className="h-5 w-5" />
            Workspace Information
          </CardTitle>
          <CardDescription>
            Basic information about your workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workspace_name">Workspace Name</Label>
              <Input
                id="workspace_name"
                type="text"
                value={formData.workspace_name}
                onChange={(e) => setFormData({ ...formData, workspace_name: e.target.value })}
                placeholder="Enter workspace name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace_description">Description</Label>
              <Input
                id="workspace_description"
                type="text"
                value={formData.workspace_description}
                onChange={(e) => setFormData({ ...formData, workspace_description: e.target.value })}
                placeholder="Brief description of your workspace"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GlobeAltIcon className="h-5 w-5" />
            Regional Settings
          </CardTitle>
          <CardDescription>
            Configure timezone, currency, and language preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4" />
                Timezone
              </Label>
              <Select value={formData.timezone} onValueChange={(value) => setFormData({ ...formData, timezone: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time (EST/EDT)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CST/CDT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MST/MDT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PST/PDT)</SelectItem>
                  <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                  <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CurrencyDollarIcon className="h-4 w-4" />
                Currency
              </Label>
              <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD (C$)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                  <SelectItem value="AUD">AUD (A$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <LanguageIcon className="h-4 w-4" />
                Language
              </Label>
              <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Application Preferences</CardTitle>
          <CardDescription>
            Configure how the application behaves and processes data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Auto-Classification</Label>
              <p className="text-xs text-gray-500">Automatically classify products when uploaded</p>
            </div>
            <Switch
              checked={formData.auto_classification}
              onCheckedChange={(checked) => setFormData({ ...formData, auto_classification: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label>Notification Frequency</Label>
            <Select 
              value={formData.notification_frequency} 
              onValueChange={(value: 'immediate' | 'daily' | 'weekly') => setFormData({ ...formData, notification_frequency: value })}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="daily">Daily Digest</SelectItem>
                <SelectItem value="weekly">Weekly Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data Retention (Days)</Label>
            <Input
              type="number"
              value={formData.data_retention_days}
              onChange={(e) => setFormData({ ...formData, data_retention_days: parseInt(e.target.value) || 365 })}
              min="30"
              max="2555"
              className="w-full md:w-48"
            />
            <p className="text-xs text-gray-500">
              How long to keep classification and optimization data (30-2555 days)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="w-full md:w-auto"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}