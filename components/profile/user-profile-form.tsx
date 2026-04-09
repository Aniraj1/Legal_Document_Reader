'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const UserProfileForm = () => {
  const { userDetail, createUserDetail, updateUserDetail, error, clearError } = useAuth()

  const [formData, setFormData] = useState({
    firstName: userDetail?.first_name || '',
    lastName: userDetail?.last_name || '',
  })

  const [localError, setLocalError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isEditing, setIsEditing] = useState(!userDetail)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Only sync form data with userDetail, don't override isEditing
    setFormData({
      firstName: userDetail?.first_name || '',
      lastName: userDetail?.last_name || '',
    })
  }, [userDetail])

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
    if (!formData.firstName.trim()) {
      setLocalError('First name is required')
      return false
    }

    if (!formData.lastName.trim()) {
      setLocalError('Last name is required')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLocalError(null)
    setSuccess(false)

    if (!validateForm()) {
      return
    }

    setIsSaving(true)
    try {
      if (userDetail) {
        await updateUserDetail(formData.firstName, formData.lastName)
      } else {
        await createUserDetail(formData.firstName, formData.lastName)
      }

      setSuccess(true)
      setIsEditing(false)

      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save profile'
      setLocalError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* View Mode */}
      {!isEditing && userDetail && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">First Name</p>
              <p className="text-foreground font-medium">{userDetail.first_name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Name</p>
              <p className="text-foreground font-medium">{userDetail.last_name || 'Not set'}</p>
            </div>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={(e) => {
              e.preventDefault()
              setIsEditing(true)
            }}
          >
            Edit Profile
          </Button>
        </div>
      )}

      {/* Edit Mode */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="Enter your first name"
              value={formData.firstName}
              onChange={handleChange}
              disabled={isSaving}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="Enter your last name"
              value={formData.lastName}
              onChange={handleChange}
              disabled={isSaving}
              required
            />
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-3">
              <p className="text-sm text-green-800 dark:text-green-200">
                Profile updated successfully!
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
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={(e) => {
                e.preventDefault()
                setIsEditing(false)
                setFormData({
                  firstName: userDetail?.first_name || '',
                  lastName: userDetail?.last_name || '',
                })
                setLocalError(null)
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Empty State */}
      {!isEditing && !userDetail && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <p className="text-sm text-muted-foreground mb-4">Add your personal information</p>

          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="Enter your first name"
              value={formData.firstName}
              onChange={handleChange}
              disabled={isSaving}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="Enter your last name"
              value={formData.lastName}
              onChange={handleChange}
              disabled={isSaving}
              required
            />
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-3">
              <p className="text-sm text-green-800 dark:text-green-200">
                Profile created successfully!
              </p>
            </div>
          )}

          {/* Error Messages */}
          {(localError || error) && (
            <div className="bg-destructive/10 border border-destructive/50 rounded-md p-3">
              <p className="text-sm text-destructive">{localError || error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? 'Creating...' : 'Create Profile'}
          </Button>
        </form>
      )}
    </>
  )
}
