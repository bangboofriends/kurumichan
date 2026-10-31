<template>
  <div class="wb-page">
    <canvas ref="canvasRef" class="wb-canvas"></canvas>

    <TopBar :store-id="STORE_ID" />
    <BottomBar :store-id="STORE_ID" />
  </div>
</template>

<script setup lang="ts">
import { ref, provide, onMounted, onBeforeUnmount } from 'vue';
import { usePenStore, PANEL_STORE_KEY } from '@/store';
import { useNwb } from '@/composables/useNwb';
import TopBar from '@/components/TopBar.vue';
import BottomBar from '@/components/BottomBarLite.vue';

const STORE_ID = 'hwb';

// 让后代组件即使不带 prop 也能拿到 storeId
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

onMounted(() => {
  window.addEventListener('nwb:clear-page', handleClearPage);
});

onBeforeUnmount(() => {
  window.removeEventListener('nwb:clear-page', handleClearPage);
});
</script>

<style scoped>
.wb-page {
  position: fixed;
  inset: 0;
  background: #F5F5F7;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI',
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