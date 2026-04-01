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
      },
    },
    plugins: [
      basicSsl(),
      svelte(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: false, // 使用 public/manifest.json
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            // 不缓存彩云 API，由应用层 localStorage 管理
          ],
          navigateFallback: 'index.html',
        },
      }),
    ],
  }
})
