'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/dashboard-layout'
import {
  UserIcon,
  BuildingOfficeIcon,
  KeyIcon,
  BellIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'

interface Profile {
  id: string
  full_name: string
  email: string
  workspace_id: string
}

interface Workspace {
  id: string
  name: string
  settings: {
    default_origin_country?: string
    default_destination_country?: string
    currency?: string
    timezone?: string
    notifications?: {
      email_reviews?: boolean
      email_optimizations?: boolean
      email_reports?: boolean
    }
  }
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [formData, setFormData] = useState({
    full_name: '',
    workspace_name: '',
    default_origin_country: '',
    default_destination_country: 'US',
    currency: 'USD',
    timezone: 'America/New_York',
    email_reviews: true,
    email_optimizations: true,
    email_reports: false
  })
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        
        // Fetch workspace
        const { data: workspaceData } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', profileData.workspace_id)
          .single()

        if (workspaceData) {
          setWorkspace(workspaceData)
          setFormData({
            full_name: profileData.full_name || '',
            workspace_name: workspaceData.name || '',
            default_origin_country: workspaceData.settings?.default_origin_country || '',
            default_destination_country: workspaceData.settings?.default_destination_country || 'US',
            currency: workspaceData.settings?.currency || 'USD',
            timezone: workspaceData.settings?.timezone || 'America/New_York',
            email_reviews: workspaceData.settings?.notifications?.email_reviews ?? true,
            email_optimizations: workspaceData.settings?.notifications?.email_optimizations ?? true,
            email_reports: workspaceData.settings?.notifications?.email_reports ?? false
          })
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    if (!profile) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: formData.full_name })
        .eq('id', profile.id)

      if (error) throw error
      
      setProfile({ ...profile, full_name: formData.full_name })
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const saveWorkspace = async () => {
    if (!workspace) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({
          name: formData.workspace_name,
          settings: {
            ...workspace.settings,
            default_origin_country: formData.default_origin_country,
            default_destination_country: formData.default_destination_country,
            currency: formData.currency,
            timezone: formData.timezone,
            notifications: {
              email_reviews: formData.email_reviews,
              email_optimizations: formData.email_optimizations,
              email_reports: formData.email_reports
            }
          }
        })
        .eq('id', workspace.id)

      if (error) throw error
      
      setWorkspace({
        ...workspace,
        name: formData.workspace_name,
        settings: {
          ...workspace.settings,
          default_origin_country: formData.default_origin_country,
          default_destination_country: formData.default_destination_country,
          currency: formData.currency,
          timezone: formData.timezone,
          notifications: {
            email_reviews: formData.email_reviews,
            email_optimizations: formData.email_optimizations,
            email_reports: formData.email_reports
          }
        }
      })
    } catch (error) {
      console.error('Error updating workspace:', error)
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'workspace', name: 'Workspace', icon: BuildingOfficeIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: KeyIcon },
  ]

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account and workspace preferences
          </p>
        </div>

        <div className="flex flex-col lg:flex-row lg:space-x-8">
          {/* Sidebar */}
          <div className="lg:w-1/4">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:w-3/4">
            <div className="bg-white shadow rounded-lg">
              {activeTab === 'profile' && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        value={profile?.email || ''}
                        disabled
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                    </div>
                    <div className="pt-4">
                      <button
                        onClick={saveProfile}
                        disabled={saving}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Profile'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'workspace' && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Workspace Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Workspace Name</label>
                      <input
                        type="text"
                        value={formData.workspace_name}
                        onChange={(e) => setFormData({ ...formData, workspace_name: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Default Origin Country</label>
                        <input
                          type="text"
                          value={formData.default_origin_country}
                          onChange={(e) => setFormData({ ...formData, default_origin_country: e.target.value })}
                          placeholder="CN"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Default Destination Country</label>
                        <select
                          value={formData.default_destination_country}
                          onChange={(e) => setFormData({ ...formData, default_destination_country: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="US">United States</option>
                          <option value="CA">Canada</option>
                          <option value="GB">United Kingdom</option>
                          <option value="DE">Germany</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Currency</label>
                        <select
                          value={formData.currency}
                          onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="USD">USD - US Dollar</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="GBP">GBP - British Pound</option>
                          <option value="CAD">CAD - Canadian Dollar</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Timezone</label>
                        <select
                          value={formData.timezone}
                          onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                          <option value="Europe/London">London</option>
                          <option value="Europe/Paris">Paris</option>
                        </select>
                      </div>
                    </div>
                    <div className="pt-4">
                      <button
                        onClick={saveWorkspace}
                        disabled={saving}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Workspace'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Review Queue Updates</h4>
                        <p className="text-sm text-gray-500">Get notified when items are added to the review queue</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.email_reviews}
                        onChange={(e) => setFormData({ ...formData, email_reviews: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Optimization Results</h4>
                        <p className="text-sm text-gray-500">Get notified when optimization jobs complete</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.email_optimizations}
                        onChange={(e) => setFormData({ ...formData, email_optimizations: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Weekly Reports</h4>
                        <p className="text-sm text-gray-500">Receive weekly summary reports</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.email_reports}
                        onChange={(e) => setFormData({ ...formData, email_reports: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="pt-4">
                      <button
                        onClick={saveWorkspace}
                        disabled={saving}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Notifications'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Password</h4>
                      <p className="text-sm text-gray-500 mb-4">
                        To change your password, you'll need to reset it using the forgot password feature.
                      </p>
                      <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        Reset Password
                      </button>
                    </div>
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Two-Factor Authentication</h4>
                      <p className="text-sm text-gray-500 mb-4">
                        Add an extra layer of security to your account.
                      </p>
                      <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        Enable 2FA
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}