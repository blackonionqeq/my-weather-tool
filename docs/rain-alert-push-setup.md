# Rain Alert Push Setup

## 环境变量

复制 `.env.example` 到你自己的本地环境文件，并提供下面这些值：

- `VITE_CAIYUN_TOKEN`: 前端开发代理使用的彩云 token
- `VITE_RAIN_ALERT_SERVER_ORIGIN`: 本地开发时雨提醒服务地址，默认 `http://127.0.0.1:8787`
- `CAIYUN_TOKEN`: 服务端定时检查天气使用的彩云 token
- `VAPID_PUBLIC_KEY`: Web Push 公钥
- `VAPID_PRIVATE_KEY`: Web Push 私钥
- `VAPID_SUBJECT`: VAPID subject，推荐 `mailto:you@example.com`
- `RAIN_ALERT_DB_PATH`: SQLite 文件路径，例如 `./data/rain-alert.sqlite`
- `RAIN_ALERT_PORT`: 轻服务监听端口，默认 `8787`

## 生成 VAPID 密钥

```bash
pnpm exec web-push generate-vapid-keys
```

把输出的 public/private key 分别写入 `VAPID_PUBLIC_KEY` 和 `VAPID_PRIVATE_KEY`。

## 本地开发

前端：

```bash
pnpm run dev:app
```

服务端：

```bash
pnpm run dev:server
```

前端会通过 Vite 代理把 `/api/rain-alert/*` 转发到 `VITE_RAIN_ALERT_SERVER_ORIGIN`。

## 手动触发一次降雨检查

```bash
pnpm run server:check
```

这个命令会读取 SQLite 中已有订阅，按坐标去重请求彩云，并向命中的订阅发送 push。

## 构建

```bash
pnpm run build
```

前端产物输出到 `dist/`，服务端输出到 `dist-server/`。

## 首次安装 `better-sqlite3`

如果本地已经在允许构建脚本前执行过 `pnpm install`，需要补一次：

```bash
pnpm rebuild better-sqlite3
```

之后再启动 `pnpm run dev:server` 或 `pnpm run server:start`。