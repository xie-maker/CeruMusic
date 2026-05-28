# 澜音 CeruMusic — 歌单 UI 美化交接文档

> 日期：2026-05-28  
> 改动范围：仅 1 个文件  
> 状态：代码已改完，等待 yarn build 生效

---

## 改动文件

```
D:\download\文档\开源音乐播放器\CeruMusic-source\src\renderer\src\views\music\songlist.vue
```

只改了这个文件，script 逻辑部分**未触碰**，只改了 `<template>` 和 `<style scoped>`。

---

## 改动内容

### 1. 卡片布局重构

| 项目 | 原来 | 改后 |
|------|------|------|
| 整体方向 | 横排（左封面 + 右信息 + 底按钮） | **竖排（1:1 封面在上 + 信息在下）** |
| 封面比例 | 固定 124×124 px | **`aspect-ratio: 1/1`** 自适应 |
| 操作按钮 | 卡片底部 4 个常驻按钮 | **hover 浮层显示**：居中播放按钮 + 下方查看/编辑/删除 |
| 信息区 | 名称+标签+描述+日期 多行 | 精简为**名称 + 来源/日期一行** |
| 标签 | 文字 `t-tag` 组件 | **封面右上角角标**（♥ 红底 / 云图标 绿底） |
| 无封面 | 无处理 | 渐变背景占位 + 歌单图标 |

### 2. 网格布局

- `grid-template-columns`: `minmax(360px, 1fr)` → `minmax(188px, 1fr)`
- 间距: `0.9rem` → `1.25rem`
- 新增响应式断点: 920px（缩列）、540px（2列）

### 3. 空状态美化

- 图标从纯文字 → 渐变背景圆圈（88px）+ 图标

### 4. 动画效果

- 卡片 hover：上浮 4px + 阴影加深
- 封面 hover：放大 1.06x + 渐变浮层淡入
- 播放按钮 hover：放大 1.1x

---

## 下一步操作

```bash
cd D:\download\文档\开源音乐播放器\CeruMusic-source
yarn dev
```

用 yarn 启动即可看到新 UI。如果用 npm 会报依赖错误（项目是 yarn PnP）。

如果要打包成 exe：
```bash
yarn build:win
```

---

## 已修复的环境问题

`.npmrc` 中 Electron 镜像配置已取消注释：
```
electron_mirror=https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
```

---

## 如需回滚

用 git 恢复即可：
```bash
git checkout -- src/renderer/src/views/music/songlist.vue
```
