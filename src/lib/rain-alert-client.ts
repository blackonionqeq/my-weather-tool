import type {
  RainAlertPublicKeyResponse,
  SerializablePushSubscription,
  UpsertRainAlertSubscriptionRequest,
} from '../../shared/rain-alert'

const BASE_URL = '/api/rain-alert'

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Rain alert request failed: ${response.status}`
    try {
      const payload = await response.json() as { error?: string }
      if (typeof payload.error === 'string' && payload.error.length > 0) {
        message = payload.error
      }
    } catch {
      // Keep the status-based message when the error body is not JSON.
    }
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

function base64UrlToUint8Array(value: string): Uint8Array {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

async function fetchVapidPublicKey(): Promise<string> {
  const response = await fetch(`${BASE_URL}/public-key`)
  const payload = await readJson<RainAlertPublicKeyResponse>(response)
  return payload.publicKey
}

export function serializePushSubscription(subscription: PushSubscription): SerializablePushSubscription {
  const serialized = subscription.toJSON()
  const endpoint = serialized.endpoint
  const expirationTime = serialized.expirationTime ?? null
  const p256dh = serialized.keys?.p256dh
  const auth = serialized.keys?.auth

  if (!endpoint || !p256dh || !auth) {
    throw new Error('Push subscription is missing required keys')
  }

  return {
    endpoint,
    expirationTime,
    keys: { p256dh, auth },
  }
}

export async function getOrCreatePushSubscription(
  registration: ServiceWorkerRegistration,
): Promise<PushSubscription> {
  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    return existing
  }

  const publicKey = await fetchVapidPublicKey()
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(publicKey),
  })
}

export async function saveRainAlertSubscription(
  subscription: PushSubscription,
  lng: number,
  lat: number,
): Promise<void> {
  const body: UpsertRainAlertSubscriptionRequest = {
    subscription: serializePushSubscription(subscription),
    location: { lng, lat },
  }

  const response = await fetch(`${BASE_URL}/subscriptions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  await readJson<{ ok: true }>(response)
}

export async function deleteRainAlertSubscription(subscription: PushSubscription | string): Promise<void> {
  const endpoint = typeof subscription === 'string'
    ? subscription
    : serializePushSubscription(subscription).endpoint

  const response = await fetch(`${BASE_URL}/subscriptions`, {
    method: 'DELETE',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ endpoint }),
  })

  if (!response.ok && response.status !== 204) {
    await readJson<never>(response)
  }
}