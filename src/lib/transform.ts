import type {
  RealtimeResult,
  HourlyResult,
  DailyResult,
  CurrentWeatherView,
  HourlyForecastViewItem,
  DailyForecastViewItem,
} from './types'
import { skyconToLabel, windDegToDirection } from './weather-icons'

export function transformRealtime(r: RealtimeResult): CurrentWeatherView {
  const rt = r.result.realtime
  return {
    location: '当前位置',
    skycon: rt.skycon,
    skyLabel: skyconToLabel(rt.skycon),
    temperature: Math.round(rt.temperature),
    apparentTemperature: Math.round(rt.apparent_temperature),
    humidity: rt.humidity,
    windSpeed: rt.wind.speed,
    windDirection: windDegToDirection(rt.wind.direction),
    updatedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  }
}

export function transformHourly(h: HourlyResult, limit = 24): HourlyForecastViewItem[] {
  const temps = h.result.hourly.temperature
  const skycons = h.result.hourly.skycon
  return temps.slice(0, limit).map((t, i) => {
    const dt = new Date(t.datetime)
    return {
      time: i === 0 ? '现在' : dt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      skycon: skycons[i].value,
      skyLabel: skyconToLabel(skycons[i].value),
      temperature: Math.round(t.value),
    }
  })
}

export function transformDaily(d: DailyResult): DailyForecastViewItem[] {
  const temps = d.result.daily.temperature
  const skycons = d.result.daily.skycon
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return temps.map((t, i) => {
    const date = new Date(t.date)
    date.setHours(0, 0, 0, 0)
    const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000)
    const dateLabel = diffDays === 0 ? '今天' : diffDays === 1 ? '明天' : '后天'
    return {
      dateLabel,
      skycon: skycons[i].value,
      skyLabel: skyconToLabel(skycons[i].value),
      max: Math.round(t.max),
      min: Math.round(t.min),
    }
  })
}
