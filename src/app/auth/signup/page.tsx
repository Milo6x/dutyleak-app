import AuthLayout from '@/components/auth/auth-layout'
import SignupForm from '@/components/auth/signup-form'

export default function SignupPage() {
  return (
    <AuthLayout 
      title="Get Started" 
      subtitle="Create your DutyLeak account and workspace"
    >
      <SignupForm />
    </AuthLayout>
  )
}