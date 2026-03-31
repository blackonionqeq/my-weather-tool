import type { WeatherViewState } from './types'

export const mockWeather: WeatherViewState = {
  current: {
    location: '杭州 · 西湖区',
    skycon: 'PARTLY_CLOUDY_DAY',
    skyLabel: '多云',
    temperature: 23,
    apparentTemperature: 21,
    humidity: 0.67,
    windSpeed: 3.4,
    windDirection: '东南风',
    updatedAt: '14:10',
  },
  hourly: [
    { time: '现在', skycon: 'PARTLY_CLOUDY_DAY', skyLabel: '多云', temperature: 23 },
    { time: '15:00', skycon: 'CLOUDY', skyLabel: '阴', temperature: 24 },
    { time: '16:00', skycon: 'LIGHT_RAIN', skyLabel: '小雨', temperature: 23 },
    { time: '17:00', skycon: 'LIGHT_RAIN', skyLabel: '小雨', temperature: 22 },
    { time: '18:00', skycon: 'CLOUDY', skyLabel: '阴', temperature: 22 },
    { time: '19:00', skycon: 'CLOUDY', skyLabel: '阴', temperature: 21 },
    { time: '20:00', skycon: 'CLEAR_NIGHT', skyLabel: '晴夜', temperature: 20 },
    { time: '21:00', skycon: 'CLEAR_NIGHT', skyLabel: '晴夜', temperature: 19 },
    { time: '22:00', skycon: 'CLEAR_NIGHT', skyLabel: '晴夜', temperature: 19 },
    { time: '23:00', skycon: 'PARTLY_CLOUDY_NIGHT', skyLabel: '少云', temperature: 18 },
    { time: '00:00', skycon: 'PARTLY_CLOUDY_NIGHT', skyLabel: '少云', temperature: 18 },
    { time: '01:00', skycon: 'CLOUDY', skyLabel: '阴', temperature: 17 },
  ],
  daily: [
    { dateLabel: '今天', skycon: 'PARTLY_CLOUDY_DAY', skyLabel: '多云', max: 25, min: 18 },
    { dateLabel: '明天', skycon: 'LIGHT_RAIN', skyLabel: '小雨', max: 23, min: 16 },
    { dateLabel: '后天', skycon: 'CLOUDY', skyLabel: '阴', max: 21, min: 15 },
  ],
}
