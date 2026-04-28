function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function readCurrentSkycon(payload: unknown): string {
  const result = asRecord(payload)?.result
  const realtime = asRecord(result)?.realtime
  return readString(asRecord(realtime)?.skycon) ?? ''
}

function readNextHourSkycon(payload: unknown): string {
  const result = asRecord(payload)?.result
  const hourly = asRecord(result)?.hourly
  const skycon = asRecord(hourly)?.skycon
  if (!Array.isArray(skycon) || skycon.length < 2) {
    return ''
  }

  return readString(asRecord(skycon[1])?.value) ?? ''
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Caiyun request failed: ${response.status} ${url}`)
  }

  return response.json() as Promise<unknown>
}

export interface RainSnapshot {
  currentSkycon: string
  nextHourSkycon: string
}

export async function fetchRainSnapshot(caiyunToken: string, lng: number, lat: number): Promise<RainSnapshot> {
  const baseUrl = `https://api.caiyunapp.com/v2.6/${caiyunToken}/${lng},${lat}`
  const [realtime, hourly] = await Promise.all([
    fetchJson(`${baseUrl}/realtime`),
    fetchJson(`${baseUrl}/hourly?hourlysteps=2`),
  ])

  return {
    currentSkycon: readCurrentSkycon(realtime),
    nextHourSkycon: readNextHourSkycon(hourly),
  }
}