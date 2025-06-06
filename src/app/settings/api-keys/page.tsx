'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { EyeIcon, EyeSlashIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { toast } from '@/lib/external/sonner-mock'
import { encryptApiKey, decryptApiKey, validateApiKeyFormat, maskApiKey as maskKey } from '@/lib/encryption/api-key-encryption'

interface ApiKeyConfig {
  id?: string
  service_name: string
  api_key: string
  is_active: boolean
  last_tested?: string
  test_status?: 'success' | 'failed' | 'pending'
  created_at?: string
  updated_at?: string
}

const API_SERVICES = [
  {
    name: 'openai',
    label: 'OpenAI',
    description: 'GPT-4 for intelligent HS code classification',
    required: true,
    testEndpoint: '/api/classification/test-openai'
  },
  {
    name: 'anthropic',
    label: 'Anthropic Claude',
    description: 'Claude for advanced product analysis',
    required: false,
    testEndpoint: '/api/classification/test-anthropic'
  },
  {
    name: 'customs_api',
    label: 'Customs API',
    description: 'Official customs database integration',
    required: false,
    testEndpoint: '/api/classification/test-customs'
  }
]

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {throw error}

      // Transform the data to match ApiKeyConfig interface
      const transformedData = (data || []).map(item => ({
        id: item.id,
        service_name: item.service_name,
        api_key: item.api_key,
        is_active: item.is_active ?? false,
        last_tested: item.last_tested || undefined,
        test_status: (item.test_status as 'success' | 'failed' | 'pending') || undefined,
        created_at: item.created_at,
        updated_at: item.updated_at
      }))
      setApiKeys(transformedData)
      
      // Initialize form data with decrypted existing keys
      const initialFormData: Record<string, string> = {}
      API_SERVICES.forEach(service => {
        const existingKey = data?.find(key => key.service_name === service.name)
        if (existingKey?.api_key) {
          try {
            // Decrypt the API key for editing
            initialFormData[service.name] = decryptApiKey(existingKey.api_key)
          } catch (err) {
            console.error(`Failed to decrypt ${service.name} API key:`, err)
            initialFormData[service.name] = ''
          }
        } else {
          initialFormData[service.name] = ''
        }
      })
      setFormData(initialFormData)
    } catch (err) {
      console.error('Error fetching API keys:', err)
      setError('Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  const saveApiKey = async (serviceName: string) => {
    try {
      setSaving(serviceName)
      const apiKey = formData[serviceName]?.trim()
      
      if (!apiKey) {
        toast.error('API key cannot be empty')
        return
      }

      // Validate API key format
      const validation = validateApiKeyFormat(apiKey, serviceName)
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid API key format')
        return
      }

      // Encrypt the API key before storing
      const encryptedApiKey = encryptApiKey(apiKey)
      const existingKey = apiKeys.find(key => key.service_name === serviceName)
      
      if (existingKey) {
        // Update existing key
        const { error } = await supabase
          .from('api_keys')
          .update({
            api_key: encryptedApiKey,
            updated_at: new Date().toISOString(),
            test_status: 'pending' // Reset test status when key is updated
          })
          .eq('id', existingKey.id)

        if (error) {throw error}
      } else {
        // Create new key
        const { error } = await supabase
          .from('api_keys')
          .insert({
            service_name: serviceName,
            api_key: encryptedApiKey,
            is_active: true,
            test_status: 'pending'
          })

        if (error) {throw error}
      }

      toast.success(`${API_SERVICES.find(s => s.name === serviceName)?.label} API key saved successfully`)
      await fetchApiKeys()
    } catch (err) {
      console.error('Error saving API key:', err)
      toast.error('Failed to save API key')
    } finally {
      setSaving(null)
    }
  }

  const testApiKey = async (serviceName: string) => {
    try {
      setTesting(serviceName)
      const service = API_SERVICES.find(s => s.name === serviceName)
      if (!service) {return}

      const response = await fetch(service.testEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test_prompt: 'Test classification for: Wireless Bluetooth Headphones'
        })
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        // Update test status in database
        const existingKey = apiKeys.find(key => key.service_name === serviceName)
        if (existingKey) {
          await supabase
            .from('api_keys')
            .update({
              test_status: 'success',
              last_tested: new Date().toISOString()
            })
            .eq('id', existingKey.id)
        }
        
        toast.success(`${service.label} API key test successful`)
        await fetchApiKeys()
      } else {
        throw new Error(result.error || 'API test failed')
      }
    } catch (err) {
      console.error('Error testing API key:', err)
      toast.error(`API key test failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      
      // Update test status to failed
      const existingKey = apiKeys.find(key => key.service_name === serviceName)
      if (existingKey) {
        await supabase
          .from('api_keys')
          .update({
            test_status: 'failed',
            last_tested: new Date().toISOString()
          })
          .eq('id', existingKey.id)
        
        await fetchApiKeys()
      }
    } finally {
      setTesting(null)
    }
  }

  const toggleKeyVisibility = (serviceName: string) => {
    setShowKeys(prev => ({
      ...prev,
      [serviceName]: !prev[serviceName]
    }))
  }

  const maskApiKeyForDisplay = (key: string) => {
    return maskKey(key, 4)
  }

  const getKeyStatus = (serviceName: string) => {
    const keyConfig = apiKeys.find(key => key.service_name === serviceName)
    if (!keyConfig) {return null}
    
    return {
      hasKey: !!keyConfig.api_key,
      isActive: keyConfig.is_active,
      testStatus: keyConfig.test_status,
      lastTested: keyConfig.last_tested
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading API configuration...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">API Keys Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Configure API keys for HS Code classification services
        </p>
      </div>

      {error && (
        <Alert className="mb-6">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {API_SERVICES.map((service) => {
          const status = getKeyStatus(service.name)
          const isConfigured = status?.hasKey
          const testStatus = status?.testStatus
          
          return (
            <Card key={service.name} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {service.label}
                      {service.required && (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      )}
                      {isConfigured && (
                        <Badge 
                          variant={testStatus === 'success' ? 'default' : testStatus === 'failed' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {testStatus === 'success' ? 'Verified' : testStatus === 'failed' ? 'Failed' : 'Not Tested'}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </div>
                  {isConfigured && testStatus === 'success' && (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${service.name}-key`}>API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id={`${service.name}-key`}
                        type={showKeys[service.name] ? 'text' : 'password'}
                        placeholder={`Enter ${service.label} API key`}
                        value={formData[service.name] || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          [service.name]: e.target.value
                        }))}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility(service.name)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showKeys[service.name] ? (
                          <EyeSlashIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <Button
                      onClick={() => saveApiKey(service.name)}
                      disabled={saving === service.name || !formData[service.name]?.trim()}
                      className="min-w-[80px]"
                    >
                      {saving === service.name ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
                
                {isConfigured && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-sm text-gray-600">
                      <p>Current key: {maskApiKeyForDisplay(formData[service.name] || '')}</p>
                      {status?.lastTested && (
                        <p className="text-xs text-gray-500">
                          Last tested: {new Date(status.lastTested).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testApiKey(service.name)}
                      disabled={testing === service.name || !formData[service.name]?.trim()}
                    >
                      {testing === service.name ? 'Testing...' : 'Test API'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-8">
        <Alert>
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Note:</strong> API keys are encrypted and stored securely. 
            Never share your API keys or commit them to version control.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}