import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { ZodError } from 'zod'
import { routes } from './routes/index.js'

const app = Fastify({ logger: true })

const corsOrigins = (process.env.WEB_ORIGIN || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)

app.register(cors, {
  origin: corsOrigins.length ? corsOrigins : true,
  credentials: true
})
app.register(cookie)

const jwtSecret = process.env.JWT_SECRET || 'dev-secret'
if (!process.env.JWT_SECRET) {
  app.log.warn('未设置 JWT_SECRET，将使用开发默认值')
}

app.register(jwt, {
  secret: jwtSecret,
  cookie: {
    cookieName: 'token',
    signed: false
  }
})

app.register(rateLimit, {
  max: 120,
  timeWindow: '1 minute'
})

app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify()
  } catch (error) {
    reply.code(401).send({ message: '未登录' })
  }
})

app.setErrorHandler((error, request, reply) => {
  request.log.error(error)
  if (error instanceof ZodError) {
    reply.code(400).send({ message: '参数错误', details: error.flatten() })
    return
  }
  const statusCode = error.statusCode ?? 500
  reply.code(statusCode).send({ message: error.message || '服务异常' })
})

app.register(routes, { prefix: '/api' })

const port = Number(process.env.PORT || 8080)
const host = process.env.HOST || '0.0.0.0'

app
  .listen({ port, host })
  .then(() => {
    app.log.info(`API 服务启动于 http://${host}:${port}`)
  })
  .catch((error) => {
    app.log.error(error, '服务启动失败')
    process.exit(1)
  })
