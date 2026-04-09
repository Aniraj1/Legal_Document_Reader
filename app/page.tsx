'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { DocumentChat } from "@/components/document-chat"
import { NavbarControls } from "@/components/navbar-controls"
import { useAuth } from '@/hooks/use-auth'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Minimal Header */}
      <header className="shrink-0 py-4 border-b">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="w-5" />
          <h1 className="text-xl font-semibold text-foreground">
            Legal Document Assistant
          </h1>
          <NavbarControls />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <DocumentChat />
      </main>
    </div>
  )
}
