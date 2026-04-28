import type {
  DeleteRainAlertSubscriptionRequest,
  RainAlertLocation,
  SerializablePushSubscription,
  UpsertRainAlertSubscriptionRequest,
} from '../shared/rain-alert.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseLocation(value: unknown): RainAlertLocation {
  if (!isRecord(value)) {
    throw new Error('location must be an object')
  }

  const lng = value.lng
  const lat = value.lat
  if (typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error('location.lng must be a finite number between -180 and 180')
  }
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error('location.lat must be a finite number between -90 and 90')
  }

  return { lng, lat }
}

function parseSubscription(value: unknown): SerializablePushSubscription {
  if (!isRecord(value)) {
    throw new Error('subscription must be an object')
  }

  const endpoint = value.endpoint
  const expirationTime = value.expirationTime
  const keys = value.keys
  if (typeof endpoint !== 'string' || endpoint.length === 0) {
    throw new Error('subscription.endpoint must be a non-empty string')
  }
  if (expirationTime !== null && typeof expirationTime !== 'number' && typeof expirationTime !== 'undefined') {
    throw new Error('subscription.expirationTime must be null or a number')
  }
  if (!isRecord(keys)) {
    throw new Error('subscription.keys must be an object')
  }

  const p256dh = keys.p256dh
  const auth = keys.auth
  if (typeof p256dh !== 'string' || p256dh.length === 0) {
    throw new Error('subscription.keys.p256dh must be a non-empty string')
  }
  if (typeof auth !== 'string' || auth.length === 0) {
    throw new Error('subscription.keys.auth must be a non-empty string')
  }

  return {
    endpoint,
    expirationTime: typeof expirationTime === 'number' ? expirationTime : null,
    keys: { p256dh, auth },
  }
}

export function parseUpsertSubscriptionBody(body: unknown): UpsertRainAlertSubscriptionRequest {
  if (!isRecord(body)) {
    throw new Error('request body must be an object')
  }

  return {
    subscription: parseSubscription(body.subscription),
    location: parseLocation(body.location),
  }
}

export function parseDeleteSubscriptionBody(body: unknown): DeleteRainAlertSubscriptionRequest {
  if (!isRecord(body)) {
    throw new Error('request body must be an object')
  }

  const endpoint = body.endpoint
  if (typeof endpoint !== 'string' || endpoint.length === 0) {
    throw new Error('endpoint must be a non-empty string')
  }

  return { endpoint }
}