import type { FastifyInstance } from 'fastify'
import { authRoutes } from './auth.js'
import { healthRoutes } from './health.js'
import { projectRoutes } from './projects.js'
import { agentRoutes } from './agents.js'
import { sessionRoutes } from './sessions.js'
import { messageRoutes } from './messages.js'
import { providerRoutes } from './providers.js'
import { mappingRoutes } from './mappings.js'
import { settingsRoutes } from './settings.js'
import { strategyRoutes } from './strategy.js'

export async function routes(app: FastifyInstance) {
  await app.register(healthRoutes)
  await app.register(authRoutes)
  await app.register(projectRoutes)
  await app.register(agentRoutes)
  await app.register(sessionRoutes)
  await app.register(messageRoutes)
  await app.register(providerRoutes)
  await app.register(mappingRoutes)
  await app.register(settingsRoutes)
  await app.register(strategyRoutes)
}
