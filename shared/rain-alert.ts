export interface RainAlertLocation {
  lng: number
  lat: number
}

export interface SerializablePushSubscription {
  endpoint: string
  expirationTime: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

export interface UpsertRainAlertSubscriptionRequest {
  subscription: SerializablePushSubscription
  location: RainAlertLocation
}

export interface DeleteRainAlertSubscriptionRequest {
  endpoint: string
}

export interface RainAlertPublicKeyResponse {
  publicKey: string
}

export interface RainAlertPushPayload {
  title: string
  body: string
  tag: string
  icon: string
  badge: string
  url: string
}