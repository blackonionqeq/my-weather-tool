/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'
import type { RainAlertPushPayload } from '../shared/rain-alert'

declare const self: ServiceWorkerGlobalScope

// Workbox 预缓存（vite-plugin-pwa 注入 manifest）
precacheAndRoute(self.__WB_MANIFEST)

function isPushPayload(value: unknown): value is RainAlertPushPayload {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const payload = value as Record<string, unknown>
  return typeof payload.title === 'string'
    && typeof payload.body === 'string'
    && typeof payload.tag === 'string'
    && typeof payload.icon === 'string'
    && typeof payload.badge === 'string'
    && typeof payload.url === 'string'
}

async function showPushNotification(event: PushEvent): Promise<void> {
  const rawPayload = event.data?.json()
  if (!isPushPayload(rawPayload)) {
    return
  }

  await self.registration.showNotification(rawPayload.title, {
    body: rawPayload.body,
    icon: rawPayload.icon,
    badge: rawPayload.badge,
    tag: rawPayload.tag,
    data: {
      url: rawPayload.url,
    },
  })
}

self.addEventListener('push', (event) => {
  event.waitUntil(showPushNotification(event))
})

// 通知点击：打开 / 聚焦应用
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = typeof event.notification.data?.url === 'string' ? event.notification.data.url : '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
