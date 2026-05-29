/**
 * Capacitor 媒体会话服务
 *
 * 使用 @capgo/capacitor-media-session 管理安卓媒体通知。
 */

import { MediaSession } from '@capgo/capacitor-media-session'

export interface MediaMetadata {
  title: string
  artist: string
  album: string
  artworkUrl?: string
}

export type PlaybackState = 'playing' | 'paused' | 'stopped'

// 回调函数
let onPlayCallback: (() => void) | null = null
let onPauseCallback: (() => void) | null = null
let onNextTrackCallback: (() => void) | null = null
let onPrevTrackCallback: (() => void) | null = null
let onStopCallback: (() => void) | null = null
let onSeekToCallback: ((position: number) => void) | null = null

/**
 * 初始化媒体会话
 */
export async function initMediaSession(): Promise<void> {
  try {
    // 监听媒体按钮事件
    await MediaSession.addListener('play', () => {
      onPlayCallback?.()
    })

    await MediaSession.addListener('pause', () => {
      onPauseCallback?.()
    })

    await MediaSession.addListener('nexttrack', () => {
      onNextTrackCallback?.()
    })

    await MediaSession.addListener('previoustrack', () => {
      onPrevTrackCallback?.()
    })

    await MediaSession.addListener('stop', () => {
      onStopCallback?.()
    })

    await MediaSession.addListener('seekto', (event) => {
      if (event.position !== undefined) {
        onSeekToCallback?.(event.position)
      }
    })

    console.log('[MediaSession] 初始化成功')
  } catch (error) {
    console.warn('[MediaSession] 初始化失败:', error)
  }
}

/**
 * 设置媒体元数据
 */
export async function setMetadata(metadata: MediaMetadata): Promise<void> {
  try {
    await MediaSession.setMetadata({
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      artwork: metadata.artworkUrl ? [{ src: metadata.artworkUrl }] : []
    })
  } catch (error) {
    console.warn('[MediaSession] 设置元数据失败:', error)
  }
}

/**
 * 设置播放状态
 */
export async function setPlaybackState(state: PlaybackState): Promise<void> {
  try {
    await MediaSession.setPlaybackState({ playbackState: state })
  } catch (error) {
    console.warn('[MediaSession] 设置播放状态失败:', error)
  }
}

/**
 * 设置播放位置
 */
export async function setPosition(position: number, duration: number): Promise<void> {
  try {
    await MediaSession.setPositionState({
      position,
      duration,
      playbackRate: 1.0
    })
  } catch (error) {
    console.warn('[MediaSession] 设置位置失败:', error)
  }
}

/**
 * 设置回调函数
 */
export function setCallbacks(callbacks: {
  onPlay?: () => void
  onPause?: () => void
  onNextTrack?: () => void
  onPrevTrack?: () => void
  onStop?: () => void
  onSeekTo?: (position: number) => void
}): void {
  onPlayCallback = callbacks.onPlay || null
  onPauseCallback = callbacks.onPause || null
  onNextTrackCallback = callbacks.onNextTrack || null
  onPrevTrackCallback = callbacks.onPrevTrack || null
  onStopCallback = callbacks.onStop || null
  onSeekToCallback = callbacks.onSeekTo || null
}

/**
 * 媒体会话服务
 */
export const mediaSessionService = {
  init: initMediaSession,
  setMetadata,
  setPlaybackState,
  setPosition,
  setCallbacks
}
