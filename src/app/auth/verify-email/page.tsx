import AuthLayout from '@/components/auth/auth-layout'
import VerifyEmailForm from '@/components/auth/verify-email-form'

export default function VerifyEmailPage() {
  return (
    <AuthLayout 
      title="Check Your Email" 
      subtitle="We've sent you a verification link"
    >
      <VerifyEmailForm />
    </AuthLayout>
  )
}