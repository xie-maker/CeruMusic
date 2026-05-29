<template>
  <nav class="bottom-tab-bar">
    <router-link
      v-for="tab in tabs"
      :key="tab.path"
      :to="tab.path"
      class="tab-item"
      :class="{ active: isActive(tab.path) }"
    >
      <component :is="tab.icon" class="tab-icon" />
      <span class="tab-label">{{ tab.label }}</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { HomeIcon, SearchIcon, ViewListIcon, SettingIcon } from 'tdesign-icons-vue-next'

const route = useRoute()

const tabs = [
  { path: '/', label: '首页', icon: HomeIcon },
  { path: '/search', label: '搜索', icon: SearchIcon },
  { path: '/songlist', label: '歌单', icon: ViewListIcon },
  { path: '/settings', label: '设置', icon: SettingIcon }
]

function isActive(path: string) {
  if (path === '/') {
    return route.path === '/' || route.path === '/welcome'
  }
  return route.path.startsWith(path)
}
</script>

<style scoped>
.bottom-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: var(--td-bg-color-container);
  border-top: 1px solid var(--td-border-level-1-color);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 1000;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  text-decoration: none;
  color: var(--td-text-color-secondary);
  transition: color 0.2s;
}

.tab-item.active {
  color: var(--td-brand-color);
}

.tab-icon {
  font-size: 20px;
  margin-bottom: 2px;
}

.tab-label {
  font-size: 10px;
}
</style>
