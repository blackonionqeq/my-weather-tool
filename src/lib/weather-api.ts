import type { RealtimeResult, HourlyResult, DailyResult } from './types'

// Token 由服务端注入（Nginx 代理 / Vite dev proxy），前端不再持有
const BASE_URL = '/api/caiyun'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  return res.json() as Promise<T>
}

export async function fetchRealtime(lng: number, lat: number): Promise<RealtimeResult> {
  return fetchJson(`${BASE_URL}/${lng},${lat}/realtime`)
}

export async function fetchHourly(lng: number, lat: number): Promise<HourlyResult> {
  return fetchJson(`${BASE_URL}/${lng},${lat}/hourly?hourlysteps=48`)
}

export async function fetchDaily(lng: number, lat: number): Promise<DailyResult> {
  return fetchJson(`${BASE_URL}/${lng},${lat}/daily?dailysteps=3`)
}
