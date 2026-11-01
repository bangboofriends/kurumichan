<template>
  <div class="wb-page">
    <canvas ref="canvasRef" class="wb-canvas"></canvas>
    <BottomBarLite :store-id="STORE_ID" />
  </div>
</template>

<script setup lang="ts">
import { ref, provide, onMounted, onBeforeUnmount } from 'vue';
import { usePenStore, PANEL_STORE_KEY } from '@/store';
import { useNwb } from '@/composables/useNwb';
import BottomBarLite from '@/components/BottomBarLite.vue';

const STORE_ID = 'hwb';
provide(PANEL_STORE_KEY, STORE_ID);

const canvasRef = ref<HTMLCanvasElement | null>(null);
const pen = usePenStore(STORE_ID);

const { actions } = useNwb({
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
    case 'export':
      handleExport();
      break;
    case 'import':
      handleImport();
      break;
    case 'close':
      handleClose();
      break;
    case 'minimize':
      handleMinimize();
      break;
    case 'exit':
      handleExit();
      break;
  }
}

function handleExport() {
  const urls = actions.renderHQImage('all', { scale: 2, format: 'png' });
  if (!urls.length) {
    console.warn('[nWb] 导出：无页面内容');
    return;
  }
  urls.forEach((url, i) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `page-${i + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}

function handleImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const pages = JSON.parse(text);
      await actions.importPages(pages);
    } catch (err) {
      console.error('[nWb] 导入失败:', err);
    }
  };
  input.click();
}

/**
 * 最小化到桌面：
 * - Tauri 环境：调用 Tauri API 让窗口最小化到任务栏 / 桌面
 * - 浏览器：没有窗口 API，仅记录日志（避免 UI 消失无法恢复）
 */
async function handleMinimize() {
  const anyWin = window as any;
  if (anyWin.__TAURI__) {
    try {
      // Tauri v2:
      // const { getCurrentWindow } = await import('@tauri-apps/api/window');
      // await getCurrentWindow().minimize();
      console.log('[nWb] Tauri minimize (placeholder)');
      return;
    } catch (e) {
      console.warn('[nWb] Tauri minimize failed:', e);
    }
  }
  console.log('[nWb] minimize requested (browser: no-op)');
}

function handleClose() {
  console.log('[nWb] close requested');
  // 后续接入 Tauri：
  // import { getCurrentWindow } from '@tauri-apps/api/window';
  // getCurrentWindow().close();
}

function handleExit() {
  console.log('[nWb] exit requested');
  // 可选：Tauri 退出应用
  // import { exit } from '@tauri-apps/plugin-process';
  // exit(0);
}

onMounted(() => {
  window.addEventListener('nwb:clear-page', handleClearPage);
  window.addEventListener('nwb:command', handleCommand as EventListener);
});

onBeforeUnmount(() => {
  window.removeEventListener('nwb:clear-page', handleClearPage);
  window.removeEventListener('nwb:command', handleCommand as EventListener);
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