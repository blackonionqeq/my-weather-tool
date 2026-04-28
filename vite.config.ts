import { defineConfig, loadEnv } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    server: {
      host: true, // 允许局域网访问
      proxy: {
        '/api/caiyun': {
          target: 'https://api.caiyunapp.com',
          changeOrigin: true,
          secure: true,
          // 模拟 Nginx 行为：注入 token 到上游路径
          rewrite: (path) => path.replace(/^\/api\/caiyun/, `/v2.6/${env.VITE_CAIYUN_TOKEN}`),
        },
        '/api/rain-alert': {
          target: env.VITE_RAIN_ALERT_SERVER_ORIGIN || 'http://127.0.0.1:8787',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      basicSsl(),
      svelte(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        manifest: false, // 使用 public/manifest.json
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        },
      }),
    ],
  }
})
