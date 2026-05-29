<template>
  <div class="mobile-layout">
    <div class="mobile-content" :class="{ 'has-player': showMiniPlayer }">
      <slot />
    </div>
    <BottomTabBar />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BottomTabBar from './BottomTabBar.vue'
import { useGlobalPlayStatusStore } from '@renderer/store/GlobalPlayStatus'

const playStatusStore = useGlobalPlayStatusStore()
const showMiniPlayer = computed(() => !!playStatusStore.player.songInfo?.songmid)
</script>

<style scoped>
.mobile-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.mobile-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 56px; /* 底部导航高度 */
}

.mobile-content.has-player {
  padding-bottom: 120px; /* 底部导航 + 迷你播放器 */
}
</style>
