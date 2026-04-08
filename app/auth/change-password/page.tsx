import { PasswordChangeForm } from '@/components/auth/password-change-form'

export const metadata = {
  title: 'Change Password | Legal Document Assistant',
  description: 'Change your account password',
}

export default function ChangePasswordPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-1 text-center">
        Change Password
      </h2>
      <p className="text-center text-sm text-muted-foreground mb-6">
        Update your account password
      </p>
      <PasswordChangeForm />
    </div>
  )
}
