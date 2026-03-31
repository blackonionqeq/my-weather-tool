// 彩云天气 API 响应类型定义

export interface RealtimeResult {
  status: string
  result: {
    realtime: {
      temperature: number
      apparent_temperature: number
      humidity: number
      wind: {
        speed: number
        direction: number
      }
      skycon: string
      precipitation: {
        local: {
          intensity: number
        }
      }
    }
  }
}

export interface HourlyResult {
  status: string
  result: {
    hourly: {
      description: string
      temperature: Array<{ datetime: string; value: number }>
      skycon: Array<{ datetime: string; value: string }>
      precipitation: Array<{ datetime: string; value: number }>
      wind: Array<{ datetime: string; speed: number; direction: number }>
      humidity: Array<{ datetime: string; value: number }>
    }
  }
}

export interface DailyResult {
  status: string
  result: {
    daily: {
      temperature: Array<{ date: string; max: number; min: number }>
      skycon: Array<{ date: string; value: string }>
      precipitation: Array<{ date: string; max: number; min: number; avg: number }>
    }
  }
}

export interface WeatherCache {
  realtime: RealtimeResult
  hourly: HourlyResult
  daily: DailyResult
}

export interface CurrentWeatherView {
  location: string
  skycon: string
  skyLabel: string
  temperature: number
  apparentTemperature: number
  humidity: number
  windSpeed: number
  windDirection: string
  updatedAt: string
}

export interface HourlyForecastViewItem {
  time: string
  skycon: string
  skyLabel: string
  temperature: number
}

export interface DailyForecastViewItem {
  dateLabel: string
  skycon: string
  skyLabel: string
  max: number
  min: number
}

export interface WeatherViewState {
  current: CurrentWeatherView
  hourly: HourlyForecastViewItem[]
  daily: DailyForecastViewItem[]
}
