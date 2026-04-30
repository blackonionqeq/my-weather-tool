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
}: RainAlertServiceDependencies) {
  return {
    async runCheck(): Promise<RainAlertRunSummary> {
      const subscriptions = database.listSubscriptions()
      const groups = groupSubscriptionsByLocation(subscriptions)

      let matchedLocations = 0
      let notificationsSent = 0
      let expiredSubscriptions = 0

      for (const group of groups) {
        const snapshot = await fetchRainSnapshot(caiyunToken, group.lng, group.lat)
        const forceAlert = process.env.FORCE_RAIN_ALERT === '1'
        if (!forceAlert && !shouldAlertRain(snapshot.currentSkycon, snapshot.nextHourSkycon)) {
          continue
        }

        matchedLocations += 1
        const results = await Promise.all(
          group.subscriptions.map((subscription) => sendPushNotification(subscription, RAIN_ALERT_PAYLOAD)),
        )

        results.forEach((result, index) => {
          if (result === 'sent') {
            notificationsSent += 1
            return
          }

          if (result === 'expired') {
            expiredSubscriptions += 1
            const subscription = group.subscriptions[index]
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