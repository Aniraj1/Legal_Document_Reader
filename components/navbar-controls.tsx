"use client"

import Link from "next/link"
import { BarChart3, LogOut, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"

interface NavbarControlsProps {
  showAnalytics?: boolean
}

export function NavbarControls({ showAnalytics = true }: NavbarControlsProps) {
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      window.location.href = "/"
    }
  }

  return (
    <div className="flex items-center gap-2">
      {showAnalytics && (
        <Link
          href="/analytics"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Analytics"
        >
          <BarChart3 className="w-4 h-4" />
        </Link>
      )}

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        title="Logout"
        onClick={() => void handleLogout()}
      >
        <LogOut className="w-4 h-4" />
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </Button>
    </div>
  )
}
