import { createHttpServer } from './http.js'
import { loadConfig } from './config.js'
import { createRainAlertDatabase } from './db.js'
import { configureWebPush } from './push.js'
import { createRainAlertService } from './rain-alert-service.js'
import { startHourlyScheduler } from './scheduler.js'

const config = loadConfig()
const database = createRainAlertDatabase(config.dbPath)
const rainAlertService = createRainAlertService({
  caiyunToken: config.caiyunToken,
  database,
  alertCooldownHours: config.alertCooldownHours,
})

configureWebPush(config)

const server = createHttpServer({ config, database })
const scheduler = startHourlyScheduler(async () => {
  const summary = await rainAlertService.runCheck()
  console.log('[rain-alert] scheduled run finished', summary)
})

server.listen(config.port, '0.0.0.0', () => {
  console.log(`[rain-alert] listening on :${config.port}`)
})

function shutdown(signal: string): void {
  console.log(`[rain-alert] received ${signal}, shutting down`)
  scheduler.stop()
  server.close(() => {
    database.close()
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))