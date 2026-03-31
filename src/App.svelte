<script lang="ts">
  import CurrentWeather from './components/CurrentWeather.svelte'
  import HourlyForecast from './components/HourlyForecast.svelte'
  import DailyForecast from './components/DailyForecast.svelte'
  import { fetchRealtime, fetchHourly, fetchDaily } from './lib/weather-api'
  import { saveCache, loadCache, formatCacheAge, isCacheFresh } from './lib/storage'
  import { transformRealtime, transformHourly, transformDaily } from './lib/transform'
  import type { WeatherViewState } from './lib/types'

  type Phase = 'locating' | 'loading' | 'ready' | 'error'

  let phase = $state<Phase>('locating')
  let weather = $state<WeatherViewState | null>(null)
  let cacheAge = $state<string | null>(null)
  let errorMsg = $state('')

  const isLoading = $derived(phase === 'locating' || phase === 'loading')

  async function loadWeather() {
    // Use fresh cache to avoid burning API quota during development
    const cached = loadCache()
    if (isCacheFresh() && cached) {
      weather = {
        current: transformRealtime(cached.data.realtime),
        hourly: transformHourly(cached.data.hourly),
        daily: transformDaily(cached.data.daily),
      }
      cacheAge = formatCacheAge(cached.ts)
      phase = 'ready'
      return
    }

    phase = 'locating'
    cacheAge = null
    errorMsg = ''

    let lng: number
    let lat: number

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 300000,
        })
      })
      lng = pos.coords.longitude
      lat = pos.coords.latitude
    } catch (err) {
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
        errorMsg =
          err instanceof GeolocationPositionError && err.code === err.PERMISSION_DENIED
            ? '请允许位置权限后刷新页面'
            : '定位失败，请检查位置权限'
        phase = 'error'
      }
      return
    }

    phase = 'loading'
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

  $effect(() => {
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
      <button
        type="button"
        class="refresh"
        aria-label="刷新天气"
        disabled={isLoading}
        onclick={loadWeather}
      >{isLoading ? '···' : '刷新'}</button>
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
      {#if cacheAge}
        <p class="cache-notice">离线数据 · {cacheAge}</p>
      {/if}
      <CurrentWeather weather={weather.current} />
      <HourlyForecast items={weather.hourly} />
      <DailyForecast items={weather.daily} />
    {/if}
  </div>
</main>

<style>
  .app-shell {
    position: relative;
    min-height: 100dvh;
    padding: clamp(16px, 3vw, 28px);
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

  @keyframes drift {
    from {
      transform: translate3d(-2%, -1%, 0) scale(1);
    }
    to {
      transform: translate3d(2%, 1%, 0) scale(1.05);
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
