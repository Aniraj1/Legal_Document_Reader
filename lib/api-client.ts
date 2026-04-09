/**
 * API Client for Authentication and API calls
 * Handles JWT token management, request/response handling, and token refresh logic
 */

export interface ApiResponse<T = any> {
  success?: boolean
  message: string
  data?: T
  error?: string | string[] | Record<string, any>
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface AuthUser {
  id: string | number
  username: string
  email: string
  first_name?: string
  last_name?: string
  is_agreement?: boolean
  is_staff?: boolean
  is_superuser?: boolean
}

export interface UploadedFileItem {
  id: string
  file_name: string
}

export interface UploadedFileListData {
  total: number
  total_page: number
  page: number
  results: UploadedFileItem[]
}

export interface AskGroqChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AskGroqSource {
  chunk_id?: string
  section_title?: string
  content_preview?: string
  relevance_score?: number
}

export interface AskGroqData {
  answer: string
  sources: AskGroqSource[]
  confidence: 'high' | 'medium' | 'low' | 'none' | string
  metadata?: Record<string, unknown>
}

export interface PersonalAnalyticsEvent {
  timestamp: string
  eventType?: 'chat' | 'upload' | 'delete'
  status: 'success' | 'error'
  model?: string
  queryHash?: string
  querySample?: string
  totalMs: number
  vectorMs?: number
  groqMs?: number
  sourceTypes?: string[]
  sourceLabels?: string[]
  errorMessage?: string
}

export interface PersonalAnalyticsSummary {
  totalQueries: number
  successCount: number
  errorCount: number
  successRate: number
  avgTotalMs: number
  avgVectorMs: number
  avgGroqMs: number
  topSourceTypes: Array<{ type: string; count: number }>
  querySamples: Array<{ query: string; count: number }>
  recentEvents: PersonalAnalyticsEvent[]
  hourlyDistribution: Array<{ hour: number; count: number }>
  totalEvents?: number
  totalUploads?: number
  totalDeletes?: number
  topDocuments?: Array<{ document: string; count: number }>
}

class ApiClient {
  private baseUrl: string
  private projectName: string
  private accessTokenKey = process.env.NEXT_PUBLIC_ACCESS_TOKEN_KEY || 'access_token'
  private refreshTokenKey = process.env.NEXT_PUBLIC_REFRESH_TOKEN_KEY || 'refresh_token'

  private normalizeApiBaseUrl(input: string): string {
    const trimmed = input.trim().replace(/\/+$/, '')
    if (trimmed.endsWith('/api/v1')) return trimmed
    if (trimmed.endsWith('/api')) return `${trimmed}/v1`
    return `${trimmed}/api/v1`
  }

  constructor() {
    const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'
    this.baseUrl = this.normalizeApiBaseUrl(configuredBaseUrl)
    this.projectName = process.env.NEXT_PUBLIC_PROJECT_NAME || 'poc'
  }

  /**
   * Get stored access token
   */
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(this.accessTokenKey)
  }

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(this.refreshTokenKey)
  }

  /**
   * Store tokens in localStorage
   */
  setTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(this.accessTokenKey, tokens.access)
    localStorage.setItem(this.refreshTokenKey, tokens.refresh)
  }

  /**
   * Clear all stored tokens
   */
  clearTokens(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.accessTokenKey)
    localStorage.removeItem(this.refreshTokenKey)
  }

  /**
   * Make API request with automatic token injection
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {}

    const isFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData
    if (!isFormDataBody) {
      headers['Content-Type'] = 'application/json'
    }

    if (options.headers) {
      Object.assign(headers, options.headers as Record<string, string>)
    }

    // Add access token if available
    const accessToken = this.getAccessToken()
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data = (await response.json()) as ApiResponse<T>

      // Handle 401 with token refresh attempt
      if (response.status === 401 && accessToken) {
        const refreshed = await this.refreshAccessToken()
        if (refreshed) {
          // Retry the original request with new token
          return this.request(endpoint, options)
        }
        // If refresh failed, clear tokens
        this.clearTokens()
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`)
      }

      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network request failed'
      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
      }
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) return false

    try {
      const url = `${this.baseUrl}/${this.projectName}/refresh-token/`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      })

      if (!response.ok) return false

      const data = (await response.json()) as ApiResponse<{ access: string }>
      if (data.data?.access) {
        localStorage.setItem(this.accessTokenKey, data.data.access)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  /**
   * User Registration
   */
  async register(credentials: {
    username: string
    email: string
    password: string
    is_agreement: boolean
  }): Promise<ApiResponse<AuthTokens>> {
    const endpoint = `/${this.projectName}/user/register/`
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  }

  /**
   * User Login
   */
  async login(credentials: { username: string; password: string }): Promise<ApiResponse<AuthTokens>> {
    const endpoint = `/${this.projectName}/user/login/`
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  }

  /**
   * User Logout
   */
  async logout(): Promise<ApiResponse> {
    const refreshToken = this.getRefreshToken()
    const endpoint = `/${this.projectName}/user/logout/`

    const result = await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({ refresh: refreshToken }),
    })

    // Clear tokens regardless of response
    this.clearTokens()
    return result
  }

  /**
   * Get current user details
   */
  async getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    const endpoint = '/user-info/'
    return this.request(endpoint, {
      method: 'GET',
    })
  }

  /**
   * Get user detail (profile info)
   */
  async getUserDetail(): Promise<ApiResponse<AuthUser>> {
    const endpoint = '/user-info/'
    return this.request(endpoint, {
      method: 'GET',
    })
  }

  /**
   * Create user detail
   */
  async createUserDetail(data: { first_name: string; last_name: string }): Promise<ApiResponse> {
    const endpoint = '/user-detail/'
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Update user detail
   */
  async updateUserDetail(data: { first_name?: string; last_name?: string }): Promise<ApiResponse> {
    const endpoint = '/user-detail/'
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Change password
   */
  async changePassword(data: {
    old_password: string
    new_password: string
  }): Promise<ApiResponse> {
    const endpoint = '/logged-in-user/change-password/'
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Upload user document file
   */
  async uploadUserFile(file: File): Promise<ApiResponse<{ id: string; file_name: string; file_size: string }>> {
    const endpoint = '/upload/'
    const formData = new FormData()
    formData.append('file', file)

    return this.request(endpoint, {
      method: 'POST',
      body: formData,
    })
  }

  /**
   * Get files uploaded by current authenticated user
   */
  async getUserFiles(): Promise<ApiResponse<UploadedFileListData>> {
    const endpoint = '/get-files/'
    return this.request(endpoint, {
      method: 'GET',
    })
  }

  /**
   * Remove one uploaded file for current user
   */
  async removeUserFile(fileId: string): Promise<ApiResponse> {
    const endpoint = `/remove-file/${encodeURIComponent(fileId)}/`
    return this.request(endpoint, {
      method: 'DELETE',
    })
  }

  /**
   * Remove all uploaded files for current user
   */
  async removeAllUserFiles(): Promise<ApiResponse> {
    const endpoint = '/remove-files/'
    return this.request(endpoint, {
      method: 'DELETE',
    })
  }

  /**
   * Ask question about an uploaded document using backend RAG
   */
  async askGroq(data: {
    file_id: string
    query: string
    model?: string
    chat_history?: AskGroqChatMessage[]
  }): Promise<ApiResponse<AskGroqData>> {
    const endpoint = '/ask-groq/'
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Get personalized analytics for authenticated user
   */
  async getPersonalAnalytics(window: '24h' | '7d' | '30d' | 'all' = '7d'): Promise<ApiResponse<PersonalAnalyticsSummary>> {
    const endpoint = `/analytics/me/?window=${encodeURIComponent(window)}`
    return this.request(endpoint, {
      method: 'GET',
    })
  }

  /**
   * Clear personalized analytics for authenticated user
   */
  async clearPersonalAnalytics(): Promise<ApiResponse> {
    const endpoint = '/analytics/me/'
    return this.request(endpoint, {
      method: 'DELETE',
    })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()
