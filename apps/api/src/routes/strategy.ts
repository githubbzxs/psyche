import type { FastifyInstance } from 'fastify'
import prisma from '../lib/db.js'
import { strategySchema } from '../lib/schemas.js'

export async function strategyRoutes(app: FastifyInstance) {
  app.get('/strategy', { preHandler: app.authenticate }, async (request) => {
    const userId = request.user.id
    const strategy = await prisma.strategyConfig.findUnique({
      where: { userId }
    })
    return { strategy }
  })

  app.put('/strategy', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.id
    const body = strategySchema.parse(request.body)
    const provider = await prisma.providerConfig.findFirst({
      where: { id: body.providerConfigId, userId }
    })
    if (!provider) {
      reply.code(404).send({ message: '供应商配置不存在' })
      return
    }
    const strategy = await prisma.strategyConfig.upsert({
      where: { userId },
      update: {
        providerConfigId: body.providerConfigId,
        model: body.model,
        prompt: body.prompt
      },
      create: {
        userId,
        providerConfigId: body.providerConfigId,
        model: body.model,
        prompt: body.prompt
      }
    })
    return { strategy }
  })
}
