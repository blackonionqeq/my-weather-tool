import type { RealtimeResult, HourlyResult, DailyResult } from './types'

const BASE_URL = import.meta.env.DEV ? '/api/caiyun/v2.6' : 'https://api.caiyunapp.com/v2.6'

function getToken(): string {
  const token = import.meta.env.VITE_CAIYUN_TOKEN
  if (!token) throw new Error('VITE_CAIYUN_TOKEN 未配置')
  return token
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  return res.json() as Promise<T>
}

export async function fetchRealtime(lng: number, lat: number): Promise<RealtimeResult> {
  const token = getToken()
  return fetchJson(`${BASE_URL}/${token}/${lng},${lat}/realtime`)
}

export async function fetchHourly(lng: number, lat: number): Promise<HourlyResult> {
  const token = getToken()
  return fetchJson(`${BASE_URL}/${token}/${lng},${lat}/hourly?hourlysteps=48`)
}

export async function fetchDaily(lng: number, lat: number): Promise<DailyResult> {
  const token = getToken()
  return fetchJson(`${BASE_URL}/${token}/${lng},${lat}/daily?dailysteps=3`)
}
