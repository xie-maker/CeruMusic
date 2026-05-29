import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.cerumusic.app',
  appName: '澜音',
  webDir: 'out/renderer',
  server: {
    // 启用 CapacitorHttp，绕过 CORS 限制
    // 音乐 SDK 的 HTTP 请求可以直接在 WebView 中运行
    androidScheme: 'https'
  },
  android: {
    // 允许混合内容（http/https）
    allowMixedContent: true,
    // 覆盖导航行为
    overrideUserAgent: 'CeruMusic Android',
    // 深层链接配置
    pathPrefix: ''
  },
  plugins: {
    // CapacitorHttp 配置
    CapacitorHttp: {
      enabled: true
    }
  }
}

export default config
