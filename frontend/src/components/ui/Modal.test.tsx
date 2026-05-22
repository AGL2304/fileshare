import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from './Modal'

describe('Modal', () => {
  it('does not render when closed', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <p>Hidden</p>
      </Modal>
    )
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
  })

  it('renders title, description and children when open', () => {
    render(
      <Modal open onClose={() => {}} title="My title" description="My desc">
        <p>Body</p>
      </Modal>
    )
    expect(screen.getByText('My title')).toBeInTheDocument()
    expect(screen.getByText('My desc')).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
  })

  it('has role=dialog and aria-modal=true', () => {
    render(
      <Modal open onClose={() => {}} title="X">
        <p>body</p>
      </Modal>
    )
    const dlg = screen.getByRole('dialog')
    expect(dlg).toHaveAttribute('aria-modal', 'true')
  })

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="X">
        <p>body</p>
      </Modal>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when clicking the close button', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="X">
        <p>body</p>
      </Modal>
    )
    fireEvent.click(screen.getByLabelText('Fermer'))
    expect(onClose).toHaveBeenCalled()
  })
})
