import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../lib/db.js'
import { idParamSchema } from '../lib/schemas.js'

const messageQuerySchema = z.object({
  sessionId: z.string().min(1)
})

const messageCreateSchema = z.object({
  sessionId: z.string().min(1),
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1),
  agentId: z.string().optional().nullable()
})

export async function messageRoutes(app: FastifyInstance) {
  app.get('/messages', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id
    const query = messageQuerySchema.parse(request.query)
    const session = await prisma.session.findFirst({
      where: { id: query.sessionId, project: { userId } }
    })
    if (!session) {
      reply.code(404).send({ message: '会话不存在' })
      return
    }
    const messages = await prisma.message.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' }
    })
    return { messages }
  })

  app.post('/messages', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id
    const body = messageCreateSchema.parse(request.body)
    const session = await prisma.session.findFirst({
      where: { id: body.sessionId, project: { userId } }
    })
    if (!session) {
      reply.code(404).send({ message: '会话不存在' })
      return
    }
    if (body.agentId) {
      const agent = await prisma.agent.findFirst({
        where: { id: body.agentId, projectId: session.projectId, project: { userId } }
      })
      if (!agent) {
        reply.code(404).send({ message: '代理人不存在' })
        return
      }
    }
    const message = await prisma.message.create({
      data: {
        sessionId: body.sessionId,
        role: body.role,
        content: body.content,
        agentId: body.agentId ?? undefined
      }
    })
    return { message }
  })

  app.delete('/messages/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id
    const params = idParamSchema.parse(request.params)
    const message = await prisma.message.findFirst({
      where: { id: params.id, session: { project: { userId } } }
    })
    if (!message) {
      reply.code(404).send({ message: '消息不存在' })
      return
    }
    await prisma.message.delete({ where: { id: message.id } })
    return { ok: true }
  })
}
