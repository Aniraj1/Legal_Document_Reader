import type React from "react"

export const metadata = {
  title: "Authentication | Legal Document Assistant",
  description: "Login or register to access the Legal Document Assistant",
}

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Legal Document Assistant
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Secure document management and analysis
          </p>
        </div>

        {/* Content */}
        <div className="bg-card rounded-lg border shadow-sm p-8">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 Legal Document Assistant. All rights reserved.
        </p>
      </div>
    </div>
  )
}
