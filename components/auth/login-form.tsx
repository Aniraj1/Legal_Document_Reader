'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const LoginForm = () => {
  const router = useRouter()
  const { login, isLoading, error, clearError } = useAuth()

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })

  const [localError, setLocalError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setLocalError(null)
    clearError()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLocalError(null)

    // Validation
    if (!formData.username.trim()) {
      setLocalError('Username is required')
      return
    }
    if (!formData.password) {
      setLocalError('Password is required')
      return
    }

    try {
      await login(formData.username, formData.password)
      router.push('/')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      setLocalError(errorMessage)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          type="text"
          placeholder="Enter your username"
          value={formData.username}
          onChange={handleChange}
          disabled={isLoading}
          required
          autoComplete="username"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleChange}
          disabled={isLoading}
          required
          autoComplete="current-password"
        />
      </div>

      {/* Error Messages */}
      {(localError || error) && (
        <div className="bg-destructive/10 border border-destructive/50 rounded-md p-3">
          <p className="text-sm text-destructive">{localError || error}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>

      {/* Register Link */}
      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link href="/auth/register" className="text-primary hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </form>
  )
}
