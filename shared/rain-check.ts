export const RAIN_SKYCONS = ['LIGHT_RAIN', 'MODERATE_RAIN', 'HEAVY_RAIN', 'STORM_RAIN'] as const

export function isRain(skycon: string): boolean {
  return RAIN_SKYCONS.includes(skycon as (typeof RAIN_SKYCONS)[number])
}

export function shouldAlertRain(currentSkycon: string, nextHourSkycon: string): boolean {
  return !isRain(currentSkycon) && isRain(nextHourSkycon)
}