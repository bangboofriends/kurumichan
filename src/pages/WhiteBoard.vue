<template>
  <div class="wb-page">
    <canvas ref="canvasRef" class="wb-canvas"></canvas>
    <WhiteBoardBar :store-id="STORE_ID"/>
  </div>
</template>

<script lang="ts" setup>

document.addEventListener('contextmenu', function(e) {
  e.preventDefault(); // 阻止默认的右键菜单弹出
});

import {onBeforeUnmount, onMounted, provide, ref} from 'vue';
import {PANEL_STORE_KEY, usePenStore, useSettingsStore} from '@/store';
import {useNwb} from '@/composables/useNwb';
import WhiteBoardBar from '@/components/WhiteBoardBar.vue';

const STORE_ID = 'wb';
provide(PANEL_STORE_KEY, STORE_ID);

const canvasRef = ref<HTMLCanvasElement | null>(null);
const pen = usePenStore(STORE_ID);
const settingsStore = useSettingsStore();

const {actions} = useNwb({
  canvasRef,
  storeId: STORE_ID,
  effect: 'none',

  onPointerDown: () => {
    if (pen.panelKind) pen.panelKind = null;
    if (pen.drawerOpen) pen.drawerOpen = false;
  },
});

function handleClearPage() {
  actions.clearCurrentPage();
}

function handleCommand(e: Event) {
  const detail = (e as CustomEvent<{ type: string }>).detail;
  if (!detail) return;

  switch (detail.type) {
    case 'close':
      handleClose();
      break;
    case 'minimize':
      handleMinimize();
      break;
    case 'exit':
      handleExit();
      break;
    case 'visualizer':
      handleVisualizer();
      break;
  }
}

/**
 * 打开视频展台（预留，等待 Tauri 接入）。
 *
 * 预期流程：
 *   1. Tauri 侧枚举摄像头设备（视频展台本质是一个 USB 摄像头）
 *   2. 打开独立展台窗口（Tauri WebviewWindow）或内嵌画面，
 *      通过 getUserMedia / Rust 原生抓帧把实时画面显示出来
 *   3. 可选：画面拍照后作为 image 笔迹插入当前白板页（nwb.addImage）
 *
 * TODO(tauri-visualizer): 当前为空实现，待后续接入
 */
function handleVisualizer() {
  console.info('[nWb] 视频展台功能尚未接入（预留）');
}

/**
 * 最小化到桌面：
 * - Tauri 环境：调用 Tauri API 让窗口最小化到任务栏 / 桌面
 * - 浏览器：没有窗口 API，仅记录日志（避免 UI 消失无法恢复）
 */
function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}

async function handleMinimize() {
  if (isTauri()) {
    try {
      const {getCurrentWindow} = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
      return;
    } catch (e) {
      console.warn('[nWb] Tauri minimize failed:', e);
    }
  }
  console.log('[nWb] minimize requested (browser: no-op)');
}

async function handleClose() {
  if (isTauri()) {
    try {
      const {getCurrentWindow} = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
      return;
    } catch (e) {
      console.warn('[nWb] Tauri close failed:', e);
    }
  }
  window.close();
}

async function handleExit() {
  // 单窗口应用：关闭窗口即退出
  await handleClose();
}

/**
 * 工具栏跟随书写侧（仅 WhiteBoard 生效，HomeWorkBoard 不启用）：
 * 统计最近 15s 内画布上按下/拖动的指针位置，
 * 若 ≥60% 集中在左/右 1/3 区域，则把工具栏移到对应侧（竖向）。
 */
const writeSamples: { x: number; t: number }[] = [];
let lastEvalAt = 0;

function onWritePointer(e: PointerEvent) {
  if (!settingsStore.settings.enableToolTipMoveWithWrite) return;
  // 只统计画布上的指针（点击面板/按钮不算书写）
  if (!(e.target instanceof HTMLCanvasElement)) return;
  // pointermove 仅统计按住（含触摸/笔）状态
  if (e.type === 'pointermove' && !(e.buttons & 1)) return;
  const now = performance.now();
  writeSamples.push({x: e.clientX / window.innerWidth, t: now});
  const cutoff = now - 15000;
  while (writeSamples.length && writeSamples[0].t < cutoff) writeSamples.shift();
  if (writeSamples.length < 30) return;      // 样本不足，不判断
  if (now - lastEvalAt < 2000) return;       // 2s 评估一次，防抖
  lastEvalAt = now;
  const left = writeSamples.filter((s) => s.x < 1 / 3).length;
  const right = writeSamples.filter((s) => s.x > 2 / 3).length;
  const n = writeSamples.length;
  settingsStore.barSide =
      left / n >= 0.6 ? 'left' : right / n >= 0.6 ? 'right' : 'bottom';
}

onMounted(() => {
  window.addEventListener('nwb:clear-page', handleClearPage);
  window.addEventListener('nwb:command', handleCommand as EventListener);
  window.addEventListener('pointerdown', onWritePointer, true);
  window.addEventListener('pointermove', onWritePointer, {capture: true, passive: true});
});

onBeforeUnmount(() => {
  window.removeEventListener('nwb:clear-page', handleClearPage);
  window.removeEventListener('nwb:command', handleCommand as EventListener);
  window.removeEventListener('pointerdown', onWritePointer, true);
  window.removeEventListener('pointermove', onWritePointer, true);
});
</script>

<style scoped>
.wb-page {
  position: fixed;
  inset: 0;
  background: #F5F5F7;
  overflow: hidden;
  font-family: "harmonysans", -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI',
  'PingFang SC', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color-scheme: light;
}

.wb-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
  image-rendering: -webkit-optimize-contrast;
}
</style>
