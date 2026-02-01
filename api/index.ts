import { buildApp } from '../apps/api/src/app.js'

let appPromise

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const app = buildApp()
      await app.ready()
      return app
    })()
  }
  return appPromise
}

export default async function handler(req, res) {
  const app = await getApp()
  app.server.emit('request', req, res)
}
