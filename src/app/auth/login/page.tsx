import AuthLayout from '@/components/auth/auth-layout'
import LoginForm from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <AuthLayout 
      title="Welcome Back" 
      subtitle="Sign in to your DutyLeak account"
    >
      <LoginForm />
    </AuthLayout>
  )
}