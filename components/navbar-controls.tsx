"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { BarChart3, LogOut, Moon, Sun, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { useAuth } from "@/hooks/use-auth"

interface NavbarControlsProps {
  showAnalytics?: boolean
}

export function NavbarControls({ showAnalytics = true }: NavbarControlsProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"
  const { user, isAuthenticated, logout, isLoading } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout failed:", error)
      window.location.href = "/auth/login"
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

      {isAuthenticated && user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              title={`User: ${user.username}`}
            >
              <User className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground">{user.username}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer flex items-center">
                <User className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer"
              disabled={isLoading}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link href="/auth/login">
          <Button variant="outline" size="sm" className="h-8">
            Sign In
          </Button>
        </Link>
      )}

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
