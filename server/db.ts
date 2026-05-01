import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { RainAlertLocation, SerializablePushSubscription } from '../shared/rain-alert.js'

export interface StoredSubscription {
  endpoint: string
  p256dh: string
  auth: string
  lng: number
  lat: number
  createdAt: string
  updatedAt: string
  lastAlertedAt: string | null
}

export interface RainAlertDatabase {
  upsertSubscription(subscription: SerializablePushSubscription, location: RainAlertLocation): void
  deleteSubscription(endpoint: string): number
  listSubscriptions(): StoredSubscription[]
  markAlerted(endpoint: string): void
  close(): void
}

interface SubscriptionRow {
  endpoint: string
  p256dh: string
  auth: string
  lng: number
  lat: number
  created_at: string
  updated_at: string
  last_alerted_at: string | null
}

export function createRainAlertDatabase(dbPath: string): RainAlertDatabase {
  mkdirSync(dirname(dbPath), { recursive: true })

  const database = new Database(dbPath)
  database.pragma('journal_mode = WAL')
  database.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      endpoint TEXT PRIMARY KEY,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      lng REAL NOT NULL,
      lat REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_alerted_at TEXT
    )
  `)

  const upsertStatement = database.prepare(`
    INSERT INTO subscriptions (
      endpoint,
      p256dh,
      auth,
      lng,
      lat,
      created_at,
      updated_at
    ) VALUES (
      @endpoint,
      @p256dh,
      @auth,
      @lng,
      @lat,
      @created_at,
      @updated_at
    )
    ON CONFLICT(endpoint) DO UPDATE SET
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      lng = excluded.lng,
      lat = excluded.lat,
      updated_at = excluded.updated_at
  `)

  const deleteStatement = database.prepare('DELETE FROM subscriptions WHERE endpoint = ?')
  const listStatement = database.prepare('SELECT endpoint, p256dh, auth, lng, lat, created_at, updated_at, last_alerted_at FROM subscriptions ORDER BY updated_at DESC')
  const markAlertedStatement = database.prepare('UPDATE subscriptions SET last_alerted_at = ? WHERE endpoint = ?')

  return {
    upsertSubscription(subscription, location) {
      const now = new Date().toISOString()
      upsertStatement.run({
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        lng: location.lng,
        lat: location.lat,
        created_at: now,
        updated_at: now,
      })
    },
    deleteSubscription(endpoint) {
      return deleteStatement.run(endpoint).changes
    },
    listSubscriptions() {
      return (listStatement.all() as SubscriptionRow[]).map((row) => ({
        endpoint: row.endpoint,
        p256dh: row.p256dh,
        auth: row.auth,
        lng: row.lng,
        lat: row.lat,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastAlertedAt: row.last_alerted_at,
      }))
    },
    markAlerted(endpoint) {
      markAlertedStatement.run([new Date().toISOString(), endpoint])
    },
    close() {
      database.close()
    },
  }
}