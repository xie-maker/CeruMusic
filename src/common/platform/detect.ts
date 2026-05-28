/**
 * 平台检测 — 运行时判断当前环境
 */

export type Platform = 'electron' | 'capacitor' | 'web'

export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'web'

  // Electron 环境：preload 注入了 window.api
  if ((window as any).api?.music?.requestSdk) return 'electron'

  // Capacitor 环境：Capacitor 运行时存在
  if ((window as any).Capacitor) return 'capacitor'

  return 'web'
}
