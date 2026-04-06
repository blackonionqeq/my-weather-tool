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
