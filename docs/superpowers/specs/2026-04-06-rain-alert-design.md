# 后台降雨提醒 — 设计文档

**Date:** 2026-04-06  
**Status:** Design approved, pending implementation planning

---

## 背景与目标

为天气 PWA 增加后台降雨提醒功能：应用在后台定期检查天气，当检测到「当前非雨天但下一小时即将下雨」时，向用户推送本地通知，提醒携带雨具。

**核心场景：** 手机桌面安装的 PWA 即使不在前台，也能定期检查天气并提醒用户即将下雨。

---

## 技术方案选型

### 采用方案：纯客户端（Periodic Background Sync + 本地通知）

| 维度 | 说明 |
|------|------|
| 后台调度 | Periodic Background Sync API（Service Worker） |
| 通知 | Notification API（本地通知，无需推送服务器） |
| 服务端改动 | 无 |
| 浏览器兼容 | Chromium 系（Chrome / Edge / Samsung Browser） |
| 频率 | 请求 1h 间隔，实际由浏览器根据站点互动频率决定 |

**选择理由：**
- 个人项目，主要在 Android Chrome 使用，兼容性满足需求
- 零后端新增成本，现有 Nginx 代理即可
- 用户坐标不离开设备，隐私友好
- "带伞提醒"对时效性容忍度高，偶尔延迟可接受

### 未来升级路径：服务端推送（方案 B）

如果纯客户端频率不够可靠，可迁移到 Web Push 服务端推送：

1. **VAPID 密钥对**：用 `web-push` npm 包生成公私钥
2. **前端改造**：用 VAPID 公钥创建 `PushSubscription`，上传给后端
3. **后端服务**：
   - 存储 `{ subscription, lng, lat }` 到 SQLite / JSON 文件
   - cron 每小时遍历用户 → 拉彩云 API → 判断降雨 → `webpush.sendNotification()`
4. **SW 改造**：监听 `push` 事件替代 `periodicsync` 事件
5. **优势**：浏览器关闭也能收到通知；频率完全可控；跨浏览器兼容（含 Safari 16.4+）

---

## 架构设计

### 整体流程

```
用户点击 🔔 开启"降雨提醒"
       │
       ├─→ 请求 Notification 权限
       │      ├─ 授权 → 继续
       │      └─ 拒绝 → 显示提示，终止
       │
       ├─→ 注册 Periodic Background Sync
       │      tag: "rain-check"
       │      minInterval: 3600000 (1h)
       │
       └─→ 存储偏好 + 坐标到 Cache API（供 SW 读取）
```

```
浏览器后台唤醒 Service Worker (periodicsync 事件)
       │
       ├─→ 从 Cache API 读取坐标 { lng, lat }
       │      └─ 无坐标 → 静默退出
       │
       ├─→ 并发请求 realtime + hourly API
       │      └─ 请求失败 → 静默退出
       │
       ├─→ 降雨判定：当前非雨 AND 下一小时是雨？
       │      ├─ 否 → 静默退出
       │      └─ 是 → 推送本地通知
       │
       └─→ self.registration.showNotification(...)
```

### 数据共享：主线程 ↔ Service Worker

**问题：** Service Worker 无法访问 `localStorage`，而坐标当前存储在 localStorage 中。

**方案：** 使用 Cache API 共享数据。主线程在保存坐标时，同步写入 Cache API：

```ts
// 写入（主线程）
const cache = await caches.open('rain-alert');
await cache.put(
  new Request('/_rain-alert-config'),
  new Response(JSON.stringify({ lng, lat, enabled: true }))
);

// 读取（Service Worker）
const cache = await caches.open('rain-alert');
const resp = await cache.match('/_rain-alert-config');
const config = resp ? await resp.json() : null;
```

**优势：** 无需引入 IndexedDB 或第三方库，Cache API 在主线程和 SW 中都可用。

**过期策略：** 每次主线程保存坐标时（启动 / 📍 刷新定位），同步刷新 Cache API 中的配置。
配置不设过期时间——坐标变化时自然被覆盖，关闭提醒时清除 entry。

---

## 降雨判定逻辑

### 规则

- **触发条件：** 当前实况 skycon 不是雨 AND 小时预报中下一小时 skycon 是雨
- **雨的定义：** skycon ∈ `['LIGHT_RAIN', 'MODERATE_RAIN', 'HEAVY_RAIN', 'STORM_RAIN']`
- **不含雪：** 暂不处理雪的提醒（可后续扩展）
- **防重复：** 逻辑天然防重复——只在"非雨→雨"转换时触发。如果持续下雨，当前 skycon 是雨，条件不满足。晴→雨→晴→雨 的场景会触发两次，符合预期。

### 实现

新建 `src/lib/rain-check.ts`：

```ts
const RAIN_SKYCONS = ['LIGHT_RAIN', 'MODERATE_RAIN', 'HEAVY_RAIN', 'STORM_RAIN'];

export function isRain(skycon: string): boolean {
  return RAIN_SKYCONS.includes(skycon);
}

export function shouldAlertRain(currentSkycon: string, nextHourSkycon: string): boolean {
  return !isRain(currentSkycon) && isRain(nextHourSkycon);
}
```

此模块纯函数，可在主线程和 SW 中复用。

---

## Service Worker 改造

### 从 generateSW 迁移到 injectManifest

**当前：** vite-plugin-pwa 使用默认 `generateSW` 策略，自动生成 SW，不支持自定义逻辑。

**改造：** 切换到 `injectManifest` 策略，手写 SW 文件：

**vite.config.ts 变更：**
```ts
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.ts',
  registerType: 'autoUpdate',
  // ...其余配置不变
})
```

**新建 `src/sw.ts`：**
```ts
/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Workbox 预缓存（vite-plugin-pwa 注入 manifest）
precacheAndRoute(self.__WB_MANIFEST);

// --- Periodic Background Sync: 降雨检查 ---
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'rain-check') {
    event.waitUntil(checkRainAndNotify());
  }
});

async function checkRainAndNotify(): Promise<void> {
  // 1. 从 Cache API 读取配置
  const cache = await caches.open('rain-alert');
  const resp = await cache.match('/_rain-alert-config');
  if (!resp) return;
  const { lng, lat, enabled } = await resp.json();
  if (!enabled) return;

  // 2. 并发请求 realtime + hourly
  try {
    const [realtimeResp, hourlyResp] = await Promise.all([
      fetch(`/api/caiyun/${lng},${lat}/realtime`),
      fetch(`/api/caiyun/${lng},${lat}/hourly?hourlysteps=2`),
    ]);
    if (!realtimeResp.ok || !hourlyResp.ok) return;

    const realtime = await realtimeResp.json();
    const hourly = await hourlyResp.json();

    // 3. 提取 skycon
    const currentSkycon: string = realtime.result?.realtime?.skycon ?? '';
    const nextHourSkycon: string = hourly.result?.hourly?.skycon?.[1]?.value ?? '';

    // 4. 判定 & 通知
    if (shouldAlertRain(currentSkycon, nextHourSkycon)) {
      await self.registration.showNotification('🌧️ 即将下雨', {
        body: '未来一小时预计有雨，记得带伞！',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'rain-alert', // 相同 tag 的通知会替换而非叠加
      });
    }
  } catch {
    // 网络失败，静默退出
  }
}

// 降雨判定（内联，避免 SW 中 import 问题）
const RAIN_SKYCONS = ['LIGHT_RAIN', 'MODERATE_RAIN', 'HEAVY_RAIN', 'STORM_RAIN'];

function shouldAlertRain(current: string, nextHour: string): boolean {
  return !RAIN_SKYCONS.includes(current) && RAIN_SKYCONS.includes(nextHour);
}

// 通知点击：打开应用
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
```

> **注意：** vite-plugin-pwa 的 `injectManifest` 模式下 Vite 会完整打包 SW 文件，`import` 语法可正常使用。
> 此处为简化示例故内联展示，实现时可直接 `import { shouldAlertRain } from './lib/rain-check'`。

---

## UI 设计

### 🔔 降雨提醒开关

**位置：** 顶部栏，与现有 📍 定位按钮同行，靠左侧放置。

**交互流程：**

```
用户点击 🔔
    │
    ├─ 当前未开启：
    │   ├─ 检查 Notification.permission
    │   │   ├─ "default" → requestPermission()
    │   │   │   ├─ granted → 注册 periodicSync → 存偏好 → 图标变为激活态
    │   │   │   └─ denied → 显示 toast "通知权限被拒绝，无法开启提醒"
    │   │   ├─ "granted" → 直接注册 periodicSync → 存偏好 → 图标变为激活态
    │   │   └─ "denied" → 显示 toast "请在浏览器设置中允许通知"
    │   │
    │
    └─ 当前已开启：
        └─ 注销 periodicSync → 清除偏好 → 图标变为未激活态
```

**视觉状态：**
- 未激活：🔔 灰色/半透明
- 已激活：🔔 高亮（accent color）
- 不支持（浏览器无 periodicSync）：隐藏按钮

### 偏好存储

- `localStorage` key `weather:rain-alert`：`"on"` / `"off"`（主线程快速读取 UI 状态）
- Cache API `rain-alert` / `_rain-alert-config`：`{ lng, lat, enabled }`（SW 读取）

---

## 文件改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/sw.ts` | **新建** | 自定义 Service Worker：预缓存 + periodicsync 降雨检查 + notificationclick |
| `src/lib/rain-check.ts` | **新建** | 降雨判定纯函数（主线程可 import） |
| `vite.config.ts` | **修改** | PWA 策略 `generateSW` → `injectManifest`，指向 `src/sw.ts` |
| `src/lib/storage.ts` | **修改** | 新增 Cache API 函数：`saveRainAlertConfig(lng, lat, enabled)` / `loadRainAlertConfig()` / `clearRainAlertConfig()` + 偏好读写 `saveRainAlertPref(on)` / `loadRainAlertPref()` |
| `src/App.svelte` | **修改** | 增加 🔔 开关按钮 + 注册/注销 periodic sync 逻辑 |
| `src/main.ts` | **修改** | SW 注册方式适配 injectManifest：添加 `import { registerSW } from 'virtual:pwa-register'; registerSW({ immediate: true });` |

---

## 浏览器兼容性

| API | Chrome | Edge | Firefox | Safari |
|-----|--------|------|---------|--------|
| Periodic Background Sync | ✅ 80+ | ✅ 80+ | ❌ | ❌ |
| Notification API | ✅ | ✅ | ✅ | ✅ 16.4+ |
| Cache API | ✅ | ✅ | ✅ | ✅ |

**降级策略：** 在不支持 `periodicSync` 的浏览器中，🔔 按钮不显示。功能检测：

```ts
const supportsPeriodicSync = 'periodicSync' in ServiceWorkerRegistration.prototype;
```

---

## 测试要点

1. **降雨判定逻辑单元测试**：覆盖 晴→雨、雨→雨、雨→晴、晴→晴 四种组合
2. **手动触发 periodic sync**：Chrome DevTools → Application → Service Workers → Periodic Sync → `rain-check`
3. **通知展示**：确认通知标题、正文、图标正确
4. **通知点击**：确认点击通知能打开/聚焦应用
5. **权限拒绝**：确认 UI 给出正确提示
6. **无坐标**：确认 SW 静默退出不报错
7. **网络失败**：确认 SW 静默退出不报错
