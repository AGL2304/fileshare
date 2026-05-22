import { FastifyRequest, FastifyReply } from 'fastify'

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify()
  } catch {
    return reply.code(401).send({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Token invalide ou expiré',
    })
  }
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply)
    if (reply.sent) return

    const user = request.user as { role: string }
    if (!roles.includes(user.role)) {
      return reply.code(403).send({
        success: false,
        code: 'FORBIDDEN',
        message: 'Permissions insuffisantes',
      })
    }
  }
}
