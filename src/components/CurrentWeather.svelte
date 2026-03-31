<script lang="ts">
  import { skyconToIcon } from '../lib/weather-icons'
  import type { CurrentWeatherView } from '../lib/types'

  let { weather }: { weather: CurrentWeatherView } = $props()
</script>

<section class="current card">
  <div class="current__top">
    <p class="location">{weather.location}</p>
    <p class="updated">更新于 {weather.updatedAt}</p>
  </div>

  <div class="hero">
    <div class="hero__icon" aria-hidden="true">{skyconToIcon(weather.skycon)}</div>
    <div>
      <p class="temperature">{weather.temperature}°</p>
      <p class="sky">{weather.skyLabel}</p>
    </div>
  </div>

  <div class="metrics">
    <article>
      <p class="label">体感</p>
      <p class="value">{weather.apparentTemperature}°</p>
    </article>
    <article>
      <p class="label">湿度</p>
      <p class="value">{Math.round(weather.humidity * 100)}%</p>
    </article>
    <article>
      <p class="label">风速</p>
      <p class="value">{weather.windDirection} {weather.windSpeed.toFixed(1)}m/s</p>
    </article>
  </div>
</section>

<style>
  .current {
    display: grid;
    gap: var(--space-lg);
  }

  .current__top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-md);
  }

  .location {
    font-size: 1.05rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .updated {
    color: var(--color-text-muted);
    font-size: 0.8rem;
  }

  .hero {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  .hero__icon {
    font-size: clamp(2.4rem, 8vw, 3.2rem);
    filter: drop-shadow(0 8px 18px rgb(0 0 0 / 28%));
  }

  .temperature {
    font-size: clamp(2.8rem, 12vw, 4rem);
    line-height: 0.95;
    font-weight: 700;
    font-family: var(--font-display);
    letter-spacing: -0.03em;
  }

  .sky {
    margin-top: var(--space-xs);
    color: var(--color-text-muted);
    font-size: 0.95rem;
  }

  .metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-sm);
  }

  .metrics article {
    background: rgb(255 255 255 / 4%);
    border: 1px solid rgb(255 255 255 / 8%);
    border-radius: var(--radius-md);
    padding: var(--space-sm);
    backdrop-filter: blur(10px);
  }

  .label {
    color: var(--color-text-muted);
    font-size: 0.75rem;
  }

  .value {
    margin-top: 6px;
    font-size: 0.9rem;
    font-weight: 600;
  }
</style>
