import { buildApp } from './app.js'

const app = buildApp()

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
