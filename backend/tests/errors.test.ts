import { describe, it, expect } from 'vitest'
import { AppError, Errors } from '../src/utils/errors'

describe('AppError', () => {
  it('captures code, status and message', () => {
    const err = new AppError('TEST', 418, 'I am a teapot')
    expect(err).toBeInstanceOf(Error)
    expect(err.code).toBe('TEST')
    expect(err.statusCode).toBe(418)
    expect(err.message).toBe('I am a teapot')
  })

  it('Errors.emailTaken returns 409', () => {
    const e = Errors.emailTaken()
    expect(e.statusCode).toBe(409)
    expect(e.code).toBe('EMAIL_TAKEN')
  })

  it('Errors.quotaExceeded returns 413', () => {
    expect(Errors.quotaExceeded().statusCode).toBe(413)
  })

  it('Errors.passwordRequired returns 401 with proper code', () => {
    const e = Errors.passwordRequired()
    expect(e.code).toBe('PASSWORD_REQUIRED')
    expect(e.statusCode).toBe(401)
  })
})
