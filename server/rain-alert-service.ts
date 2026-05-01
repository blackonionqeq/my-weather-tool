import type { RainAlertPushPayload } from '../shared/rain-alert.js'
import { shouldAlertRain } from '../shared/rain-check.js'
import { fetchRainSnapshot } from './caiyun.js'
import type { RainAlertDatabase, StoredSubscription } from './db.js'
import { sendPushNotification } from './push.js'

const RAIN_ALERT_PAYLOAD: RainAlertPushPayload = {
  title: '🌧️ 即将下雨',
  body: '未来一小时预计有雨，记得带伞！',
  tag: 'rain-alert',
  icon: '/icons/icon-192.png',
  badge: '/icons/icon-192.png',
  url: '/',
}

export interface RainAlertRunSummary {
  inspectedSubscriptions: number
  uniqueLocations: number
  matchedLocations: number
  notificationsSent: number
  expiredSubscriptions: number
}

interface RainAlertServiceDependencies {
  caiyunToken: string
  database: RainAlertDatabase
  alertCooldownHours: number
}

interface SubscriptionGroup {
  lng: number
  lat: number
  subscriptions: StoredSubscription[]
}

function groupSubscriptionsByLocation(subscriptions: StoredSubscription[]): SubscriptionGroup[] {
  const groups = new Map<string, SubscriptionGroup>()

  for (const subscription of subscriptions) {
    const key = `${subscription.lng},${subscription.lat}`
    const existing = groups.get(key)
    if (existing) {
      existing.subscriptions.push(subscription)
      continue
    }

    groups.set(key, {
      lng: subscription.lng,
      lat: subscription.lat,
      subscriptions: [subscription],
    })
  }

  return [...groups.values()]
}

export function createRainAlertService({
  caiyunToken,
  database,
  alertCooldownHours,
}: RainAlertServiceDependencies) {
  const cooldownMs = alertCooldownHours * 60 * 60 * 1000

  function isInCooldown(subscription: StoredSubscription): boolean {
    if (!subscription.lastAlertedAt) return false
    return Date.now() - new Date(subscription.lastAlertedAt).getTime() < cooldownMs
  }

  return {
    async runCheck(): Promise<RainAlertRunSummary> {
      const subscriptions = database.listSubscriptions()
      const groups = groupSubscriptionsByLocation(subscriptions)

      let matchedLocations = 0
      let notificationsSent = 0
      let expiredSubscriptions = 0

      for (const group of groups) {
        const forceAlert = process.env.FORCE_RAIN_ALERT === '1'
        const eligibleSubscriptions = forceAlert
          ? group.subscriptions
          : group.subscriptions.filter((s) => !isInCooldown(s))

        if (eligibleSubscriptions.length === 0) continue

        const snapshot = await fetchRainSnapshot(caiyunToken, group.lng, group.lat)
        if (!forceAlert && !shouldAlertRain(snapshot.currentSkycon, snapshot.nextHourSkycon)) {
          continue
        }

        matchedLocations += 1
        const results = await Promise.all(
          eligibleSubscriptions.map((subscription) => sendPushNotification(subscription, RAIN_ALERT_PAYLOAD)),
        )

        results.forEach((result, index) => {
          if (result === 'sent') {
            notificationsSent += 1
            database.markAlerted(eligibleSubscriptions[index]!.endpoint)
            return
          }

          if (result === 'expired') {
            expiredSubscriptions += 1
            const subscription = eligibleSubscriptions[index]
            if (subscription) {
              database.deleteSubscription(subscription.endpoint)
            }
          }
        })
      }

      return {
        inspectedSubscriptions: subscriptions.length,
        uniqueLocations: groups.length,
        matchedLocations,
        notificationsSent,
        expiredSubscriptions,
      }
    },
  }
}