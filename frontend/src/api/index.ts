import axios, { AxiosError, AxiosResponse } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

export interface ApiEnvelope<T> {
  success: boolean
  data?: T
  message?: string
  code?: string
  errors?: Record<string, string[]>
}

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request: attach access token ─────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Response: refresh token on 401 ──────────────────────────────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: string) => void
  reject: (reason: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error || !token) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

function clearSessionAndRedirect() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  // Avoid redirect loops if already on auth pages
  const path = window.location.pathname
  if (!path.startsWith('/login') && !path.startsWith('/register') && !path.startsWith('/share/')) {
    window.location.href = '/login'
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error)
    }

    // Don't try to refresh for the refresh endpoint itself
    if (originalRequest.url?.includes('/auth/refresh')) {
      clearSessionAndRedirect()
      return Promise.reject(error)
    }

    // Don't refresh for public share endpoints (token-based, not user session)
    if (originalRequest.url?.includes('/shares/') && !originalRequest.url?.endsWith('/shares')) {
      return Promise.reject(error)
    }

    if (originalRequest._retry) {
      clearSessionAndRedirect()
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      isRefreshing = false
      clearSessionAndRedirect()
      return Promise.reject(error)
    }

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
      const { accessToken, refreshToken: newRefreshToken } = data.data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', newRefreshToken)

      processQueue(null, accessToken)
      originalRequest.headers.Authorization = `Bearer ${accessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      clearSessionAndRedirect()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

// ─── Helper to extract envelope ───────────────────────────────────────
export function unwrap<T>(res: AxiosResponse<ApiEnvelope<T>>): T {
  if (!res.data.success) {
    throw new Error(res.data.message ?? 'Erreur inconnue')
  }
  return res.data.data as T
}

// ─── Typed API ────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  name: string | null
  role: string
  quotaBytes: string
  usedBytes: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post<ApiEnvelope<AuthUser>>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<ApiEnvelope<LoginResponse>>('/auth/login', data),

  logout: (refreshToken: string) =>
    api.delete('/auth/logout', { data: { refreshToken } }),

  me: () => api.get<ApiEnvelope<AuthUser>>('/auth/me'),
}

export const filesApi = {
  upload: (file: File, folderId?: string) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/files${folderId ? `?folderId=${folderId}` : ''}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  uploadWithProgress: (
    file: File,
    onProgress: (pct: number) => void,
    folderId?: string
  ) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/files${folderId ? `?folderId=${folderId}` : ''}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total) onProgress(Math.round((e.loaded * 100) / e.total))
      },
    })
  },

  list: (params?: {
    page?: number
    limit?: number
    folderId?: string
    search?: string
    mimeType?: string
  }) => api.get('/files', { params }),

  get: (id: string) => api.get(`/files/${id}`),
  delete: (id: string) => api.delete(`/files/${id}`),

  /**
   * Authenticated download. Streams the file via axios (token attached),
   * then triggers a browser save via blob. Returns void on success or throws.
   */
  download: async (id: string, filename: string) => {
    const res = await api.get(`/files/${id}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}

export const sharesApi = {
  create: (data: {
    fileId: string
    password?: string
    permission?: 'VIEW' | 'DOWNLOAD'
    expiresAt?: string
    maxDownloads?: number
  }) => api.post('/shares', data),

  list: () => api.get('/shares'),

  revoke: (id: string) => api.delete(`/shares/${id}`),

  // GET for quick info (password-protected returns 401 here)
  info: (token: string) => api.get(`/shares/${token}`),

  // POST with password in body (never in query string)
  resolve: (token: string, password?: string) =>
    api.post(`/shares/${token}/resolve`, password ? { password } : {}),

  /**
   * Public download. Posts JSON body (with optional password), receives a blob,
   * triggers a browser save. Returns void on success or throws on error.
   */
  download: async (token: string, filename: string, password?: string) => {
    const res = await api.post(
      `/shares/${token}/download`,
      password ? { password } : {},
      { responseType: 'blob' }
    )
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}

export const foldersApi = {
  list: (parentId?: string) => api.get('/folders', { params: { parentId } }),
  create: (data: { name: string; parentId?: string }) => api.post('/folders', data),
  delete: (id: string) => api.delete(`/folders/${id}`),
}

// ─── Admin API ────────────────────────────────────────────────────────

export type AdminRole = 'GUEST' | 'USER' | 'PREMIUM' | 'ADMIN'

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  system: () => api.get('/admin/system'),

  users: {
    list: (params?: {
      page?: number
      limit?: number
      search?: string
      role?: AdminRole
      isActive?: boolean
    }) => api.get('/admin/users', { params }),
    get: (id: string) => api.get(`/admin/users/${id}`),
    update: (id: string, data: {
      role?: AdminRole
      isActive?: boolean
      quotaBytes?: string | number
      name?: string | null
    }) => api.patch(`/admin/users/${id}`, data),
    delete: (id: string) => api.delete(`/admin/users/${id}`),
  },

  files: {
    list: (params?: {
      page?: number
      limit?: number
      search?: string
      status?: 'PENDING' | 'SCANNING' | 'READY' | 'QUARANTINED' | 'DELETED'
      userId?: string
    }) => api.get('/admin/files', { params }),
    purge: (id: string) => api.delete(`/admin/files/${id}`),
  },

  shares: {
    list: (params?: { page?: number; limit?: number; activeOnly?: boolean }) =>
      api.get('/admin/shares', { params }),
    revoke: (id: string) => api.delete(`/admin/shares/${id}`),
  },

  accessLogs: {
    list: (params?: {
      page?: number
      limit?: number
      fileId?: string
      shareId?: string
      since?: string
    }) => api.get('/admin/access-logs', { params }),
  },
}
