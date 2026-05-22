import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth.store'

describe('auth.store', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ user: null, isAuthenticated: false })
  })

  it('initializes unauthenticated', () => {
    const s = useAuthStore.getState()
    expect(s.isAuthenticated).toBe(false)
    expect(s.user).toBeNull()
  })

  it('setTokens persists to localStorage and flips isAuthenticated', () => {
    useAuthStore.getState().setTokens('access', 'refresh')
    expect(localStorage.getItem('accessToken')).toBe('access')
    expect(localStorage.getItem('refreshToken')).toBe('refresh')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('setUser stores user payload', () => {
    useAuthStore.getState().setUser({
      id: '1',
      email: 'a@b.com',
      name: 'A',
      role: 'USER',
      quotaBytes: '100',
      usedBytes: '0',
    })
    expect(useAuthStore.getState().user?.email).toBe('a@b.com')
  })

  it('logout clears tokens and user', () => {
    useAuthStore.getState().setTokens('a', 'b')
    useAuthStore.getState().setUser({
      id: '1', email: 'a@b.com', name: null, role: 'USER',
      quotaBytes: '100', usedBytes: '0',
    })
    useAuthStore.getState().logout()
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('updateUsedBytes updates only when user exists', () => {
    useAuthStore.getState().updateUsedBytes('999')
    expect(useAuthStore.getState().user).toBeNull()

    useAuthStore.getState().setUser({
      id: '1', email: 'a@b.com', name: null, role: 'USER',
      quotaBytes: '1000', usedBytes: '500',
    })
    useAuthStore.getState().updateUsedBytes('999')
    expect(useAuthStore.getState().user?.usedBytes).toBe('999')
  })
})
