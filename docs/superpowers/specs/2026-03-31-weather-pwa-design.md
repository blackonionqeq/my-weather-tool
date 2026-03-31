# Weather PWA — Design Spec

**Date:** 2026-03-31
**Status:** Brainstorming complete, pending implementation planning

---

## 背景与目标

个人自用的天气查询 PWA，解决现有手机天气 App（小米自带）预报不准的痛点。重点在于**小时级预报的精准度**，数据源切换为彩云天气 API。可安装到手机桌面，作为日常使用的轻量工具。

---

## 核心功能范围（MVP）

- 自动 GPS 定位（`navigator.geolocation`），无手动城市搜索
- 当前天气：温度、天气状况、体感温度、湿度、风速
- 小时预报：未来 24~48h 逐小时温度 + 天气状况（核心功能）
- 天预报：未来 2~3 天高低温 + 天气状况（补充参考）
- PWA 可安装（Service Worker + Web App Manifest）
- 离线降级：展示上次缓存的天气数据

**不在范围内（暂不实现）：**
- 手动搜索城市
- 紫外线、能见度、AQI 等扩展指标
- 多城市管理
- 通知/提醒

---

## 数据源

**彩云天气 API**（付费按量版，1 万次/年）

| 接口 | 用途 |
|------|------|
| `/v2/weather/realtime` | 当前天气 |
| `/v2/weather/hourly` | 小时级预报（最长 48h） |
| `/v2/weather/daily` | 天级预报（取前 3 天） |

入参：经纬度（`longitude,latitude`），无需城市名。

---

## API Key 策略（分阶段）

**阶段一（开发/测试）：** 免费 key 直接写在前端环境变量，暴露可接受。

**阶段二（正式使用）：** 服务器轻量代理方案：
- 前端调自己服务器的代理接口
- 服务器持有付费 key，调彩云后转发响应
- 配合彩云控制台域名白名单
- 可用 Serverless Function（如 Vercel/Cloudflare Workers）实现，几乎零维护成本

> 注：非对称加解密方案在客户端持有解密逻辑的情况下无法真正保护 key，代理方案更简单且有效。

---

## 技术架构

**纯前端 PWA**，无构建工具依赖（或极轻量构建）。

```
my-weather-tool/
├── index.html           # 入口，极简信息流布局
├── app.js               # 主逻辑：定位 → 请求 → 渲染
├── weather-api.js       # 彩云 API 封装
├── sw.js                # Service Worker：缓存 shell + 数据
├── manifest.json        # PWA manifest
└── styles.css           # 极简样式
```

**数据流：**
1. 页面加载 → 请求地理位置权限
2. 拿到经纬度 → 并发调彩云三个接口（realtime / hourly / daily）
3. 渲染页面：当前天气区块 + 小时预报横向列表 + 天预报列表
4. 数据存入 localStorage（离线降级用）
5. Service Worker 缓存静态资源 shell

---

## UI 布局（极简信息流）

```
┌─────────────────────────┐
│  [城市/定位名]  [刷新]   │
│                         │
│  🌤  23°C               │
│  体感 21°C  湿度 65%    │
│  东南风 3级             │
│                         │
│  ─── 小时预报 ───       │
│  现在  14:00  15:00 ... │
│  23°   24°    25°  ...  │
│  🌤    ⛅     🌧   ...  │
│                         │
│  ─── 近3天 ───          │
│  今天   25° / 18°  🌤   │
│  明天   22° / 16°  🌧   │
│  后天   20° / 15°  ⛅   │
└─────────────────────────┘
```

---

## 关键技术点

**地理位置：** `navigator.geolocation.getCurrentPosition()`，HTTPS 下可用，PWA 安装后同样有效。权限拒绝时展示友好提示。

**Service Worker 策略：**
- 静态资源（HTML/CSS/JS）：Cache First
- 天气数据：Network First，失败时降级展示 localStorage 缓存数据，标注数据时间戳

**PWA 安装条件：** HTTPS + manifest.json + Service Worker 注册，满足后浏览器自动触发"添加到主屏幕"提示。

---

## 开发阶段规划

1. **Phase 1**：静态页面 + 布局 + 假数据渲染
2. **Phase 2**：接入定位 + 彩云 API（免费 key），跑通数据流
3. **Phase 3**：Service Worker + manifest，完成 PWA 化
4. **Phase 4**（可选）：服务器代理方案替换 key 处理方式

---

## 待办（Backlog）

- [ ] 评估并确定生产环境代理层方案（Vercel Functions / Cloudflare Workers / 其他）
- [ ] 明确代理层目标：解决 CORS、隐藏 token/secret、支持后续 JWT 签名认证
- [ ] 补充迁移方案：从本地 Vite 代理切换到线上代理时的环境变量与路由改造清单
