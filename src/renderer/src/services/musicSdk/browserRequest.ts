/**
 * 浏览器版 HTTP 请求层
 *
 * 替代主进程的 request.js，使用 fetch() 替代 axios。
 * CapacitorHttp 启用后，fetch() 会自动走原生 HTTP，绕过 CORS。
 */

// 浏览器版 Buffer 替代工具
const bufferUtils = {
  from(data: string | Uint8Array | ArrayBuffer, encoding?: string): Uint8Array {
    if (data instanceof Uint8Array) return data
    if (data instanceof ArrayBuffer) return new Uint8Array(data)
    if (typeof data === 'string') {
      if (encoding === 'hex') {
        const bytes = new Uint8Array(data.length / 2)
        for (let i = 0; i < data.length; i += 2) {
          bytes[i / 2] = parseInt(data.substr(i, 2), 16)
        }
        return bytes
      }
      if (encoding === 'base64') {
        const binary = atob(data)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        return bytes
      }
      // 默认 UTF-8
      return new TextEncoder().encode(data)
    }
    return new Uint8Array()
  },

  toString(bytes: Uint8Array, encoding?: string): string {
    if (encoding === 'hex') {
      return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
    }
    if (encoding === 'base64') {
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      return btoa(binary)
    }
    // 默认 UTF-8
    return new TextDecoder().decode(bytes)
  }
}

// 浏览器版 zlib 替代（deflateRaw）
const zlibUtils = {
  async deflateRaw(data: Uint8Array): Promise<Uint8Array> {
    // 使用 CompressionStream API（如果可用）
    if (typeof CompressionStream !== 'undefined') {
      const cs = new CompressionStream('deflate')
      const writer = cs.writable.getWriter()
      const reader = cs.readable.getReader()

      writer.write(data)
      writer.close()

      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }

      // 合并 chunks
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }
      return result
    }

    // 如果 CompressionStream 不可用，返回原始数据（签名会失败，但不影响基本功能）
    console.warn('[browserRequest] CompressionStream 不可用，跳过 deflateRaw')
    return data
  }
}

export interface FetchOptions {
  method?: 'get' | 'post' | 'put' | 'delete' | 'patch'
  headers?: Record<string, string>
  body?: string | Uint8Array | FormData | URLSearchParams
  form?: Record<string, any>
  json?: any
  timeout?: number
  signal?: AbortSignal
  responseType?: 'json' | 'text' | 'arraybuffer'
}

export interface FetchResponse {
  statusCode: number
  headers: Record<string, string>
  body: any
}

export interface HttpFetchResult {
  promise: Promise<FetchResponse>
  cancelHttp: () => void
}

/**
 * 主请求函数，兼容主进程 httpFetch 的返回格式
 */
export function httpFetch(url: string, options: FetchOptions = {}): HttpFetchResult {
  const controller = new AbortController()
  const timeout = options.timeout || 30000

  const promise = (async (): Promise<FetchResponse> => {
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...options.headers
      }

      let body: string | Uint8Array | FormData | URLSearchParams | undefined

      if (options.json !== undefined) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json'
        body = JSON.stringify(options.json)
      } else if (options.form) {
        // 处理表单数据
        const formData = new URLSearchParams()
        for (const [key, value] of Object.entries(options.form)) {
          if (value instanceof Uint8Array) {
            // 二进制数据转 base64
            formData.set(key, bufferUtils.toString(value, 'base64'))
          } else if (typeof value === 'object') {
            formData.set(key, JSON.stringify(value))
          } else {
            formData.set(key, String(value))
          }
        }
        body = formData
        headers['Content-Type'] = headers['Content-Type'] || 'application/x-www-form-urlencoded'
      } else {
        body = options.body
      }

      const response = await fetch(url, {
        method: (options.method || 'get').toUpperCase(),
        headers,
        body,
        signal: options.signal || controller.signal
      })

      clearTimeout(timeoutId)

      // 收集响应头
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value
      })

      // 根据 responseType 解析响应体
      let responseBody: any
      const contentType = response.headers.get('content-type') || ''

      if (options.responseType === 'arraybuffer') {
        const buffer = await response.arrayBuffer()
        responseBody = bufferUtils.from(buffer)
      } else if (contentType.includes('application/json') || options.responseType === 'json') {
        try {
          responseBody = await response.json()
        } catch {
          responseBody = await response.text()
        }
      } else {
        responseBody = await response.text()
      }

      return {
        statusCode: response.status,
        headers: responseHeaders,
        body: responseBody
      }
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('请求超时')
      }
      throw error
    }
  })()

  return {
    promise,
    cancelHttp: () => controller.abort()
  }
}

/**
 * 简化版 fetch，直接返回 Promise
 */
export async function simpleFetch(url: string, options: FetchOptions = {}): Promise<FetchResponse> {
  return httpFetch(url, options).promise
}

// 导出 bufferUtils 供音乐源模块使用
export { bufferUtils, zlibUtils }
