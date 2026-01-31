import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../lib/db.js'
import { providerConfigSchema, idParamSchema } from '../lib/schemas.js'
import { encryptSecret } from '../lib/crypto.js'

const providerUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    type: z.enum(['openai', 'anthropic', 'custom']).optional(),
    baseUrl: z.string().url().optional(),
    defaultModel: z.string().min(1).optional(),
    apiKey: z.string().min(1).optional()
  })
  .refine(
    (data) =>
      data.name ||
      data.type ||
      data.baseUrl ||
      data.defaultModel ||
      data.apiKey,
    { message: '至少提供一个需要更新的字段' }
  )

export async function providerRoutes(app: FastifyInstance) {
  app.get('/providers', { preHandler: app.authenticate }, async (request) => {
    const userId = request.user.id
    const providers = (await prisma.providerConfig.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })) as Array<{
      id: string
      name: string
      type: string
      baseUrl: string
      defaultModel: string
      apiKeyEncrypted: string
    }>
    return {
      providers: providers.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        baseUrl: item.baseUrl,
        defaultModel: item.defaultModel,
        hasKey: Boolean(item.apiKeyEncrypted)
      }))
    }
  })

  app.post('/providers', { preHandler: app.authenticate }, async (request) => {
    const userId = request.user.id
    const body = providerConfigSchema.parse(request.body)
    const provider = await prisma.providerConfig.create({
      data: {
        userId,
        name: body.name,
        type: body.type,
        baseUrl: body.baseUrl,
        defaultModel: body.defaultModel,
        apiKeyEncrypted: encryptSecret(body.apiKey)
      }
    })
    return {
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        baseUrl: provider.baseUrl,
        defaultModel: provider.defaultModel,
        hasKey: true
      }
    }
  })

  app.get('/providers/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id
    const params = idParamSchema.parse(request.params)
    const provider = await prisma.providerConfig.findFirst({
      where: { id: params.id, userId }
    })
    if (!provider) {
      reply.code(404).send({ message: '供应商配置不存在' })
      return
    }
    return {
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        baseUrl: provider.baseUrl,
        defaultModel: provider.defaultModel,
        hasKey: Boolean(provider.apiKeyEncrypted)
      }
    }
  })

  app.put('/providers/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id
    const params = idParamSchema.parse(request.params)
    const body = providerUpdateSchema.parse(request.body)
    const provider = await prisma.providerConfig.findFirst({
      where: { id: params.id, userId }
    })
    if (!provider) {
      reply.code(404).send({ message: '供应商配置不存在' })
      return
    }
    const updated = await prisma.providerConfig.update({
      where: { id: provider.id },
      data: {
        name: body.name ?? provider.name,
        type: body.type ?? provider.type,
        baseUrl: body.baseUrl ?? provider.baseUrl,
        defaultModel: body.defaultModel ?? provider.defaultModel,
        apiKeyEncrypted: body.apiKey ? encryptSecret(body.apiKey) : provider.apiKeyEncrypted
      }
    })
    return {
      provider: {
        id: updated.id,
        name: updated.name,
        type: updated.type,
        baseUrl: updated.baseUrl,
        defaultModel: updated.defaultModel,
        hasKey: Boolean(updated.apiKeyEncrypted)
      }
    }
  })

  app.delete('/providers/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id
    const params = idParamSchema.parse(request.params)
    const provider = await prisma.providerConfig.findFirst({
      where: { id: params.id, userId }
    })
    if (!provider) {
      reply.code(404).send({ message: '供应商配置不存在' })
      return
    }
    await prisma.$transaction([
      prisma.usageMetric.deleteMany({ where: { providerConfigId: provider.id } }),
      prisma.agent.updateMany({
        where: { providerConfigId: provider.id },
        data: { providerConfigId: null }
      }),
      prisma.strategyConfig.deleteMany({ where: { providerConfigId: provider.id } }),
      prisma.providerConfig.delete({ where: { id: provider.id } })
    ])
    return { ok: true }
  })
}
