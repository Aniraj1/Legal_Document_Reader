import { RegisterForm } from '@/components/auth/register-form'
import { GuestOnly } from '@/components/auth/guest-only'

export const metadata = {
  title: 'Sign Up | Legal Document Assistant',
  description: 'Create a new account',
}

export default function RegisterPage() {
  return (
    <GuestOnly>
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1 text-center">
          Create Account
        </h2>
        <p className="text-center text-sm text-muted-foreground mb-6">
          Join us to get started with document analysis
        </p>
        <RegisterForm />
      </div>
    </GuestOnly>
  )
}
