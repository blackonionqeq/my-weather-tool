# my-weather-tool

个人天气查询 PWA，替代手机自带天气 App，核心卖点是彩云天气的小时级预报精度，并支持基于服务端 Web Push 的降雨提醒。

## 核心功能

- 当前天气、未来 48 小时预报、近 3 天预报
- 优先使用缓存坐标，减少首次打开等待时间
- 离线时回退到本地缓存天气数据
- 通过 VAPID Web Push 接收即将下雨提醒

## 技术栈

| 层级 | 工具 | 版本要求 |
|------|------|----------|
| 包管理 | pnpm | >= 9 |
| 构建 | Vite | >= 6 |
| UI 框架 | Svelte | >= 5 |
| 语言 | TypeScript | >= 5.5 |
| PWA | vite-plugin-pwa (Workbox) | latest |
| 服务端运行时 | Node.js (ESM) | >= 20 |
| 服务端数据库 | better-sqlite3 | >= 12 |
| Web Push | web-push (VAPID) | >= 3 |

> 这是一个 Vite + Svelte 单页应用，不使用 SvelteKit。

## 快速开始

```bash
pnpm install
pnpm dev:app
```

前端默认运行在 `http://localhost:5173`。

如果要联调降雨提醒服务，再启动服务端：

```bash
pnpm dev:server
```

服务端默认监听 `http://127.0.0.1:8787`。

## 常用命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 等同 dev:app，启动前端开发服务器
pnpm dev:app          # 前端开发（http://localhost:5173）
pnpm dev:server       # 服务端开发（tsx watch，端口 8787）
pnpm build            # 生产构建（前端 + 服务端）
pnpm build:app        # 仅构建前端
pnpm build:server     # 仅构建服务端
pnpm preview          # 本地预览生产前端产物
pnpm server:start     # 启动生产服务端（需先 build:server）
pnpm server:check     # 手动触发一次降雨检查
```

## 本地开发

开发环境通常需要下面这些环境变量：

- `VITE_CAIYUN_TOKEN`: 前端开发代理使用的彩云 token
- `VITE_RAIN_ALERT_SERVER_ORIGIN`: 本地开发时雨提醒服务地址，默认 `http://127.0.0.1:8787`
- `CAIYUN_TOKEN`: 服务端天气拉取使用的彩云 token
- `VAPID_PUBLIC_KEY`: Web Push 公钥
- `VAPID_PRIVATE_KEY`: Web Push 私钥
- `VAPID_SUBJECT`: VAPID subject，推荐 `mailto:you@example.com`
- `RAIN_ALERT_DB_PATH`: SQLite 文件路径，例如 `./data/rain-alert.sqlite`
- `RAIN_ALERT_PORT`: 服务端监听端口，默认 `8787`

详细配置见 [docs/rain-alert-push-setup.md](docs/rain-alert-push-setup.md)。

## Web Push 降雨提醒

当前版本的降雨提醒由 Node.js 服务端按小时调度：

1. 前端向服务端注册 `PushSubscription`
2. 服务端把订阅和坐标写入 SQLite
3. 调度器按坐标分组请求彩云天气
4. 命中“当前未下雨、下一小时将下雨”的条件后发送 Web Push
5. Service Worker 接收 push 并展示通知

服务端接口：

```text
GET    /api/rain-alert/public-key
POST   /api/rain-alert/subscriptions
DELETE /api/rain-alert/subscriptions
```

部署和 VAPID 配置见 [docs/rain-alert-push-setup.md](docs/rain-alert-push-setup.md)。

## 项目结构

```text
my-weather-tool/
├── src/            # 前端应用（Vite + Svelte）
├── server/         # 雨提醒 Node.js 服务端
├── shared/         # 前后端共享类型和纯函数
├── public/         # manifest 和图标等静态资源
├── deploy/nginx/   # 生产代理配置
└── docs/           # 设计和部署文档
```

## 相关文档

- [docs/rain-alert-push-setup.md](docs/rain-alert-push-setup.md)：Web Push 本地和部署配置
- [docs/superpowers/specs/2026-04-06-rain-alert-design.md](docs/superpowers/specs/2026-04-06-rain-alert-design.md)：降雨提醒设计稿
