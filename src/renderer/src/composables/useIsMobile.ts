/**
 * 响应式布局 composable
 *
 * 检测当前是否为移动端视图，用于条件渲染。
 */

import { ref, onMounted, onUnmounted } from 'vue'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const isMobile = ref(false)
  const isTablet = ref(false)

  function update() {
    const width = window.innerWidth
    isMobile.value = width < MOBILE_BREAKPOINT
    isTablet.value = width >= MOBILE_BREAKPOINT && width < 1024
  }

  onMounted(() => {
    update()
    window.addEventListener('resize', update)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', update)
  })

  return {
    isMobile,
    isTablet,
    isDesktop: ref(true) // 桌面端始终为 true，移动端通过 isMobile 判断
  }
}

/**
 * 全局单例版本（用于非组件上下文）
 */
let globalIsMobile: ReturnType<typeof useIsMobile> | null = null

export function useGlobalIsMobile() {
  if (!globalIsMobile) {
    globalIsMobile = useIsMobile()
  }
  return globalIsMobile
}
