const ONE_HOUR_MS = 60 * 60 * 1000

function msUntilNextHour(now: Date): number {
  const next = new Date(now)
  next.setMinutes(0, 0, 0)
  next.setHours(next.getHours() + 1)
  return next.getTime() - now.getTime()
}

export interface SchedulerHandle {
  stop(): void
}

export function startHourlyScheduler(task: () => Promise<void>): SchedulerHandle {
  let intervalId: NodeJS.Timeout | undefined
  let timeoutId: NodeJS.Timeout | undefined

  const runTask = () => {
    void task().catch((error) => {
      console.error('[rain-alert] scheduled run failed', error)
    })
  }

  timeoutId = setTimeout(() => {
    runTask()
    intervalId = setInterval(runTask, ONE_HOUR_MS)
  }, msUntilNextHour(new Date()))

  return {
    stop() {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (intervalId) {
        clearInterval(intervalId)
      }
    },
  }
}