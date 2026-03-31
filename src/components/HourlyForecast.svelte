<script lang="ts">
  import { skyconToIcon } from '../lib/weather-icons'
  import type { HourlyForecastViewItem } from '../lib/types'

  let { items }: { items: HourlyForecastViewItem[] } = $props()
</script>

<section class="card hourly">
  <header class="section-head">
    <h2>小时预报</h2>
    <p>未来 24 小时</p>
  </header>

  <div class="hourly__scroll" role="list" aria-label="小时预报">
    {#each items as item}
      <article class="hour" role="listitem">
        <p class="time">{item.time}</p>
        <p class="icon" aria-hidden="true">{skyconToIcon(item.skycon)}</p>
        <p class="temp">{item.temperature}°</p>
        <p class="sky">{item.skyLabel}</p>
      </article>
    {/each}
  </div>
</section>

<style>
  .hourly {
    display: grid;
    gap: var(--space-md);
  }

  .section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .section-head h2 {
    font-size: 1rem;
    letter-spacing: 0.04em;
  }

  .section-head p {
    font-size: 0.78rem;
    color: var(--color-text-muted);
  }

  .hourly__scroll {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(74px, 82px);
    gap: var(--space-sm);
    overflow-x: auto;
    padding-bottom: var(--space-xs);
    scrollbar-width: thin;
  }

  .hour {
    background: linear-gradient(180deg, rgb(255 255 255 / 8%), rgb(255 255 255 / 2%));
    border: 1px solid rgb(255 255 255 / 10%);
    border-radius: var(--radius-md);
    padding: 10px 8px;
    text-align: center;
    display: grid;
    gap: 4px;
    animation: rise-in 0.5s ease both;
  }

  .time {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .icon {
    font-size: 1.1rem;
  }

  .temp {
    font-family: var(--font-display);
    font-size: 1.25rem;
    line-height: 1;
    letter-spacing: -0.02em;
  }

  .sky {
    font-size: 0.73rem;
    color: var(--color-text-muted);
  }

  @keyframes rise-in {
    from {
      transform: translateY(10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>
