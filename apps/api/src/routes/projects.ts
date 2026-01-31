import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../lib/db.js'
import { projectCreateSchema, idParamSchema } from '../lib/schemas.js'

const projectUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable()
  })
  .refine((data) => data.name || data.description !== undefined, {
    message: '至少提供一个需要更新的字段'
  })

export async function projectRoutes(app: FastifyInstance) {
  app.get('/projects', { preHandler: app.authenticate }, async (request) => {
    const userId = request.user.id
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
    return { projects }
  })

  app.post('/projects', { preHandler: app.authenticate }, async (request) => {
    const userId = request.user.id
    const body = projectCreateSchema.parse(request.body)
    const project = await prisma.project.create({
      data: {
        userId,
        name: body.name,
        description: body.description ?? undefined
      }
    })
    return { project }
  })

  app.get('/projects/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id
    const params = idParamSchema.parse(request.params)
    const project = await prisma.project.findFirst({
      where: { id: params.id, userId }
    })
    if (!project) {
      reply.code(404).send({ message: '项目不存在' })
      return
    }
    return { project }
  })

  app.put('/projects/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id
    const params = idParamSchema.parse(request.params)
    const body = projectUpdateSchema.parse(request.body)
    const project = await prisma.project.findFirst({
      where: { id: params.id, userId }
    })
    if (!project) {
      reply.code(404).send({ message: '项目不存在' })
      return
    }
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        name: body.name ?? project.name,
        description: body.description ?? project.description
      }
    })
    return { project: updated }
  })

  app.delete('/projects/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id
    const params = idParamSchema.parse(request.params)
    const project = await prisma.project.findFirst({
      where: { id: params.id, userId }
    })
    if (!project) {
      reply.code(404).send({ message: '项目不存在' })
      return
    }
    const sessions = (await prisma.session.findMany({
      where: { projectId: project.id },
      select: { id: true }
    })) as Array<{ id: string }>
    const sessionIds = sessions.map((item) => item.id)
    await prisma.$transaction([
      prisma.message.deleteMany({
        where: { sessionId: { in: sessionIds } }
      }),
      prisma.session.deleteMany({ where: { projectId: project.id } }),
      prisma.agent.deleteMany({ where: { projectId: project.id } }),
      prisma.project.delete({ where: { id: project.id } })
    ])
    return { ok: true }
  })
}
