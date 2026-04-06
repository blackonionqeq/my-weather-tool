import type { WeatherCache } from './types'

const CACHE_KEY = 'weather:cache'
const CACHE_TS_KEY = 'weather:cache:ts'
const LOCATION_KEY = 'weather:location'

export function saveCache(data: WeatherCache): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  localStorage.setItem(CACHE_TS_KEY, new Date().toISOString())
}

export function loadCache(): { data: WeatherCache; ts: string } | null {
  const raw = localStorage.getItem(CACHE_KEY)
  const ts = localStorage.getItem(CACHE_TS_KEY)
  if (!raw || !ts) return null
  try {
    return { data: JSON.parse(raw) as WeatherCache, ts }
  } catch {
    return null
  }
}

/** Returns true if cache exists and is younger than maxAgeMs (default 10 min) */
export function isCacheFresh(maxAgeMs = 10 * 60 * 1000): boolean {
  const ts = localStorage.getItem(CACHE_TS_KEY)
  if (!ts) return false
  return Date.now() - new Date(ts).getTime() < maxAgeMs
}

export function saveLocation(lng: number, lat: number): void {
  localStorage.setItem(LOCATION_KEY, JSON.stringify({ lng, lat }))
}

export function loadLocation(): { lng: number; lat: number } | null {
  const raw = localStorage.getItem(LOCATION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as { lng: number; lat: number }
  } catch {
    return null
  }
}

export function formatCacheAge(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  return `${hours} 小时前`
}

// --- 降雨提醒偏好 ---

const RAIN_ALERT_KEY = 'weather:rain-alert'
const RAIN_ALERT_CACHE_NAME = 'rain-alert'
const RAIN_ALERT_CONFIG_URL = '/_rain-alert-config'

export function saveRainAlertPref(on: boolean): void {
  localStorage.setItem(RAIN_ALERT_KEY, on ? 'on' : 'off')
}

export function loadRainAlertPref(): boolean {
  return localStorage.getItem(RAIN_ALERT_KEY) === 'on'
}

/** 写入 Cache API，供 Service Worker 读取坐标和开关状态 */
export async function saveRainAlertConfig(lng: number, lat: number, enabled: boolean): Promise<void> {
  const cache = await caches.open(RAIN_ALERT_CACHE_NAME)
  await cache.put(
    new Request(RAIN_ALERT_CONFIG_URL),
    new Response(JSON.stringify({ lng, lat, enabled })),
  )
}

/** 清除 Cache API 中的降雨提醒配置 */
export async function clearRainAlertConfig(): Promise<void> {
  const cache = await caches.open(RAIN_ALERT_CACHE_NAME)
  await cache.delete(RAIN_ALERT_CONFIG_URL)
}
