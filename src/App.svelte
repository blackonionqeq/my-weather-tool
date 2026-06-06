<script lang="ts">
  import CurrentWeather from './components/CurrentWeather.svelte'
  import HourlyForecast from './components/HourlyForecast.svelte'
  import DailyForecast from './components/DailyForecast.svelte'
  import { fetchRealtime, fetchHourly, fetchDaily, fetchMinutelyRain } from './lib/weather-api'
  import { saveCache, loadCache, formatCacheAge, saveLocation, loadLocation, saveRainAlertPref, loadRainAlertPref } from './lib/storage'
  import {
    deleteRainAlertSubscription,
    getOrCreatePushSubscription,
    saveRainAlertSubscription,
  } from './lib/rain-alert-client'
  import { transformRealtime, transformHourly, transformDaily } from './lib/transform'
  import type { MinutelyRainResult, WeatherViewState } from './lib/types'

  type Phase = 'locating' | 'loading' | 'ready' | 'error'

  let phase = $state<Phase>('locating')
  let weather = $state<WeatherViewState | null>(null)
  let cacheAge = $state<string | null>(null)
  let errorMsg = $state('')
  let gpsError = $state('')
  let currentLocation = $state<{ lng: number; lat: number } | null>(loadLocation())

  const isLoading = $derived(phase === 'locating' || phase === 'loading')

  // --- 降雨提醒 ---
  let rainAlertOn = $state(loadRainAlertPref())
  let rainAlertSupported = $state(false)
  let rainAlertBusy = $state(false)

  // --- 短时降水 ---
  let minutelyOpen = $state(false)
  let minutelyLoading = $state(false)
  let minutelyRain = $state<MinutelyRainResult | null>(null)
  let minutelyError = $state('')
  const minutelyMaxPrecip = $derived(
    minutelyRain ? Math.max(0.1, ...minutelyRain.items.map((item) => item.precip)) : 0.1,
  )

  function checkRainAlertSupport(): boolean {
    return 'serviceWorker' in navigator
      && 'Notification' in window
      && 'PushManager' in window
  }

  function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback
  }

  async function requestCurrentLocation(): Promise<{ lng: number; lat: number }> {
    if (!navigator.geolocation) {
      throw new Error('当前环境不支持定位 (可能因为未开启 HTTPS)')
    }

    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: Infinity,
        maximumAge: 0,
        enableHighAccuracy: true,
      })
    })

    const location = {
      lng: pos.coords.longitude,
      lat: pos.coords.latitude,
    }
    saveLocation(location.lng, location.lat)
    currentLocation = location
    return location
  }

  async function getRainAlertLocation(): Promise<{ lng: number; lat: number }> {
    return loadLocation() ?? requestCurrentLocation()
  }

  async function syncRainAlertLocation(lng: number, lat: number): Promise<void> {
    const reg = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.getSubscription()
    if (!subscription) {
      throw new Error('未找到有效的推送订阅，请重新开启降雨提醒')
    }

    await saveRainAlertSubscription(subscription, lng, lat)
  }

  async function toggleRainAlert() {
    if (rainAlertBusy) return

    rainAlertBusy = true
    gpsError = ''

    try {
      if (rainAlertOn) {
        const reg = await navigator.serviceWorker.ready
        const subscription = await reg.pushManager.getSubscription()
        if (subscription) {
          await deleteRainAlertSubscription(subscription)
          await subscription.unsubscribe()
        }

        rainAlertOn = false
        saveRainAlertPref(false)
        return
      }

      const perm = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()
      if (perm !== 'granted') {
        throw new Error('通知权限被拒绝，无法开启降雨提醒')
      }

      const reg = await navigator.serviceWorker.ready
      const subscription = await getOrCreatePushSubscription(reg)
      const loc = await getRainAlertLocation()
      await saveRainAlertSubscription(subscription, loc.lng, loc.lat)

      rainAlertOn = true
      saveRainAlertPref(true)
    } catch (error) {
      gpsError = getErrorMessage(error, '降雨提醒设置失败')
    } finally {
      rainAlertBusy = false
    }
  }

  async function fetchWeatherData(lng: number, lat: number) {
    phase = 'loading'
    currentLocation = { lng, lat }
    try {
      const [realtime, hourly, daily] = await Promise.all([
        fetchRealtime(lng, lat),
        fetchHourly(lng, lat),
        fetchDaily(lng, lat),
      ])
      saveCache({ realtime, hourly, daily })
      weather = {
        current: transformRealtime(realtime),
        hourly: transformHourly(hourly),
        daily: transformDaily(daily),
      }
      cacheAge = null
      phase = 'ready'
    } catch {
      const cached = loadCache()
      if (cached) {
        weather = {
          current: transformRealtime(cached.data.realtime),
          hourly: transformHourly(cached.data.hourly),
          daily: transformDaily(cached.data.daily),
        }
        cacheAge = formatCacheAge(cached.ts)
        phase = 'ready'
      } else {
        errorMsg = '网络请求失败，暂无缓存数据'
        phase = 'error'
      }
    }
  }

  async function doGps() {
    gpsError = ''
    phase = 'locating'

    try {
      const location = await requestCurrentLocation()
      await fetchWeatherData(location.lng, location.lat)

      if (rainAlertOn) {
        try {
          await syncRainAlertLocation(location.lng, location.lat)
        } catch (error) {
          gpsError = getErrorMessage(error, '位置已更新，但降雨提醒同步失败')
        }
      }
      return
    } catch (err: any) {
      let msg = err.message || '定位失败'
      if (err instanceof GeolocationPositionError) {
        if (err.code === err.PERMISSION_DENIED) msg = '请允许位置权限后重试'
        if (err.code === err.POSITION_UNAVAILABLE) msg = '位置信息不可用'
        if (err.code === err.TIMEOUT) msg = '获取位置超时'
      }

      const cached = loadCache()
      if (cached) {
        if (!weather) {
          weather = {
            current: transformRealtime(cached.data.realtime),
            hourly: transformHourly(cached.data.hourly),
            daily: transformDaily(cached.data.daily),
          }
          cacheAge = formatCacheAge(cached.ts)
        }
        gpsError = msg
        phase = 'ready'
      } else {
        errorMsg = msg
        phase = 'error'
      }
    }
  }

  async function relocate() {
    if (isLoading) return
    await doGps()
  }

  function formatMinutelyTime(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value.slice(11, 16)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  async function openMinutelyRain() {
    if (minutelyLoading || isLoading) return

    const location = currentLocation ?? loadLocation()
    minutelyOpen = true
    minutelyRain = null
    minutelyError = ''

    if (!location) {
      minutelyError = '还没有可用位置，请先重新定位'
      return
    }

    minutelyLoading = true
    try {
      minutelyRain = await fetchMinutelyRain(location.lng, location.lat)
    } catch (error) {
      minutelyError = getErrorMessage(error, '短时降水查询失败')
    } finally {
      minutelyLoading = false
    }
  }

  function closeMinutelyRain() {
    if (minutelyLoading) return
    minutelyOpen = false
  }

  async function loadWeather() {
    const loc = loadLocation()
    if (loc) {
      currentLocation = loc
      await fetchWeatherData(loc.lng, loc.lat)
    } else {
      await doGps()
    }
  }

  $effect(() => {
    rainAlertSupported = checkRainAlertSupport()
    loadWeather()
  })
</script>

<main class="app-shell">
  <section class="ambient" aria-hidden="true"></section>

  <div class="weather-app">
    <header class="app-header">
      <div>
        <p class="app-title">MY WEATHER</p>
        <p class="app-subtitle">小时级天气预报</p>
      </div>
      <div class="header-actions">
        {#if rainAlertSupported}
          <button
            type="button"
            class="rain-alert-btn"
            class:active={rainAlertOn}
            aria-label={rainAlertOn ? '关闭降雨提醒' : '开启降雨提醒'}
            disabled={rainAlertBusy}
            onclick={toggleRainAlert}
          >🔔</button>
        {/if}
        <button
          type="button"
          class="minutely-btn"
          aria-label="查询近两小时降水"
          disabled={isLoading || minutelyLoading}
          onclick={openMinutelyRain}
        >
          {#if minutelyLoading}
            <span class="btn-spinner" aria-hidden="true"></span>
          {:else}
            <span aria-hidden="true">☔</span>
          {/if}
          <span>短时降水</span>
        </button>
        <button
          type="button"
          class="refresh"
          aria-label="重新定位"
          disabled={isLoading}
          onclick={relocate}
        >{isLoading ? '···' : '📍'}</button>
      </div>
    </header>

    {#if phase === 'error'}
      <div class="card status-card">
        <p class="status-icon">⚠️</p>
        <p class="status-text">{errorMsg}</p>
      </div>
    {:else if !weather}
      <div class="card status-card">
        <p class="status-icon">{phase === 'locating' ? '📍' : '🌐'}</p>
        <p class="status-text">{phase === 'locating' ? '正在获取位置…' : '正在加载天气…'}</p>
      </div>
    {:else}
      {#if gpsError}
        <p class="gps-error">📍 {gpsError}</p>
      {/if}
      {#if cacheAge}
        <p class="cache-notice">离线数据 · {cacheAge}</p>
      {/if}
      <CurrentWeather weather={weather.current} />
      <HourlyForecast items={weather.hourly} />
      <DailyForecast items={weather.daily} />
    {/if}
  </div>

  {#if minutelyOpen}
    <button
      type="button"
      class="modal-backdrop"
      aria-label="关闭短时降水弹框"
      disabled={minutelyLoading}
      onclick={closeMinutelyRain}
    ></button>
    <dialog
      class="rain-modal"
      aria-labelledby="minutely-title"
      open
    >
      <header class="rain-modal__header">
        <div>
          <h2 id="minutely-title">近两小时降水</h2>
          <p>
            {#if minutelyRain}
              更新于 {formatMinutelyTime(minutelyRain.updateTime)}
            {:else if minutelyLoading}
              正在查询和风天气
            {:else}
              短时降水预报
            {/if}
          </p>
        </div>
        <button
          type="button"
          class="modal-close"
          aria-label="关闭短时降水弹框"
          disabled={minutelyLoading}
          onclick={closeMinutelyRain}
        >×</button>
      </header>

      {#if minutelyLoading}
        <div class="rain-loading" aria-live="polite">
          <span class="rain-loader" aria-hidden="true"></span>
          <p>正在加载短时降水...</p>
          <div class="chart-skeleton" aria-hidden="true">
            {#each Array.from({ length: 24 }) as _, index}
              <span style={`height: ${18 + ((index * 11) % 44)}%`}></span>
            {/each}
          </div>
        </div>
      {:else if minutelyError}
        <div class="rain-error">
          <p>{minutelyError}</p>
          <button type="button" onclick={openMinutelyRain}>重试</button>
        </div>
      {:else if minutelyRain}
        <p class="rain-summary">{minutelyRain.summary || '暂无短时降水描述'}</p>
        <div class="rain-chart" aria-label="未来两小时降水量柱状图">
          {#each minutelyRain.items as item, index}
            <div class="rain-bar" title={`${formatMinutelyTime(item.fxTime)} ${item.precip.toFixed(2)}mm`}>
              <span
                class="rain-bar__fill"
                class:wet={item.precip > 0}
                style={`height: ${Math.max(6, (item.precip / minutelyMaxPrecip) * 100)}%`}
              ></span>
              {#if index % 6 === 0}
                <span class="rain-bar__time">{formatMinutelyTime(item.fxTime)}</span>
              {/if}
            </div>
          {/each}
        </div>
        <div class="rain-scale">
          <span>0mm</span>
          <span>峰值 {Math.max(...minutelyRain.items.map((item) => item.precip)).toFixed(2)}mm</span>
        </div>
      {/if}
    </dialog>
  {/if}
</main>

<style>
  .app-shell {
    position: relative;
    min-height: 100dvh;
    padding:
      calc(env(safe-area-inset-top, 0px) + clamp(16px, 3vw, 28px))
      calc(env(safe-area-inset-right, 0px) + clamp(16px, 3vw, 28px))
      calc(env(safe-area-inset-bottom, 0px) + clamp(16px, 3vw, 28px))
      calc(env(safe-area-inset-left, 0px) + clamp(16px, 3vw, 28px));
    overflow: hidden;
  }

  .ambient {
    position: absolute;
    inset: -20%;
    background:
      radial-gradient(circle at 20% 30%, rgb(56 189 248 / 30%), transparent 40%),
      radial-gradient(circle at 80% 20%, rgb(251 146 60 / 24%), transparent 38%),
      radial-gradient(circle at 50% 90%, rgb(59 130 246 / 22%), transparent 45%);
    filter: blur(24px);
    pointer-events: none;
    animation: drift 14s ease-in-out infinite alternate;
  }

  .weather-app {
    position: relative;
    z-index: 1;
    margin: 0 auto;
    width: min(100%, 780px);
    display: grid;
    gap: var(--space-md);
  }

  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    margin-bottom: var(--space-sm);
  }

  .app-title {
    font-family: var(--font-display);
    letter-spacing: 0.15em;
    font-size: 0.86rem;
    color: var(--color-text-muted);
  }

  .app-subtitle {
    margin-top: 4px;
    font-size: 1.15rem;
    font-weight: 600;
  }

  .refresh {
    border: 1px solid rgb(255 255 255 / 14%);
    background: linear-gradient(180deg, rgb(255 255 255 / 12%), rgb(255 255 255 / 4%));
    color: var(--color-text);
    border-radius: 999px;
    padding: 8px 14px;
    font-weight: 600;
    font-size: 0.82rem;
    cursor: pointer;
    transition: transform 160ms ease, border-color 160ms ease;
  }

  .refresh:hover {
    transform: translateY(-1px);
    border-color: rgb(255 255 255 / 26%);
  }

  .refresh:disabled {
    opacity: 0.5;
    cursor: default;
    transform: none;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .rain-alert-btn {
    border: 1px solid rgb(255 255 255 / 14%);
    background: linear-gradient(180deg, rgb(255 255 255 / 12%), rgb(255 255 255 / 4%));
    border-radius: 999px;
    padding: 8px 14px;
    font-size: 0.82rem;
    cursor: pointer;
    opacity: 0.45;
    transition: transform 160ms ease, border-color 160ms ease, opacity 160ms ease;
  }

  .rain-alert-btn:hover {
    transform: translateY(-1px);
    border-color: rgb(255 255 255 / 26%);
  }

  .rain-alert-btn:disabled {
    opacity: 0.3;
    cursor: default;
    transform: none;
  }

  .rain-alert-btn.active {
    opacity: 1;
    border-color: var(--color-accent);
    box-shadow: 0 0 8px rgb(56 189 248 / 30%);
  }

  .minutely-btn {
    border: 1px solid rgb(255 255 255 / 14%);
    background: linear-gradient(180deg, rgb(255 255 255 / 12%), rgb(255 255 255 / 4%));
    color: var(--color-text);
    border-radius: 999px;
    min-height: 36px;
    padding: 8px 12px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 160ms ease, border-color 160ms ease, opacity 160ms ease;
  }

  .minutely-btn:hover {
    transform: translateY(-1px);
    border-color: rgb(255 255 255 / 26%);
  }

  .minutely-btn:disabled {
    opacity: 0.5;
    cursor: default;
    transform: none;
  }

  .btn-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgb(255 255 255 / 28%);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 760ms linear infinite;
  }

  .status-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    min-height: 180px;
    text-align: center;
  }

  .status-icon {
    font-size: 2.2rem;
  }

  .status-text {
    color: var(--color-text-muted);
    font-size: 0.95rem;
  }

  .gps-error {
    font-size: 0.78rem;
    color: rgb(251 113 133);
    text-align: center;
    padding: var(--space-xs) var(--space-sm);
    border: 1px solid rgb(251 113 133 / 25%);
    border-radius: var(--radius-sm);
    background: rgb(251 113 133 / 8%);
  }

  .cache-notice {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    text-align: center;
    padding: var(--space-xs) var(--space-sm);
    border: 1px solid rgb(255 255 255 / 8%);
    border-radius: var(--radius-sm);
    background: rgb(255 255 255 / 4%);
  }

  :global(.card) {
    border: 1px solid rgb(255 255 255 / 10%);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    background: linear-gradient(160deg, rgb(15 23 42 / 82%), rgb(30 41 59 / 80%));
    box-shadow: 0 22px 42px rgb(0 0 0 / 24%);
    backdrop-filter: blur(12px);
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 20;
    border: 0;
    padding: 0;
    background: rgb(2 6 23 / 68%);
    backdrop-filter: blur(12px);
    cursor: pointer;
    animation: fade-in 180ms ease both;
  }

  .modal-backdrop:disabled {
    cursor: default;
  }

  .rain-modal {
    position: fixed;
    right: auto;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 18px);
    left: 50%;
    z-index: 21;
    width: min(100%, 640px);
    max-height: min(78dvh, 620px);
    margin: 0;
    transform: translateX(-50%);
    overflow: auto;
    border: 1px solid rgb(255 255 255 / 14%);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    background: linear-gradient(160deg, rgb(15 23 42 / 96%), rgb(30 41 59 / 96%));
    box-shadow: 0 28px 70px rgb(0 0 0 / 42%);
    animation: modal-in-bottom 220ms ease both;
  }

  .rain-modal__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-md);
  }

  .rain-modal__header h2 {
    margin: 0;
    color: var(--color-text);
    font-size: 1.05rem;
    letter-spacing: 0.04em;
  }

  .rain-modal__header p {
    margin-top: 5px;
    color: var(--color-text-muted);
    font-size: 0.78rem;
  }

  .modal-close {
    width: 34px;
    height: 34px;
    border: 1px solid rgb(255 255 255 / 14%);
    border-radius: 50%;
    background: rgb(255 255 255 / 7%);
    color: var(--color-text);
    font-size: 1.35rem;
    line-height: 1;
    cursor: pointer;
  }

  .modal-close:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .rain-summary {
    margin-top: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    border: 1px solid rgb(56 189 248 / 20%);
    border-radius: var(--radius-md);
    background: rgb(56 189 248 / 8%);
    color: rgb(224 242 254);
    font-size: 0.92rem;
    font-weight: 600;
  }

  .rain-chart {
    position: relative;
    margin-top: var(--space-md);
    height: 230px;
    display: grid;
    grid-template-columns: repeat(24, minmax(8px, 1fr));
    gap: 5px;
    align-items: end;
    padding: 18px 4px 30px;
    border-radius: var(--radius-md);
    border: 1px solid rgb(255 255 255 / 9%);
    background:
      linear-gradient(to top, rgb(255 255 255 / 8%) 1px, transparent 1px) 0 0 / 100% 25%,
      rgb(255 255 255 / 4%);
  }

  .rain-bar {
    position: relative;
    height: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    min-width: 0;
  }

  .rain-bar__fill {
    width: 100%;
    min-height: 4px;
    border-radius: 999px 999px 4px 4px;
    background: rgb(148 163 184 / 34%);
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 18%);
    transition: height 260ms ease;
  }

  .rain-bar__fill.wet {
    background: linear-gradient(180deg, rgb(56 189 248), rgb(37 99 235));
    box-shadow: 0 0 14px rgb(56 189 248 / 34%);
  }

  .rain-bar__time {
    position: absolute;
    bottom: -24px;
    left: 50%;
    transform: translateX(-50%);
    color: var(--color-text-muted);
    font-size: 0.68rem;
    white-space: nowrap;
  }

  .rain-scale {
    display: flex;
    justify-content: space-between;
    gap: var(--space-md);
    margin-top: var(--space-xs);
    color: var(--color-text-muted);
    font-size: 0.72rem;
    font-variant-numeric: tabular-nums;
  }

  .rain-loading {
    display: grid;
    justify-items: center;
    gap: var(--space-sm);
    margin-top: var(--space-md);
    color: var(--color-text-muted);
  }

  .rain-loader {
    width: 32px;
    height: 32px;
    border: 3px solid rgb(255 255 255 / 16%);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 760ms linear infinite;
  }

  .chart-skeleton {
    width: 100%;
    height: 180px;
    display: grid;
    grid-template-columns: repeat(24, minmax(8px, 1fr));
    align-items: end;
    gap: 5px;
    margin-top: var(--space-sm);
    padding: 14px 4px;
    border-radius: var(--radius-md);
    background: rgb(255 255 255 / 4%);
    border: 1px solid rgb(255 255 255 / 8%);
  }

  .chart-skeleton span {
    border-radius: 999px 999px 4px 4px;
    background: linear-gradient(180deg, rgb(255 255 255 / 20%), rgb(255 255 255 / 6%));
    animation: pulse 980ms ease-in-out infinite alternate;
  }

  .rain-error {
    display: grid;
    justify-items: center;
    gap: var(--space-md);
    margin-top: var(--space-md);
    padding: var(--space-lg) var(--space-md);
    border: 1px solid rgb(251 113 133 / 25%);
    border-radius: var(--radius-md);
    background: rgb(251 113 133 / 8%);
    text-align: center;
  }

  .rain-error p {
    color: rgb(254 205 211);
  }

  .rain-error button {
    border: 1px solid rgb(255 255 255 / 14%);
    border-radius: 999px;
    padding: 8px 16px;
    background: rgb(255 255 255 / 9%);
    color: var(--color-text);
    cursor: pointer;
  }

  @keyframes drift {
    from {
      transform: translate3d(-2%, -1%, 0) scale(1);
    }
    to {
      transform: translate3d(2%, 1%, 0) scale(1.05);
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes modal-in-bottom {
    from {
      transform: translateX(-50%) translateY(18px) scale(0.98);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0) scale(1);
      opacity: 1;
    }
  }

  @keyframes modal-in-center {
    from {
      transform: translate(-50%, calc(-50% + 18px)) scale(0.98);
      opacity: 0;
    }
    to {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
  }

  @keyframes pulse {
    from {
      opacity: 0.42;
    }
    to {
      opacity: 0.9;
    }
  }

  @media (min-width: 700px) {
    .rain-modal {
      top: 50%;
      bottom: auto;
      transform: translate(-50%, -50%);
      animation-name: modal-in-center;
    }
  }

  @media (min-width: 900px) {
    .weather-app {
      grid-template-columns: 1.25fr 1fr;
      align-items: start;
    }

    .app-header,
    :global(.current) {
      grid-column: 1 / -1;
    }
  }
</style>
