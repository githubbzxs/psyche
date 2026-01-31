import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../lib/db.js'

const loginSchema = z.object({
  email: z.string().email(),
  name: z.string().optional().nullable(),
  setCookie: z.boolean().optional()
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/dev-login', async (request, reply) => {
    const body = loginSchema.parse(request.body)
    const user = await prisma.user.upsert({
      where: { email: body.email },
      update: { name: body.name ?? undefined },
      create: { email: body.email, name: body.name ?? undefined }
    })

    const token = app.jwt.sign({ id: user.id, email: user.email })
    if (body.setCookie !== false) {
      reply.setCookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/'
      })
    }

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl
      }
    }
  })

  app.get('/auth/me', { preHandler: app.authenticate }, async (request) => {
    const userId = request.user.id
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { user: null }
    }
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl
      }
    }
  })

  app.post('/auth/logout', async (_request, reply) => {
    reply.clearCookie('token', { path: '/' })
    return { ok: true }
  })
}
