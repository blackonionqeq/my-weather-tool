import webpush from 'web-push'
import type { RainAlertPushPayload } from '../shared/rain-alert.js'
import type { ServerConfig } from './config.js'
import type { StoredSubscription } from './db.js'

interface WebPushError extends Error {
  statusCode?: number
}

export function configureWebPush(config: ServerConfig): void {
  webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey)
}

export async function sendPushNotification(
  subscription: StoredSubscription,
  payload: RainAlertPushPayload,
): Promise<'sent' | 'expired' | 'failed'> {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        expirationTime: null,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
      proxy ? { proxy } : undefined,
    )

    return 'sent'
  } catch (error) {
    const pushError = error as WebPushError
    if (pushError.statusCode === 404 || pushError.statusCode === 410) {
      return 'expired'
    }

    console.error('[rain-alert] push send failed', pushError)
    return 'failed'
  }
}