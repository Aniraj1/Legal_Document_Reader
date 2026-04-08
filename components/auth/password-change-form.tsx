'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const PasswordChangeForm = () => {
  const router = useRouter()
  const { changePassword, error, clearError } = useAuth()

  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [localError, setLocalError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setLocalError(null)
    clearError()
  }

  const validateForm = (): boolean => {
    if (!formData.oldPassword) {
      setLocalError('Current password is required')
      return false
    }

    if (!formData.newPassword) {
      setLocalError('New password is required')
      return false
    }

    if (formData.newPassword.length < 8) {
      setLocalError('New password must be at least 8 characters long')
      return false
    }

    if (formData.newPassword === formData.oldPassword) {
      setLocalError('New password must be different from current password')
      return false
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setLocalError('Passwords do not match')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLocalError(null)
    setSuccess(false)
    clearError()

    if (!validateForm()) {
      return
    }

    setIsSaving(true)
    try {
      await changePassword(formData.oldPassword, formData.newPassword)
      clearError()
      setSuccess(true)
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      })

      // Redirect immediately to profile
      router.push('/profile')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change password'
      setLocalError(errorMessage)
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="oldPassword">Current Password</Label>
        <Input
          id="oldPassword"
          name="oldPassword"
          type="password"
          placeholder="Enter your current password"
          value={formData.oldPassword}
          onChange={handleChange}
          disabled={isSaving}
          required
          autoComplete="current-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          placeholder="Enter your new password"
          value={formData.newPassword}
          onChange={handleChange}
          disabled={isSaving}
          required
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">At least 8 characters</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Confirm your new password"
          value={formData.confirmPassword}
          onChange={handleChange}
          disabled={isSaving}
          required
          autoComplete="new-password"
        />
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-3">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✓ Password changed successfully!
          </p>
        </div>
      )}

      {/* Error Messages */}
      {(localError || error) && (
        <div className="bg-destructive/10 border border-destructive/50 rounded-md p-3">
          <p className="text-sm text-destructive">{localError || error}</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <Button type="submit" className="flex-1" disabled={isSaving}>
          {isSaving ? 'Changing Password...' : 'Change Password'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
