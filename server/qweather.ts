export interface MinutelyRainItem {
  fxTime: string
  precip: number
  type: string
}

export interface MinutelyRainResponse {
  updateTime: string
  summary: string
  items: MinutelyRainItem[]
}

interface QWeatherMinutelyItem {
  fxTime?: unknown
  precip?: unknown
  type?: unknown
}

interface QWeatherMinutelyResponse {
  code?: unknown
  updateTime?: unknown
  summary?: unknown
  minutely?: unknown
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function readPrecip(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0
  const precip = Number.parseFloat(value)
  return Number.isFinite(precip) ? precip : 0
}

async function fetchJson(url: string, apiKey: string): Promise<QWeatherMinutelyResponse> {
  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        'X-QW-Api-Key': apiKey,
      },
    })
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? `: ${error.cause.message}` : ''
    throw new Error(`QWeather request failed${cause}`)
  }

  const payload = await response.json() as QWeatherMinutelyResponse

  if (!response.ok) {
    throw new Error(`QWeather request failed: HTTP ${response.status}`)
  }

  if (payload.code !== '200') {
    throw new Error(`QWeather request failed: code ${readString(payload.code) || 'unknown'}`)
  }

  return payload
}

export async function fetchMinutelyRain(
  apiHost: string,
  apiKey: string,
  lng: number,
  lat: number,
): Promise<MinutelyRainResponse> {
  const url = new URL('/v7/minutely/5m', apiHost)
  url.searchParams.set('location', `${lng},${lat}`)

  const payload = await fetchJson(url.toString(), apiKey)
  if (!Array.isArray(payload.minutely)) {
    throw new Error('QWeather response missing minutely data')
  }

  const items = payload.minutely.map((item: QWeatherMinutelyItem) => ({
    fxTime: readString(item.fxTime),
    precip: readPrecip(item.precip),
    type: readString(item.type),
  }))

  return {
    updateTime: readString(payload.updateTime),
    summary: readString(payload.summary),
    items,
  }
}
