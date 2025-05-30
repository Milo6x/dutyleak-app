'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function VerifyEmailForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createBrowserClient()

  useEffect(() => {
    // Check if this is a callback from email verification
    const handleEmailVerification = async () => {
      const { data, error } = await supabase.auth.getSession()
      
      if (data.session) {
        setIsVerified(true)
        toast.success('Email verified successfully!')
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    }

    handleEmailVerification()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setIsVerified(true)
          toast.success('Email verified successfully!')
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, supabase])

  const resendVerification = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const email = localStorage.getItem('pendingVerificationEmail')
      if (!email) {
        setError('No email found. Please try signing up again.')
        return
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      toast.success('Verification email sent!')
    } catch (error) {
      setError('Failed to resend verification email')
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerified) {
    return (
      <div className="text-center">
        <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Email Verified!
        </h3>
        <p className="text-gray-600 mb-4">
          Your account has been verified. Redirecting to dashboard...
        </p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Check Your Email
      </h3>
      
      <p className="text-gray-600 mb-6">
        We've sent a verification link to your email address. 
        Click the link in the email to verify your account and complete the signup process.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={resendVerification}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Sending...' : 'Resend Verification Email'}
        </button>

        <div className="text-sm text-gray-600">
          <span>Didn't receive the email? Check your spam folder or </span>
          <Link
            href="/auth/signup"
            className="text-blue-600 hover:text-blue-500 font-medium transition-colors"
          >
            try signing up again
          </Link>
        </div>

        <div className="text-sm text-gray-600">
          <Link
            href="/auth/login"
            className="text-blue-600 hover:text-blue-500 font-medium transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}