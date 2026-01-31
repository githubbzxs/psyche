import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../lib/db.js'
import { agentCreateSchema, idParamSchema } from '../lib/schemas.js'

const agentUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    role: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    providerConfigId: z.string().optional().nullable()
  })
  .refine(
    (data) =>
      data.name || data.role || data.model || data.providerConfigId !== undefined,
    {
      message: '至少提供一个需要更新的字段'
    }
  )

const agentQuerySchema = z.object({
  projectId: z.string().optional()
})

export async function agentRoutes(app: FastifyInstance) {
  app.get('/agents', { preHandler: app.authenticate }, async (request) => {
    const userId = request.user.id
    const query = agentQuerySchema.parse(request.query)
    if (query.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: query.projectId, userId }
      })
      if (!project) {
        return { agents: [] }
      }
    }
    const agents = await prisma.agent.findMany({
      where: {
        project: { userId },
        projectId: query.projectId ?? undefined
      },
      orderBy: { createdAt: 'asc' }
    })
    return { agents }
  })

  app.post('/agents', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id
    const body = agentCreateSchema.parse(request.body)
    const project = await prisma.project.findFirst({
      where: { id: body.projectId, userId }
    })
    if (!project) {
      reply.code(404).send({ message: '项目不存在' })
      return
    }
    if (body.providerConfigId) {
      const provider = await prisma.providerConfig.findFirst({
        where: { id: body.providerConfigId, userId }
      })
      if (!provider) {
        reply.code(404).send({ message: '供应商配置不存在' })
        return
      }
    }
    const agent = await prisma.agent.create({
      data: {
        projectId: body.projectId,
        name: body.name,
        role: body.role,
        model: body.model,
        providerConfigId: body.providerConfigId ?? undefined
      }
    })
    return { agent }
  })

  app.put('/agents/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id
    const params = idParamSchema.parse(request.params)
    const body = agentUpdateSchema.parse(request.body)
    const agent = await prisma.agent.findFirst({
      where: { id: params.id, project: { userId } }
    })
    if (!agent) {
      reply.code(404).send({ message: '代理人不存在' })
      return
    }
    if (body.providerConfigId) {
      const provider = await prisma.providerConfig.findFirst({
        where: { id: body.providerConfigId, userId }
      })
      if (!provider) {
        reply.code(404).send({ message: '供应商配置不存在' })
        return
      }
    }
    const updated = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        name: body.name ?? agent.name,
        role: body.role ?? agent.role,
        model: body.model ?? agent.model,
        providerConfigId:
          body.providerConfigId === undefined
            ? agent.providerConfigId
            : body.providerConfigId
      }
    })
    return { agent: updated }
  })

  app.delete('/agents/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id
    const params = idParamSchema.parse(request.params)
    const agent = await prisma.agent.findFirst({
      where: { id: params.id, project: { userId } }
    })
    if (!agent) {
      reply.code(404).send({ message: '代理人不存在' })
      return
    }
    await prisma.agent.delete({ where: { id: agent.id } })
    return { ok: true }
  })
}
