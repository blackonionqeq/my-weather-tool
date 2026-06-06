# QWeather Minutely Rain Design

**Date:** 2026-06-06
**Status:** Approved for implementation

## Goal

Add an on-demand short-term rain view to the weather PWA. The current Caiyun integration remains the main source for current, hourly, and daily weather. QWeather is used only when the user taps a button to inspect the next two hours of precipitation.

## Data Source

Use QWeather's 5-minute minutely precipitation API:

```text
GET {QWEATHER_API_HOST}/v7/minutely/5m?location={lng},{lat}&key={QWEATHER_API_KEY}
```

Required server environment variables:

```text
QWEATHER_API_HOST=https://<qweather-assigned-api-host>
QWEATHER_API_KEY=<qweather-key>
```

The key must stay server-side. The frontend calls the local API only.

## Server API

Add:

```text
GET /api/qweather/minutely?lng={lng}&lat={lat}
```

The server validates longitude and latitude, calls QWeather, and returns a normalized response:

```ts
{
  updateTime: string
  summary: string
  items: Array<{
    fxTime: string
    precip: number
    type: string
  }>
}
```

If QWeather returns a non-200 code or an unexpected payload, the server returns a JSON error.

## Frontend Behavior

Add a "短时降水" button near the existing header actions. It is disabled while weather is loading or while the minutely request is in flight.

When clicked:

1. Use the last saved/current location.
2. Open a modal immediately.
3. Show a loading state while the API request is pending.
4. Render the returned summary and a 24-bar precipitation chart.

The chart uses time on the horizontal axis and precipitation amount as bar height. Zero values still render as small baseline bars so the two-hour range remains visible. The modal includes a close button and can be dismissed by clicking the backdrop.

## Error Handling

- Missing location: ask the user to relocate first.
- Server/API failure: keep the modal open and show a concise error message.
- All-zero precipitation: show the QWeather summary and a flat chart.

## Validation

- Run `pnpm run typecheck:server` for server changes.
- Run `pnpm build:app` for frontend changes.
- Manually test with the configured QWeather host/key and verify `/api/qweather/minutely` returns 24 items.
