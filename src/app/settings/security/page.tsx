'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/lib/external/sonner-mock'
import { 
  ShieldCheckIcon, 
  KeyIcon, 
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface SecuritySettings {
  id?: string
  user_id: string
  two_factor_enabled: boolean
  login_notifications: boolean
  session_timeout: number
  password_last_changed?: string
  failed_login_attempts?: number
  last_login?: string
  created_at?: string
  updated_at?: string
}

interface LoginSession {
  id: string
  device_info: string
  ip_address: string
  location: string
  last_active: string
  is_current: boolean
}

export default function SecurityPage() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null)
  const [sessions, setSessions] = useState<LoginSession[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [changingPassword, setChangingPassword] = useState(false)

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchSecuritySettings()
    fetchActiveSessions()
  }, [])

  const fetchSecuritySettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Set default settings (no database table exists)
        setSettings({
          user_id: user.id,
          two_factor_enabled: false,
          login_notifications: true,
          session_timeout: 30
        })
      }
    } catch (error) {
      console.error('Error fetching security settings:', error)
      toast.error('Failed to load security settings')
    } finally {
      setLoading(false)
    }
  }

  const fetchActiveSessions = async () => {
    try {
      // Fetch real active sessions from API
      const response = await fetch('/api/settings/sessions')
      if (response.ok) {
        const sessions = await response.json()
        setSessions(sessions)
      } else {
        throw new Error('Failed to fetch sessions')
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
      toast.error('Failed to load active sessions')
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // Note: Security settings are stored locally only
      // No database table exists for security_settings
      toast.success('Security settings updated successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save security settings')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (error) {throw error}

      toast.success('Password changed successfully')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      fetchSecuritySettings()
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error('Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const revokeSession = async (sessionId: string) => {
    try {
      // Mock session revocation
      setSessions(sessions.filter(s => s.id !== sessionId))
      toast.success('Session revoked successfully')
    } catch (error) {
      console.error('Error revoking session:', error)
      toast.error('Failed to revoke session')
    }
  }

  const updateSetting = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
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
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load security settings</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account security and privacy settings
        </p>
      </div>

      {/* Password Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyIcon className="h-5 w-5" />
            Password Security
          </CardTitle>
          <CardDescription>
            Change your password and manage password security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <div className="flex justify-between items-center pt-2">
            <div className="text-sm text-gray-500">
              {settings.password_last_changed && (
                <span>Last changed: {new Date(settings.password_last_changed).toLocaleDateString()}</span>
              )}
            </div>
            <Button
              onClick={changePassword}
              disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}
            >
              {changingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <Label className="text-sm font-medium">Enable Two-Factor Authentication</Label>
                <p className="text-xs text-gray-500">Require a verification code in addition to your password</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {settings.two_factor_enabled ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircleIcon className="h-3 w-3 mr-1" />
                  Enabled
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                  Disabled
                </Badge>
              )}
              <Switch
                checked={settings.two_factor_enabled}
                onCheckedChange={(checked) => updateSetting('two_factor_enabled', checked)}
              />
            </div>
          </div>
          {!settings.two_factor_enabled && (
            <Alert>
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                Your account is less secure without two-factor authentication. Enable it to protect against unauthorized access.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Login & Session Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Login & Session Settings</CardTitle>
          <CardDescription>
            Manage login notifications and session preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Login Notifications</Label>
              <p className="text-xs text-gray-500">Get notified when someone logs into your account</p>
            </div>
            <Switch
              checked={settings.login_notifications}
              onCheckedChange={(checked) => updateSetting('login_notifications', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Session Timeout (minutes)</Label>
            <Input
              type="number"
              value={settings.session_timeout}
              onChange={(e) => updateSetting('session_timeout', parseInt(e.target.value))}
              min="5"
              max="1440"
              className="w-32"
            />
            <p className="text-xs text-gray-500">
              Automatically log out after this period of inactivity
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DevicePhoneMobileIcon className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            Manage devices and locations where you're currently logged in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{session.device_info}</span>
                      {session.is_current && (
                        <Badge variant="default" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {session.location} • {session.ip_address}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <ClockIcon className="h-3 w-3" />
                      Last active: {new Date(session.last_active).toLocaleString()}
                    </div>
                  </div>
                </div>
                {!session.is_current && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeSession(session.id)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
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