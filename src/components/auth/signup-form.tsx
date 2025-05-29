'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import Link from 'next/link'

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  workspaceName: z.string().min(2, 'Workspace name must be at least 2 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type SignupFormData = z.infer<typeof signupSchema>

export default function SignupForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createBrowserClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true)
    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            workspace_name: data.workspaceName,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (authError) {
        toast.error(authError.message)
        return
      }

      if (authData.user && !authData.session) {
        toast.success('Please check your email to confirm your account!')
        router.push('/auth/verify-email')
        return
      }

      // If user is immediately signed in, create workspace
      if (authData.user && authData.session) {
        await createWorkspaceAndProfile(authData.user.id, data.fullName, data.workspaceName)
        toast.success('Account created successfully!')
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const createWorkspaceAndProfile = async (userId: string, fullName: string, workspaceName: string) => {
    try {
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: fullName,
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
      }

      // Create workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: workspaceName,
          plan: 'free',
        })
        .select()
        .single()

      if (workspaceError) {
        console.error('Workspace creation error:', workspaceError)
        return
      }

      // Add user to workspace
      const { error: workspaceUserError } = await supabase
        .from('workspace_users')
        .insert({
          user_id: userId,
          workspace_id: workspace.id,
          role: 'owner',
        })

      if (workspaceUserError) {
        console.error('Workspace user creation error:', workspaceUserError)
      }
    } catch (error) {
      console.error('Setup error:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
          Full Name
        </label>
        <input
          {...register('fullName')}
          id="fullName"
          type="text"
          autoComplete="name"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder="Enter your full name"
        />
        {errors.fullName && (
          <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="workspaceName" className="block text-sm font-medium text-gray-700 mb-2">
          Workspace Name
        </label>
        <input
          {...register('workspaceName')}
          id="workspaceName"
          type="text"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder="Enter your company or workspace name"
        />
        {errors.workspaceName && (
          <p className="mt-1 text-sm text-red-600">{errors.workspaceName.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          {...register('email')}
          id="email"
          type="email"
          autoComplete="email"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder="Enter your email"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          {...register('password')}
          id="password"
          type="password"
          autoComplete="new-password"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder="Create a password"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
          Confirm Password
        </label>
        <input
          {...register('confirmPassword')}
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder="Confirm your password"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </button>

      <div className="text-center">
        <span className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="text-blue-600 hover:text-blue-500 font-medium transition-colors"
          >
            Sign in
          </Link>
        </span>
      </div>
    </form>
  )
}