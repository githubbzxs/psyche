import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../lib/db.js'
import { idParamSchema, sessionCreateSchema } from '../lib/schemas.js'

const sessionQuerySchema = z.object({
  projectId: z.string().optional()
})

const sessionUpdateSchema = z
  .object({
    title: z.string().min(1).optional(),
    status: z.enum(['idle', 'running', 'paused', 'done']).optional(),
    maxTurns: z.number().int().min(1).max(50).optional(),
    currentTurn: z.number().int().min(0).optional()
  })
  .refine(
    (data) =>
      data.title ||
      data.status ||
      data.maxTurns !== undefined ||
      data.currentTurn !== undefined,
    { message: '至少提供一个需要更新的字段' }
  )

export async function sessionRoutes(app: FastifyInstance) {
  app.get('/sessions', { preHandler: app.authenticate }, async (request) => {
    const userId = request.user.id
    const query = sessionQuerySchema.parse(request.query)
    if (query.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: query.projectId, userId }
      })
      if (!project) {
        return { sessions: [] }
      }
    }
    const sessions = await prisma.session.findMany({
      where: {
        project: { userId },
        projectId: query.projectId ?? undefined
      },
      orderBy: { createdAt: 'desc' }
    })
    return { sessions }
  })

  app.post('/sessions', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id
    const body = sessionCreateSchema.parse(request.body)
    const project = await prisma.project.findFirst({
      where: { id: body.projectId, userId }
    })
    if (!project) {
      reply.code(404).send({ message: '项目不存在' })
      return
    }
    const session = await prisma.session.create({
      data: {
        projectId: body.projectId,
        title: body.title
      }
    })
    return { session }
  })

  app.put('/sessions/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id
    const params = idParamSchema.parse(request.params)
    const body = sessionUpdateSchema.parse(request.body)
    const session = await prisma.session.findFirst({
      where: { id: params.id, project: { userId } }
    })
    if (!session) {
      reply.code(404).send({ message: '会话不存在' })
      return
    }
    const updated = await prisma.session.update({
      where: { id: session.id },
      data: {
        title: body.title ?? session.title,
        status: body.status ?? session.status,
        maxTurns: body.maxTurns ?? session.maxTurns,
        currentTurn: body.currentTurn ?? session.currentTurn
      }
    })
    return { session: updated }
  })

  app.delete('/sessions/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id
    const params = idParamSchema.parse(request.params)
    const session = await prisma.session.findFirst({
      where: { id: params.id, project: { userId } }
    })
    if (!session) {
      reply.code(404).send({ message: '会话不存在' })
      return
    }
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { sessionId: session.id } }),
      prisma.session.delete({ where: { id: session.id } })
    ])
    return { ok: true }
  })
}
