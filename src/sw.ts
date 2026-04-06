/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'
import { shouldAlertRain } from './lib/rain-check'

declare const self: ServiceWorkerGlobalScope

// Workbox 预缓存（vite-plugin-pwa 注入 manifest）
precacheAndRoute(self.__WB_MANIFEST)

// Periodic Background Sync 类型（非标准 API，TS 未内置）
interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string
}

// --- Periodic Background Sync: 降雨检查 ---
self.addEventListener('periodicsync' as any, (event: PeriodicSyncEvent) => {
  if (event.tag === 'rain-check') {
    event.waitUntil(checkRainAndNotify())
  }
})

async function checkRainAndNotify(): Promise<void> {
  // 1. 从 Cache API 读取配置
  const cache = await caches.open('rain-alert')
  const resp = await cache.match('/_rain-alert-config')
  if (!resp) return

  const config: { lng: number; lat: number; enabled: boolean } = await resp.json()
  if (!config.enabled) return

  // 2. 并发请求 realtime + hourly（只拉 2 条，节省带宽）
  try {
    const [realtimeResp, hourlyResp] = await Promise.all([
      fetch(`/api/caiyun/${config.lng},${config.lat}/realtime`),
      fetch(`/api/caiyun/${config.lng},${config.lat}/hourly?hourlysteps=2`),
    ])
    if (!realtimeResp.ok || !hourlyResp.ok) return

    const realtime = await realtimeResp.json()
    const hourly = await hourlyResp.json()

    // 3. 提取 skycon
    const currentSkycon: string = realtime.result?.realtime?.skycon ?? ''
    const nextHourSkycon: string = hourly.result?.hourly?.skycon?.[1]?.value ?? ''

    // 4. 判定 & 通知
    if (shouldAlertRain(currentSkycon, nextHourSkycon)) {
      await self.registration.showNotification('🌧️ 即将下雨', {
        body: '未来一小时预计有雨，记得带伞！',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'rain-alert', // 相同 tag 的通知会替换而非叠加
      })
    }
  } catch {
    // 网络失败，静默退出
  }
}

// 通知点击：打开 / 聚焦应用
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus()
      }
      return self.clients.openWindow('/')
    }),
  )
})
