import { loadConfig } from './config.js'
import { createRainAlertDatabase } from './db.js'
import { configureWebPush } from './push.js'
import { createRainAlertService } from './rain-alert-service.js'

async function main(): Promise<void> {
  const config = loadConfig()
  const database = createRainAlertDatabase(config.dbPath)

  configureWebPush(config)

  try {
    const service = createRainAlertService({
      caiyunToken: config.caiyunToken,
      database,
      alertCooldownHours: config.alertCooldownHours,
    })
    const summary = await service.runCheck()
    console.log('[rain-alert] manual run finished', summary)
  } finally {
    database.close()
  }
}

main().catch((error) => {
  console.error('[rain-alert] manual run failed', error)
  process.exit(1)
})