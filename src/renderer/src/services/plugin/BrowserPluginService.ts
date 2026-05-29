/**
 * 浏览器版插件服务
 *
 * 替代主进程的 pluginService，使用 Web Worker 沙箱运行插件。
 */

export interface PluginInfo {
  id: string
  name: string
  version: string
  author: string
  description?: string
  type: 'lx' | 'cr'
}

export interface PluginSource {
  name: string
  qualities: string[]
  [key: string]: any
}

export interface PluginInstance {
  info: PluginInfo
  sources: Record<string, PluginSource>
  worker: Worker | null
  code: string
}

// 已加载的插件
const loadedPlugins = new Map<string, PluginInstance>()

// 事件监听器
const listeners = {
  onPluginNotice: new Set<(data: any) => void>(),
  onPluginThrottle: new Set<(data: any) => void>(),
  onPluginDisabled: new Set<(data: any) => void>()
}

/**
 * 从 URL 加载插件代码
 */
async function fetchPluginCode(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`下载插件失败: ${response.status}`)
  }
  return response.text()
}

/**
 * 验证插件代码格式
 */
function validatePluginCode(code: string, type: 'lx' | 'cr'): boolean {
  const lowerCode = code.toLowerCase()
  if (type === 'cr') {
    return lowerCode.includes('cerumusic')
  }
  return lowerCode.includes('lx')
}

/**
 * 创建插件 Worker
 */
function createPluginWorker(pluginId: string, code: string): Worker {
  // 创建 Worker 代码包装
  const workerCode = `
    // 插件 API
    const cerumusic = {
      env: 'browser',
      version: '1.0.0',
      utils: {
        buffer: {
          from: (data, enc) => {
            if (typeof data === 'string') {
              if (enc === 'hex') {
                const bytes = new Uint8Array(data.length / 2);
                for (let i = 0; i < data.length; i += 2) {
                  bytes[i / 2] = parseInt(data.substr(i, 2), 16);
                }
                return bytes;
              }
              if (enc === 'base64') {
                const binary = atob(data);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                  bytes[i] = binary.charCodeAt(i);
                }
                return bytes;
              }
              return new TextEncoder().encode(data);
            }
            return new Uint8Array(data);
          },
          bufToString: (buf, enc) => {
            if (enc === 'hex') {
              return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
            }
            if (enc === 'base64') {
              let binary = '';
              for (let i = 0; i < buf.length; i++) {
                binary += String.fromCharCode(buf[i]);
              }
              return btoa(binary);
            }
            return new TextDecoder().decode(buf);
          }
        },
        crypto: {
          md5: (data) => {
            // 简化的 MD5（实际应使用 crypto-js）
            let hash = 0;
            for (let i = 0; i < data.length; i++) {
              const char = data.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash;
            }
            return Math.abs(hash).toString(16).padStart(8, '0');
          }
        }
      },
      request: async (url, options = {}) => {
        try {
          const response = await fetch(url, {
            method: options.method || 'GET',
            headers: options.headers || {},
            body: options.body || options.form
          });
          const body = await response.text();
          return {
            statusCode: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body
          };
        } catch (error) {
          throw new Error('请求失败: ' + error.message);
        }
      }
    };

    // 沙箱环境
    const sandbox = {
      cerumusic,
      console: { log: console.log, warn: console.warn, error: console.error },
      setTimeout, clearTimeout, setInterval, clearInterval,
      JSON, Math, Date, URL, URLSearchParams,
      TextEncoder, TextDecoder, Promise, Uint8Array, ArrayBuffer,
      Response, Request, Headers, fetch: fetch.bind(self),
      btoa, atob, escape, unescape
    };

    // 加载插件代码
    try {
      ${code}

      // 通知主线程插件已加载
      self.postMessage({ type: 'loaded', pluginId: '${pluginId}' });
    } catch (error) {
      self.postMessage({ type: 'error', pluginId: '${pluginId}', error: error.message });
    }

    // 监听主线程消息
    self.onmessage = async (e) => {
      const { type, method, args, callId } = e.data;

      if (type === 'invoke') {
        try {
          // 调用插件方法
          const result = await globalThis[method](...args);
          self.postMessage({ type: 'result', callId, result });
        } catch (error) {
          self.postMessage({ type: 'error', callId, error: error.message });
        }
      }
    };
  `

  const blob = new Blob([workerCode], { type: 'application/javascript' })
  const url = URL.createObjectURL(blob)
  return new Worker(url)
}

/**
 * 加载插件
 */
export async function loadPlugin(
  source: string | { url?: string; code?: string; name?: string },
  type: 'lx' | 'cr' = 'cr'
): Promise<PluginInfo> {
  let code: string
  let name = 'Unknown Plugin'

  if (typeof source === 'string') {
    // URL
    code = await fetchPluginCode(source)
    name = new URL(source).pathname.split('/').pop() || name
  } else if (source.url) {
    code = await fetchPluginCode(source.url)
    name = source.name || name
  } else if (source.code) {
    code = source.code
    name = source.name || name
  } else {
    throw new Error('无效的插件来源')
  }

  // 验证插件格式
  if (!validatePluginCode(code, type)) {
    throw new Error(`${type === 'cr' ? '澜音' : '洛雪'}插件格式校验失败`)
  }

  // 生成插件 ID
  const pluginId = `plugin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // 创建 Worker
  const worker = createPluginWorker(pluginId, code)

  // 等待插件加载
  const info = await new Promise<PluginInfo>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('插件加载超时')), 10000)

    worker.onmessage = (e) => {
      if (e.data.type === 'loaded') {
        clearTimeout(timeout)
        resolve({
          id: pluginId,
          name,
          version: '1.0.0',
          author: 'Unknown',
          type
        })
      } else if (e.data.type === 'error') {
        clearTimeout(timeout)
        reject(new Error(e.data.error))
      }
    }
  })

  // 存储插件实例
  loadedPlugins.set(pluginId, {
    info,
    sources: {},
    worker,
    code
  })

  return info
}

/**
 * 调用插件方法
 */
export async function invokePlugin(
  pluginId: string,
  method: string,
  ...args: any[]
): Promise<any> {
  const plugin = loadedPlugins.get(pluginId)
  if (!plugin || !plugin.worker) {
    throw new Error(`插件未加载: ${pluginId}`)
  }

  return new Promise((resolve, reject) => {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timeout = setTimeout(() => reject(new Error('插件调用超时')), 30000)

    const handler = (e: MessageEvent) => {
      if (e.data.callId === callId) {
        clearTimeout(timeout)
        plugin.worker!.removeEventListener('message', handler)

        if (e.data.type === 'result') {
          resolve(e.data.result)
        } else if (e.data.type === 'error') {
          reject(new Error(e.data.error))
        }
      }
    }

    plugin.worker!.addEventListener('message', handler)
    plugin.worker!.postMessage({ type: 'invoke', method, args, callId })
  })
}

/**
 * 卸载插件
 */
export function unloadPlugin(pluginId: string): void {
  const plugin = loadedPlugins.get(pluginId)
  if (plugin) {
    plugin.worker?.terminate()
    loadedPlugins.delete(pluginId)
  }
}

/**
 * 获取已加载的插件列表
 */
export function getLoadedPlugins(): PluginInfo[] {
  return Array.from(loadedPlugins.values()).map(p => p.info)
}

/**
 * 获取插件信息
 */
export function getPluginInfo(pluginId: string): PluginInfo | null {
  return loadedPlugins.get(pluginId)?.info || null
}

// 事件监听
export function onPluginNotice(listener: (data: any) => void): () => void {
  listeners.onPluginNotice.add(listener)
  return () => listeners.onPluginNotice.delete(listener)
}

export function onPluginThrottle(listener: (data: any) => void): () => void {
  listeners.onPluginThrottle.add(listener)
  return () => listeners.onPluginThrottle.delete(listener)
}

export function onPluginDisabled(listener: (data: any) => void): () => void {
  listeners.onPluginDisabled.add(listener)
  return () => listeners.onPluginDisabled.delete(listener)
}

/**
 * 浏览器版插件服务入口
 */
export const browserPluginService = {
  loadPlugin,
  invokePlugin,
  unloadPlugin,
  getLoadedPlugins,
  getPluginInfo,
  onPluginNotice,
  onPluginThrottle,
  onPluginDisabled
}
