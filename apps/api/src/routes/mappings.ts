import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../lib/db.js'
import { apiMappingSchema, idParamSchema } from '../lib/schemas.js'

const mappingUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    providerType: z.enum(['openai', 'anthropic', 'custom']).optional(),
    mappingJson: z.any().optional()
  })
  .refine(
    (data) => data.name || data.providerType || data.mappingJson !== undefined,
    { message: '至少提供一个需要更新的字段' }
  )

export async function mappingRoutes(app: FastifyInstance) {
  app.get('/mappings', { preHandler: app.authenticate }, async (request) => {
    const userId = request.user.id
    const mappings = (await prisma.apiMapping.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })) as Array<{
      id: string
      name: string
      providerType: string
      mappingJson: any
    }>
    return {
      mappings: mappings.map((item) => ({
        id: item.id,
        name: item.name,
        providerType: item.providerType,
        mappingJson: item.mappingJson
      }))
    }
  })

  app.post('/mappings', { preHandler: app.authenticate }, async (request) => {
    const userId = request.user.id
    const body = apiMappingSchema.parse(request.body)
    const mapping = await prisma.apiMapping.create({
      data: {
        userId,
        name: body.name,
        providerType: body.providerType,
        mappingJson: body.mappingJson
      }
    })
    return {
      mapping: {
        id: mapping.id,
        name: mapping.name,
        providerType: mapping.providerType,
        mappingJson: mapping.mappingJson
      }
    }
  })

  app.put('/mappings/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id
    const params = idParamSchema.parse(request.params)
    const body = mappingUpdateSchema.parse(request.body)
    const mapping = await prisma.apiMapping.findFirst({
      where: { id: params.id, userId }
    })
    if (!mapping) {
      reply.code(404).send({ message: '映射不存在' })
      return
    }
    const updated = await prisma.apiMapping.update({
      where: { id: mapping.id },
      data: {
        name: body.name ?? mapping.name,
        providerType: body.providerType ?? mapping.providerType,
        mappingJson: body.mappingJson ?? mapping.mappingJson
      }
    })
    return {
      mapping: {
        id: updated.id,
        name: updated.name,
        providerType: updated.providerType,
        mappingJson: updated.mappingJson
      }
    }
  })

  app.delete('/mappings/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id
    const params = idParamSchema.parse(request.params)
    const mapping = await prisma.apiMapping.findFirst({
      where: { id: params.id, userId }
    })
    if (!mapping) {
      reply.code(404).send({ message: '映射不存在' })
      return
    }
    await prisma.apiMapping.delete({ where: { id: mapping.id } })
    return { ok: true }
  })
}
