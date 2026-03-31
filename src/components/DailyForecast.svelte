<script lang="ts">
  import { skyconToIcon } from '../lib/weather-icons'
  import type { DailyForecastViewItem } from '../lib/types'

  let { items }: { items: DailyForecastViewItem[] } = $props()
</script>

<section class="card daily">
  <header class="section-head">
    <h2>近 3 天</h2>
  </header>

  <div class="daily__list" role="list" aria-label="未来三天预报">
    {#each items as item}
      <article class="day" role="listitem">
        <p class="date">{item.dateLabel}</p>
        <p class="sky">{skyconToIcon(item.skycon)} {item.skyLabel}</p>
        <p class="temp-range"><span>{item.max}°</span> / {item.min}°</p>
      </article>
    {/each}
  </div>
</section>

<style>
  .daily {
    display: grid;
    gap: var(--space-md);
  }

  .section-head h2 {
    font-size: 1rem;
    letter-spacing: 0.04em;
  }

  .daily__list {
    display: grid;
    gap: var(--space-sm);
  }

  .day {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    border: 1px solid rgb(255 255 255 / 8%);
    background: rgb(255 255 255 / 4%);
  }

  .date {
    font-weight: 600;
  }

  .sky {
    color: var(--color-text-muted);
    font-size: 0.86rem;
  }

  .temp-range {
    font-variant-numeric: tabular-nums;
    font-family: var(--font-display);
  }

  .temp-range span {
    font-weight: 700;
  }
</style>
