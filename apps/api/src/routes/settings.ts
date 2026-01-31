import type { FastifyInstance } from 'fastify'
import prisma from '../lib/db.js'
import { settingsSchema } from '../lib/schemas.js'

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/settings', { preHandler: app.authenticate }, async (request) => {
    const userId = request.user.id
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: { userId }
    })
    return { settings }
  })

  app.put('/settings', { preHandler: app.authenticate }, async (request) => {
    const userId = request.user.id
    const body = settingsSchema.parse(request.body)
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: body,
      create: { userId, ...body }
    })
    return { settings }
  })
}
