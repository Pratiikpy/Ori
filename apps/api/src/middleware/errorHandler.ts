import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { ZodError } from 'zod'

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  request.log.error({ err: error }, 'request failed')

  if (error instanceof ZodError) {
    await reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: 'Invalid input',
      issues: error.issues,
    })
    return
  }

  if (error.validation) {
    await reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: error.message,
      issues: error.validation,
    })
    return
  }

  const status = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500
  await reply.status(status).send({
    error: error.code ?? 'INTERNAL_ERROR',
    message: status >= 500 ? 'Internal server error' : error.message,
  })
}
