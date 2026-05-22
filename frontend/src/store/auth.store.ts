import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  avatarKey?: string | null
  avatarUrl?: string | null
  role: string
  quotaBytes: string
  usedBytes: string
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  setUser: (user: AuthUser) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
  updateUsedBytes: (usedBytes: string) => void
}

function hasStoredToken(): boolean {
  try {
    return typeof window !== 'undefined' && !!localStorage.getItem('accessToken')
  } catch {
    return false
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: hasStoredToken(),

  setUser: (user) => set({ user, isAuthenticated: true }),

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    set({ isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    set({ user: null, isAuthenticated: false })
  },

  updateUsedBytes: (usedBytes) =>
    set((state) => ({
      user: state.user ? { ...state.user, usedBytes } : null,
    })),
}))
