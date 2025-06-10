'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

/**
 * Improved Signup Form with Proper Workspace Management
 * 
 * This component ensures every user is properly associated with a workspace
 * and handles edge cases that cause 403 permission errors.
 */

interface SignupFormData {
  email: string
  password: string
  fullName: string
  companyName?: string
}

export function ImprovedSignupForm() {
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    fullName: '',
    companyName: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Step 1: Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            company_name: formData.companyName
          }
        }
      })

      if (authError) {
        throw new Error(`Authentication failed: ${authError.message}`)
      }

      if (!authData.user) {
        throw new Error('User creation failed - no user data returned')
      }

      // Step 2: Ensure workspace setup (call our improved API endpoint)
      const workspaceResponse = await fetch('/api/auth/setup-workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: authData.user.id,
          companyName: formData.companyName || `${formData.fullName}'s Workspace`
        })
      })

      if (!workspaceResponse.ok) {
        const errorData = await workspaceResponse.json()
        throw new Error(`Workspace setup failed: ${errorData.error || 'Unknown error'}`)
      }

      const workspaceData = await workspaceResponse.json()
      console.log('Workspace setup successful:', workspaceData)

      setSuccess(true)
      
      // Redirect after successful signup
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error: any) {
      console.error('Signup error:', error)
      setError(error.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof SignupFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
  }

  if (success) {
    return (
      <div className="space-y-4">
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            ✅ Account created successfully! Setting up your workspace...
          </AlertDescription>
        </Alert>
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          <p className="text-sm text-gray-600 mt-2">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleInputChange('fullName')}
            required
            disabled={isLoading}
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            required
            disabled={isLoading}
            placeholder="Enter your email address"
          />
        </div>

        <div>
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange('password')}
            required
            disabled={isLoading}
            placeholder="Create a secure password"
            minLength={6}
          />
        </div>

        <div>
          <Label htmlFor="companyName">Company Name (Optional)</Label>
          <Input
            id="companyName"
            type="text"
            value={formData.companyName}
            onChange={handleInputChange('companyName')}
            disabled={isLoading}
            placeholder="Enter your company name"
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isLoading || !formData.email || !formData.password || !formData.fullName}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Account...
          </>
        ) : (
          'Create Account'
        )}
      </Button>

      <div className="text-sm text-gray-600 text-center">
        <p>By creating an account, you agree to our terms of service.</p>
        <p className="mt-2">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => router.push('/auth/login')}
            className="text-blue-600 hover:underline"
            disabled={isLoading}
          >
            Sign in here
          </button>
        </p>
      </div>
    </form>
  )
}

export default ImprovedSignupForm