'use client'

import React, { createContext, useCallback, useEffect, useState } from 'react'
import { apiClient, AuthUser } from './api-client'

export interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Auth methods
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string, confirmPassword: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void

  // Profile methods
  getUserDetail: () => Promise<void>
  createUserDetail: (firstName: string, lastName: string) => Promise<void>
  updateUserDetail: (firstName?: string, lastName?: string) => Promise<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>

  // Additional info
  userDetail: { first_name: string; last_name: string } | null
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export interface AuthProviderProps {
  children: React.ReactNode
}

const USER_STORAGE_KEY = 'auth_user'

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [userDetail, setUserDetail] = useState<{ first_name: string; last_name: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Save user data to localStorage
   */
  const saveUserData = (userData: AuthUser) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData))
    }
  }

  /**
   * Load user data from localStorage
   */
  const loadUserData = (): AuthUser | null => {
    if (typeof window === 'undefined') return null
    const data = localStorage.getItem(USER_STORAGE_KEY)
    if (data) {
      try {
        return JSON.parse(data) as AuthUser
      } catch {
        return null
      }
    }
    return null
  }

  /**
   * Clear user data from localStorage
   */
  const clearUserData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_STORAGE_KEY)
    }
  }

  const hydrateUserState = useCallback((userInfo: AuthUser) => {
    const normalizedUser: AuthUser = {
      id: userInfo.id,
      username: userInfo.username,
      email: userInfo.email,
      first_name: userInfo.first_name,
      last_name: userInfo.last_name,
      is_agreement: userInfo.is_agreement,
      is_staff: userInfo.is_staff,
      is_superuser: userInfo.is_superuser,
    }

    saveUserData(normalizedUser)
    setUser(normalizedUser)
    setUserDetail({
      first_name: normalizedUser.first_name ?? '',
      last_name: normalizedUser.last_name ?? '',
    })
  }, [])

  /**
   * Initialize auth state from localStorage
   */
  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = apiClient.getAccessToken()
      const userData = loadUserData()

      if (accessToken) {
        try {
          const response = await apiClient.getCurrentUser()
          if (response.data) {
            hydrateUserState(response.data)
          } else if (userData) {
            setUser(userData)
            setUserDetail({
              first_name: userData.first_name ?? '',
              last_name: userData.last_name ?? '',
            })
          }
        } catch {
          if (userData) {
            setUser(userData)
            setUserDetail({
              first_name: userData.first_name ?? '',
              last_name: userData.last_name ?? '',
            })
          }
        }
      }
      setIsLoading(false)
    }

    void initializeAuth()
  }, [hydrateUserState])

  /**
   * Refresh token periodically
   */
  useEffect(() => {
    if (!user) return

    const refreshInterval = setInterval(() => {
      apiClient.refreshAccessToken()
    }, 5 * 60 * 1000) // Refresh every 5 minutes

    return () => clearInterval(refreshInterval)
  }, [user])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.login({ username, password })

      if (response.data && response.data.access && response.data.refresh) {
        apiClient.setTokens(response.data)

        const userInfoResponse = await apiClient.getCurrentUser()
        if (userInfoResponse.data) {
          hydrateUserState(userInfoResponse.data)
        } else {
          const userData: AuthUser = {
            id: '',
            username,
            email: '',
          }
          saveUserData(userData)
          setUser(userData)
        }
      } else {
        throw new Error(response.message || 'Login failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [hydrateUserState])

  const register = useCallback(
    async (username: string, email: string, password: string, confirmPassword: string) => {
      setIsLoading(true)
      setError(null)

      try {
        // Client-side validation
        if (!username.trim()) {
          throw new Error('Username is required')
        }
        if (!email.trim()) {
          throw new Error('Email is required')
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error('Please enter a valid email address')
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters long')
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match')
        }

        const response = await apiClient.register({
          username,
          email,
          password,
          is_agreement: true,
        })

        if (response.data && response.data.access && response.data.refresh) {
          apiClient.setTokens(response.data)

          const userInfoResponse = await apiClient.getCurrentUser()
          if (userInfoResponse.data) {
            hydrateUserState(userInfoResponse.data)
          } else {
            const userData: AuthUser = {
              id: '',
              username,
              email,
            }
            saveUserData(userData)
            setUser(userData)
          }
        } else {
          throw new Error(response.message || 'Registration failed')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Registration failed'
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [hydrateUserState],
  )

  const logout = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      await apiClient.logout()
      clearUserData()
      setUser(null)
      setUserDetail(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getUserDetail = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.getUserDetail()

      if (response.data) {
        hydrateUserState(response.data)
      } else {
        // User detail doesn't exist yet, which is fine
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user detail'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [hydrateUserState])

  const createUserDetail = useCallback(async (firstName: string, lastName: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.createUserDetail({
        first_name: firstName,
        last_name: lastName,
      })

      if (response.data) {
        setUserDetail({
          first_name: firstName,
          last_name: lastName,
        })
      } else {
        throw new Error(response.message || 'Failed to create user detail')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user detail'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateUserDetail = useCallback(async (firstName?: string, lastName?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const updates: { first_name?: string; last_name?: string } = {}
      if (firstName !== undefined) updates.first_name = firstName
      if (lastName !== undefined) updates.last_name = lastName

      const response = await apiClient.updateUserDetail(updates)

      if (response.data) {
        setUserDetail((prev) => ({
          first_name: firstName ?? prev?.first_name ?? '',
          last_name: lastName ?? prev?.last_name ?? '',
        }))
      } else {
        throw new Error(response.message || 'Failed to update user detail')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user detail'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      })

      // Some successful backend responses do not include success=true.
      // Treat explicit failure signals as errors instead of relying on message casing.
      if (response.success === false || !!response.error) {
        throw new Error(response.message || 'Failed to change password')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change password'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const value: AuthContextType = {
    user,
    userDetail,
    isAuthenticated: !!user && !!apiClient.getAccessToken(),
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    getUserDetail,
    createUserDetail,
    updateUserDetail,
    changePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
