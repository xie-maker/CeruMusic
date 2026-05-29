/**
 * Node.js crypto 模块的浏览器兼容 shim
 *
 * 提供与 Node.js crypto 相同的 API，底层使用 browserCrypto。
 */

import { md5, aesCbcEncrypt, aesCbcDecrypt, aesEcbEncrypt, aesEcbDecrypt, randomBytes, base64Encode, base64Decode } from './browserCrypto'

// createHash
export function createHash(algorithm: string) {
  return {
    update(data: string | Uint8Array) {
      return {
        digest(encoding?: string) {
          const hash = md5(data)
          if (encoding === 'hex') return hash
          if (encoding === 'base64') return base64Encode(hash)
          return hash
        }
      }
    }
  }
}

// createCipheriv
export function createCipheriv(algorithm: string, key: string | Uint8Array, iv: string | Uint8Array | null) {
  const keyStr = typeof key === 'string' ? key : new TextDecoder().decode(key)
  const ivStr = iv ? (typeof iv === 'string' ? iv : new TextDecoder().decode(iv)) : ''

  return {
    update(data: string, inputEncoding?: string, outputEncoding?: string) {
      const encrypted = algorithm.includes('ecb')
        ? aesEcbEncrypt(data, keyStr)
        : aesCbcEncrypt(data, keyStr, ivStr)
      return outputEncoding === 'hex' ? encrypted : base64Encode(encrypted)
    },
    final(outputEncoding?: string) {
      return ''
    }
  }
}

// createDecipheriv
export function createDecipheriv(algorithm: string, key: string | Uint8Array, iv: string | Uint8Array | null) {
  const keyStr = typeof key === 'string' ? key : new TextDecoder().decode(key)
  const ivStr = iv ? (typeof iv === 'string' ? iv : new TextDecoder().decode(iv)) : ''

  return {
    update(data: string, inputEncoding?: string, outputEncoding?: string) {
      const decrypted = algorithm.includes('ecb')
        ? aesEcbDecrypt(data, keyStr)
        : aesCbcDecrypt(data, keyStr, ivStr)
      return outputEncoding === 'utf8' ? decrypted : decrypted
    },
    final(outputEncoding?: string) {
      return ''
    }
  }
}

// publicEncrypt（简化版）
export function publicEncrypt(publicKey: string | Buffer, data: Buffer | Uint8Array) {
  console.warn('[cryptoShim] publicEncrypt 使用简化实现')
  return data
}

// randomBytes
export { randomBytes }

// 默认导出
export default {
  createHash,
  createCipheriv,
  createDecipheriv,
  publicEncrypt,
  randomBytes,
  md5
}
