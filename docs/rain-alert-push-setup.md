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

这条路径适合日常页面开发，但不适合调试推送链路。`PushManager`、`push` 事件和 `notificationclick` 都依赖真实的 Service Worker 生命周期，联调时应使用 `build + preview`。

## 本地联调推送

1. 填好 `.env`，尤其是 `CAIYUN_TOKEN`、`VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`RAIN_ALERT_DB_PATH`。
2. 启动服务端：

```bash
pnpm run dev:server
```

3. 构建前端：

```bash
pnpm run build:app
```

4. 启动前端预览：

```bash
pnpm run preview
```

5. 打开 `https://localhost:4173`。
6. 在浏览器开发者工具的 Application 面板确认 Service Worker 已注册并激活。
7. 在页面中打开降雨提醒，允许通知权限。
8. 终端手动触发一次服务端检查：

```bash
pnpm run server:check
```

9. 观察浏览器是否收到通知，并验证点击通知后能返回应用。

## Preview 与 HTTPS

- 当前项目启用了 `@vitejs/plugin-basic-ssl`，它会同时给 Vite dev server 和 preview server 注入自签名证书。
- 因此 `pnpm run preview` 时，默认可以通过 `https://localhost:4173` 访问。
- 证书是自签名的，浏览器首次访问时通常会提示不受信任；接受本地证书后再继续。
- 在 `localhost` 上调试 Service Worker 和 Push 是可行的；如果切到局域网 IP 或真机访问，需要额外处理 HTTPS 证书信任问题。

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