/**
 * 平台服务入口 — 单例访问器
 *
 * 用法：
 *   import { getPlatformService } from '@common/platform'
 *   const platform = getPlatformService()
 *   const result = await platform.music.requestSdk('search', { source: 'wy', keyword: 'xxx' })
 */

import { detectPlatform, type Platform } from './detect'
import type { PlatformService } from './types'

let service: PlatformService | null = null
let detectedPlatform: Platform | null = null

/**
 * 获取平台服务单例
 * 首次调用时自动检测平台并创建对应实现
 */
export function getPlatformService(): PlatformService {
  if (service) return service

  detectedPlatform = detectPlatform()

  switch (detectedPlatform) {
    case 'electron': {
      // Electron 环境：委托给 window.api（preload 注入）
      const { ElectronPlatform } = require('./electron/ElectronPlatform')
      service = new ElectronPlatform()
      break
    }
    case 'capacitor': {
      // Capacitor 环境：委托给 Capacitor 原生插件
      const { CapacitorPlatform } = require('./capacitor/CapacitorPlatform')
      service = new CapacitorPlatform()
      break
    }
    default: {
      // Web/其他环境：空实现
      const { StubPlatform } = require('./stub/StubPlatform')
      service = new StubPlatform()
      break
    }
  }

  return service!
}

/**
 * 获取当前检测到的平台类型
 */
export function getCurrentPlatform(): Platform {
  if (!detectedPlatform) {
    detectedPlatform = detectPlatform()
  }
  return detectedPlatform
}

/**
 * 重置单例（仅用于测试）
 */
export function resetPlatformService(): void {
  service = null
  detectedPlatform = null
}

export type { PlatformService } from './types'
export type { Platform } from './detect'
