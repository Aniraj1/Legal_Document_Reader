'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { LegalDocumentsModal } from '@/components/auth/legal-documents-modal'

export const RegisterForm = () => {
  const router = useRouter()
  const { register, isLoading, error, clearError } = useAuth()
  const [activeLegalDocument, setActiveLegalDocument] = useState<'terms' | 'privacy' | null>(null)

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  })

  const [localError, setLocalError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setLocalError(null)
    clearError()
  }

  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      setLocalError('Username is required')
      return false
    }

    if (formData.username.length < 3) {
      setLocalError('Username must be at least 3 characters long')
      return false
    }

    if (!formData.email.trim()) {
      setLocalError('Email is required')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setLocalError('Please enter a valid email address')
      return false
    }

    if (!formData.password) {
      setLocalError('Password is required')
      return false
    }

    if (formData.password.length < 8) {
      setLocalError('Password must be at least 8 characters long')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match')
      return false
    }

    if (!formData.agreeToTerms) {
      setLocalError('You must agree to the Terms of Service')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLocalError(null)

    if (!validateForm()) {
      return
    }

    try {
      await register(formData.username, formData.email, formData.password, formData.confirmPassword)
      router.push('/')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed'
      setLocalError(errorMessage)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          type="text"
          placeholder="Choose a username"
          value={formData.username}
          onChange={handleChange}
          disabled={isLoading}
          required
          autoComplete="username"
        />
        <p className="text-xs text-muted-foreground">At least 3 characters</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          disabled={isLoading}
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Create a strong password"
          value={formData.password}
          onChange={handleChange}
          disabled={isLoading}
          required
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">At least 8 characters</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={handleChange}
          disabled={isLoading}
          required
          autoComplete="new-password"
        />
      </div>

      {/* Terms Checkbox */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="agreeToTerms"
          name="agreeToTerms"
          checked={formData.agreeToTerms}
          onCheckedChange={(checked) =>
            setFormData((prev) => ({ ...prev, agreeToTerms: checked as boolean }))
          }
          disabled={isLoading}
        />
        <p className="text-sm leading-relaxed text-foreground">
          I agree to the{' '}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => setActiveLegalDocument('terms')}
          >
            Terms of Service
          </button>{' '}
          and{' '}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => setActiveLegalDocument('privacy')}
          >
            Privacy Policy
          </button>
          .
        </p>
      </div>

      {/* Error Messages */}
      {(localError || error) && (
        <div className="bg-destructive/10 border border-destructive/50 rounded-md p-3">
          <p className="text-sm text-destructive">{localError || error}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>

      {/* Login Link */}
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>

      <LegalDocumentsModal
        isOpen={activeLegalDocument !== null}
        documentType={activeLegalDocument ?? 'terms'}
        onClose={() => setActiveLegalDocument(null)}
      />
    </form>
  )
}
