const RAIN_SKYCONS = ['LIGHT_RAIN', 'MODERATE_RAIN', 'HEAVY_RAIN', 'STORM_RAIN']

export function isRain(skycon: string): boolean {
  return RAIN_SKYCONS.includes(skycon)
}

/** 当前非雨 + 下一小时是雨 → 应发出提醒 */
export function shouldAlertRain(currentSkycon: string, nextHourSkycon: string): boolean {
  return !isRain(currentSkycon) && isRain(nextHourSkycon)
}
