export interface ServerConfig {
  port: number
  caiyunToken: string
  vapidPublicKey: string
  vapidPrivateKey: string
  vapidSubject: string
  dbPath: string
}

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function parsePort(value: string): number {
  const port = Number.parseInt(value, 10)
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid port: ${value}`)
  }
  return port
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: parsePort(env.RAIN_ALERT_PORT ?? env.PORT ?? '8787'),
    caiyunToken: requireEnv(env, 'CAIYUN_TOKEN'),
    vapidPublicKey: requireEnv(env, 'VAPID_PUBLIC_KEY'),
    vapidPrivateKey: requireEnv(env, 'VAPID_PRIVATE_KEY'),
    vapidSubject: env.VAPID_SUBJECT ?? 'mailto:rain-alert@example.com',
    dbPath: requireEnv(env, 'RAIN_ALERT_DB_PATH'),
  }
}