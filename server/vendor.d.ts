declare module 'better-sqlite3' {
  interface RunResult {
    changes: number
  }

  interface Statement {
    run(parameters?: unknown): RunResult
    all(): unknown[]
  }

  export default class Database {
    constructor(path: string)
    pragma(statement: string): void
    exec(sql: string): void
    prepare(sql: string): Statement
    close(): void
  }
}

declare module 'web-push' {
  interface PushSubscription {
    endpoint: string
    expirationTime: number | null
    keys: {
      p256dh: string
      auth: string
    }
  }

  interface SendNotificationOptions {
    proxy?: string
  }

  interface WebPush {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void
    sendNotification(subscription: PushSubscription, payload?: string, options?: SendNotificationOptions): Promise<void>
  }

  const webpush: WebPush
  export default webpush
}