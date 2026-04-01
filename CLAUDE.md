# CLAUDE.md — my-weather-tool

个人天气查询 PWA，替代手机自带天气 App，核心卖点是彩云天气的小时级预报精度。

---

## 技术栈

| 层级 | 工具 | 版本要求 |
|------|------|----------|
| 包管理 | pnpm | ≥ 9 |
| 构建 | Vite | ≥ 6 |
| UI 框架 | Svelte | ≥ 5 |
| 语言 | TypeScript | ≥ 5.5 |
| PWA | vite-plugin-pwa (Workbox) | latest |

> **不使用 SvelteKit**：这是单页应用，不需要文件路由和 SSR。用 `@sveltejs/vite-plugin-svelte` 直接集成 Vite。

---

## 常用命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 本地开发（http://localhost:5173）
pnpm build            # 生产构建
pnpm preview          # 本地预览生产包（验证 PWA/SW）
```

---

## 项目结构

```
my-weather-tool/
├── src/
│   ├── main.ts                    # 入口：注册 SW，挂载 App
│   ├── App.svelte                 # 根组件：定位流程 + 页面组装
│   ├── components/
│   │   ├── CurrentWeather.svelte  # 当前天气区块
│   │   ├── HourlyForecast.svelte  # 小时预报横向列表（核心）
│   │   └── DailyForecast.svelte   # 近 3 天预报
│   ├── lib/
│   │   ├── weather-api.ts         # 彩云 API 封装（3 个接口，token 由服务端注入）
│   │   ├── types.ts               # API 响应 TypeScript 类型定义
│   │   └── storage.ts             # localStorage 缓存读写
│   └── styles/
│       └── global.css             # CSS 变量 + 全局样式
├── deploy/
│   └── nginx/
│       └── caiyun-proxy.conf      # Nginx 反向代理配置（include 到主配置）
├── public/
│   ├── manifest.json              # PWA manifest
│   └── icons/                     # 各尺寸 App 图标
├── index.html
├── vite.config.ts
├── tsconfig.json
└── CLAUDE.md
```

---

## 数据源：彩云天气 API

**Base URL：** `https://api.caiyunapp.com/v2.6/{token}/{lng},{lat}`

| 接口 | 路径 | 用途 |
|------|------|------|
| 实况 | `/realtime` | 当前温度、体感、湿度、风速 |
| 小时预报 | `/hourly?hourlysteps=48` | 未来 48h（核心功能）|
| 天预报 | `/daily?dailysteps=3` | 近 3 天高低温 |

**API Key（服务端代理，前端不持有 token）：**
- **生产环境：** Nginx 反向代理注入 token，配置见 `deploy/nginx/caiyun-proxy.conf`
- **开发环境：** Vite dev proxy 从 `.env` 读取 `VITE_CAIYUN_TOKEN`，在 rewrite 阶段注入
- `.env` 加入 `.gitignore`，**严禁提交 key**
- 前端代码统一请求 `/api/caiyun/{lng},{lat}/endpoint`，不接触 token

**三个接口并发调用：**
```ts
const [realtime, hourly, daily] = await Promise.all([
  fetchRealtime(lng, lat),
  fetchHourly(lng, lat),
  fetchDaily(lng, lat),
]);
```

---

## 地理位置

```ts
navigator.geolocation.getCurrentPosition(
  (pos) => { /* 成功：拿到 lat/lng */ },
  (err) => { /* 失败：展示友好提示，尝试读取缓存 */ },
  { timeout: 10000, maximumAge: 300000 }
);
```

- 必须 HTTPS（本地 dev 用 localhost 豁免）
- 权限拒绝时展示明确提示，不静默失败

---

## 离线与缓存策略

**静态资源（HTML/CSS/JS）：** Cache First（由 vite-plugin-pwa 自动处理）

**天气数据：** Network First
- 请求成功 → 存 localStorage，记录时间戳
- 请求失败/离线 → 读 localStorage 缓存，界面标注"数据来自 xx 时间"

**localStorage key 约定：**
```
weather:cache         # JSON，包含 realtime/hourly/daily 数据
weather:cache:ts      # 时间戳，ISO 字符串
```

---

## PWA 配置要点

**manifest.json** 关键字段：
```json
{
  "name": "天气",
  "short_name": "天气",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "start_url": "/"
}
```

**vite.config.ts** 中 `vite-plugin-pwa`：
- `registerType: 'autoUpdate'`
- `workbox.runtimeCaching` 不缓存彩云 API 请求（由应用层 localStorage 管理）

---

## CSS 规范

- 使用原生 CSS 变量（`:root` 定义）
- 使用原生 CSS 嵌套（现代浏览器原生支持，无需预处理器）
- 移动端优先（默认样式适配手机）
- 颜色主题：深色为主（天气 App 惯例）

---

## TypeScript 规范

- `types.ts` 中为彩云 API 的所有响应结构定义 interface
- 组件 props 用 `$props()` rune（Svelte 5 语法）
- 避免 `any`，API 响应用 `unknown` + 类型守卫或 as 断言

---

## 开发阶段

| Phase | 内容 | 状态 |
|-------|------|------|
| 1 | 静态页面 + 布局 + 假数据渲染 | ✅ 已完成 |
| 2 | 接入定位 + 彩云 API | ✅ 已完成 |
| 3 | vite-plugin-pwa + manifest，完成 PWA 化 | ✅ 已完成 |
| 4 | Nginx 反向代理隐藏 API key | ✅ 已完成 |

---

## 初始化命令（首次 setup）

```bash
pnpm create vite . --template svelte-ts
pnpm install
pnpm add -D vite-plugin-pwa
```
