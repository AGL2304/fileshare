import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuthStore } from '../store/auth.store'

function renderWithRoute(initial = '/private') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route
          path="/private"
          element={
            <ProtectedRoute>
              <div>Secret content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false })
    localStorage.clear()
  })

  it('renders children when authenticated', () => {
    useAuthStore.setState({ isAuthenticated: true })
    renderWithRoute()
    expect(screen.getByText('Secret content')).toBeInTheDocument()
  })

  it('redirects to /login when not authenticated', () => {
    renderWithRoute()
    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument()
  })
})
