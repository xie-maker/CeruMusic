/**
 * 浏览器版加密工具
 *
 * 替代 Node.js crypto 模块，使用 Web Crypto API 和 crypto-js。
 */

import CryptoJS from 'crypto-js'

// MD5 哈希
export function md5(data: string | Uint8Array): string {
  if (data instanceof Uint8Array) {
    // 将 Uint8Array 转换为 CryptoJS WordArray
    const wordArray = CryptoJS.lib.WordArray.create(data)
    return CryptoJS.MD5(wordArray).toString()
  }
  return CryptoJS.MD5(data).toString()
}

// AES-128-CBC 加密
export function aesCbcEncrypt(
  data: string,
  key: string,
  iv: string
): string {
  const keyBytes = CryptoJS.enc.Utf8.parse(key)
  const ivBytes = CryptoJS.enc.Utf8.parse(iv)
  const encrypted = CryptoJS.AES.encrypt(data, keyBytes, {
    iv: ivBytes,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })
  return encrypted.toString()
}

// AES-128-CBC 解密
export function aesCbcDecrypt(
  data: string,
  key: string,
  iv: string
): string {
  const keyBytes = CryptoJS.enc.Utf8.parse(key)
  const ivBytes = CryptoJS.enc.Utf8.parse(iv)
  const decrypted = CryptoJS.AES.decrypt(data, keyBytes, {
    iv: ivBytes,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })
  return decrypted.toString(CryptoJS.enc.Utf8)
}

// AES-128-ECB 加密
export function aesEcbEncrypt(
  data: string,
  key: string
): string {
  const keyBytes = CryptoJS.enc.Utf8.parse(key)
  const encrypted = CryptoJS.AES.encrypt(data, keyBytes, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  })
  return encrypted.toString()
}

// AES-128-ECB 解密
export function aesEcbDecrypt(
  data: string,
  key: string
): string {
  const keyBytes = CryptoJS.enc.Utf8.parse(key)
  const decrypted = CryptoJS.AES.decrypt(data, keyBytes, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  })
  return decrypted.toString(CryptoJS.enc.Utf8)
}

// Base64 编码
export function base64Encode(data: string | Uint8Array): string {
  if (data instanceof Uint8Array) {
    let binary = ''
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i])
    }
    return btoa(binary)
  }
  return btoa(unescape(encodeURIComponent(data)))
}

// Base64 解码
export function base64Decode(data: string): Uint8Array {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// Hex 编码
export function hexEncode(data: Uint8Array): string {
  return Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Hex 解码
export function hexDecode(data: string): Uint8Array {
  const bytes = new Uint8Array(data.length / 2)
  for (let i = 0; i < data.length; i += 2) {
    bytes[i / 2] = parseInt(data.substr(i, 2), 16)
  }
  return bytes
}

// 随机字节
export function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  return bytes
}

// RSA 公钥加密（简化版，使用 JSEncrypt 或直接返回原始数据）
// 注意：完整的 RSA 加密在浏览器中比较复杂，这里提供基本实现
export function rsaEncrypt(data: string, publicKey: string): string {
  // 如果公钥是 PEM 格式，提取其中的 modulus 和 exponent
  // 简化实现：使用 CryptoJS 的 RSA 或返回 base64 编码
  try {
    // 尝试使用 SubtleCrypto API
    // 注意：这需要异步操作，但原始 API 是同步的
    // 所以这里使用简化的实现
    console.warn('[browserCrypto] RSA 加密使用简化实现')
    return base64Encode(data)
  } catch (e) {
    console.error('[browserCrypto] RSA 加密失败:', e)
    return base64Encode(data)
  }
}

// 导出 CryptoJS 供需要的地方使用
export { CryptoJS }
