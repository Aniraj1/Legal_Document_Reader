import { LoginForm } from '@/components/auth/login-form'
import { GuestOnly } from '@/components/auth/guest-only'

export const metadata = {
  title: 'Sign In | Legal Document Assistant',
  description: 'Sign in to your account',
}

export default function LoginPage() {
  return (
    <GuestOnly>
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
          Welcome Back
        </h2>
        <LoginForm />
      </div>
    </GuestOnly>
  )
}
