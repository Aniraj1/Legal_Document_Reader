'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { UserProfileForm } from '@/components/profile/user-profile-form'
import { Button } from '@/components/ui/button'

export default function ProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated, logout, isLoading, getUserDetail } = useAuth()

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      void getUserDetail()
    }
  }, [isAuthenticated, getUserDetail])

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Profile Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account and personal information
          </p>
        </div>

        {/* User Info Section */}
        <div className="bg-card rounded-lg border shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Account Information
          </h2>

          <div className="space-y-3 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Username</p>
              <p className="text-foreground font-medium">{user?.username || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-foreground font-medium">{user?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Agreement Status</p>
              <p className="text-foreground font-medium">
                {user?.is_agreement ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Accepted
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    Not Accepted
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Details Section */}
        <div className="bg-card rounded-lg border shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Personal Information
          </h2>
          <UserProfileForm />
        </div>

        {/* Security Section */}
        <div className="bg-card rounded-lg border shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Security & Privacy
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Manage your security settings
          </p>
          <Link href="/auth/change-password">
            <Button variant="outline" className="w-full">
              Change Password
            </Button>
          </Link>
        </div>

        {/* Logout Section */}
        <div className="bg-card rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Session
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Log out from your account
          </p>
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
            disabled={isLoading}
          >
            {isLoading ? 'Logging out...' : 'Log Out'}
          </Button>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link href="/">
            <Button variant="outline" className="w-full">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
