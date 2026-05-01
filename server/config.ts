import 'dotenv/config'

export interface ServerConfig {
  port: number
  caiyunToken: string
  vapidPublicKey: string
  vapidPrivateKey: string
  vapidSubject: string
  dbPath: string
  alertCooldownHours: number
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

function parseVapidSubject(value: string | undefined): string {
  const subject = value?.trim() || 'mailto:rain-alert@example.com'
  if (subject.startsWith('mailto:') || /^[a-z][a-z\d+.-]*:\/\//i.test(subject)) {
    return subject
  }
  if (subject.includes('@')) {
    return `mailto:${subject}`
  }
  return subject
}

function parseAlertCooldownHours(value: string | undefined): number {
  if (!value) return 3
  const hours = Number.parseFloat(value)
  if (!Number.isFinite(hours) || hours < 0) {
    throw new Error(`Invalid ALERT_COOLDOWN_HOURS: ${value}`)
  }
  return hours
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: parsePort(env.RAIN_ALERT_PORT ?? env.PORT ?? '8787'),
    caiyunToken: requireEnv(env, 'CAIYUN_TOKEN'),
    vapidPublicKey: requireEnv(env, 'VAPID_PUBLIC_KEY'),
    vapidPrivateKey: requireEnv(env, 'VAPID_PRIVATE_KEY'),
    vapidSubject: parseVapidSubject(env.VAPID_SUBJECT),
    dbPath: requireEnv(env, 'RAIN_ALERT_DB_PATH'),
    alertCooldownHours: parseAlertCooldownHours(env.ALERT_COOLDOWN_HOURS),
  }
}