<template>
  <Transition name="drawer">
    <div v-if="pen.drawerOpen" class="drawer-mask" @click="close">
      <div class="drawer-panel" @click.stop>
        <div class="drawer-header">
          <span class="drawer-title">页面</span>
          <button aria-label="关闭" class="close-btn" @click="close">
            <span class="i-mingcute-close-line" style="font-size: 16px"/>
          </button>
        </div>

        <div class="drawer-body">
          <div class="grid">
            <button
                v-for="i in pen.pageCount"
                :key="i"
                :class="{ active: i === pen.pageIndex }"
                class="thumb"
                @click="onJump(i)"
            >
              <canvas
                  :ref="(el) => setCanvasRef(i - 1, el)"
                  :style="{ aspectRatio }"
                  class="thumb-canvas"
              ></canvas>
              <span class="thumb-label">{{ i }}</span>
            </button>
          </div>

          <button class="add-btn" @click="onAddPage">
            <span class="i-mingcute-add-line" style="font-size: 18px"/>
            <span>新建页</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import {computed, inject, nextTick, onBeforeUnmount, ref, watch} from 'vue';
import {DEFAULT_STORE_ID, NWB_INSTANCE_KEY, PANEL_STORE_KEY, usePenStore,} from '@/store';

const props = defineProps<{ storeId?: string }>();

const injectedId = inject<string | undefined>(PANEL_STORE_KEY, undefined);
const resolvedStoreId = props.storeId ?? injectedId ?? DEFAULT_STORE_ID;
const pen = usePenStore(resolvedStoreId);

const nwbRef = inject<{ value: any } | null>(NWB_INSTANCE_KEY, null);

const canvasRefs = ref<(HTMLCanvasElement | null)[]>([]);

const aspectRatio = computed(() => {
  const w = pen.viewW || 1;
  const h = pen.viewH || 1;
  return `${w} / ${h}`;
});

/** 关键修复：把 el 的类型从 `Element | ComponentPublicInstance` 收窄到 `HTMLCanvasElement` */
function setCanvasRef(index: number, el: Element | { $el?: Element } | null) {
  if (el instanceof HTMLCanvasElement) {
    canvasRefs.value[index] = el;
  } else if (el && '$el' in el && el.$el instanceof HTMLCanvasElement) {
    canvasRefs.value[index] = el.$el;
  } else {
    canvasRefs.value[index] = null;
  }
}

function renderAllThumbs() {
  const inst = nwbRef?.value;
  if (!inst) return;

  for (let i = 0; i < canvasRefs.value.length; i++) {
    const canvas = canvasRefs.value[i];
    if (!canvas) continue;
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, rect.width);
    const cssH = Math.max(1, rect.height);
    inst.renderPageThumbnail(i, canvas, cssW, cssH);
  }
}

async function renderAfterLayout() {
  await nextTick();
  requestAnimationFrame(() => renderAllThumbs());
}

watch(
    () => pen.drawerOpen,
    async (open) => {
      if (!open) {
        canvasRefs.value = [];
        return;
      }
      await renderAfterLayout();
    },
);

watch(
    () => [pen.pageIndex, pen.pageCount],
    async () => {
      if (pen.drawerOpen) await renderAfterLayout();
    },
);

onBeforeUnmount(() => {
  canvasRefs.value = [];
});

function close() {
  pen.drawerOpen = false;
}

function onJump(i: number) {
  nwbRef?.value?.goTo(i);
  close();
}

async function onAddPage() {
  const inst = nwbRef?.value;
  if (!inst) return;
  await inst.newPage();
  inst.goTo(inst.getPageCount());
  await renderAfterLayout();
}
</script>

<style scoped>
.drawer-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.18);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.drawer-panel {
  width: min(360px, 86vw);
  height: 100%;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  color: #1D1D1F;
  font-family: inherit;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: max(16px, env(safe-area-inset-top, 16px)) 20px 14px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.drawer-title {
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 50%;
  color: #6E6E73;
  cursor: pointer;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 24px;
  -webkit-overflow-scrolling: touch;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.thumb {
  position: relative;
  display: block;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 10px;
  background: #F5F5F7;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 160ms cubic-bezier(0.4, 0, 0.2, 1),
  transform 160ms cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
}

.thumb:hover {
  transform: translateY(-1px);
}

.thumb.active {
  border-color: #34C759;
}

.thumb-canvas {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 8px;
}

.thumb-label {
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  padding: 1px 8px;
  background: rgba(0, 0, 0, 0.55);
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 500;
  border-radius: 8px;
  line-height: 1.4;
  pointer-events: none;
  white-space: nowrap;
}

.add-btn {
  margin-top: 16px;
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px dashed rgba(0, 0, 0, 0.18);
  border-radius: 10px;
  background: transparent;
  color: #34C759;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 160ms, border-color 160ms;
  -webkit-tap-highlight-color: transparent;
  font-family: inherit;
}

.add-btn:hover {
  background: rgba(52, 199, 89, 0.06);
  border-color: rgba(52, 199, 89, 0.35);
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 260ms cubic-bezier(0.4, 0, 0.2, 1);
}

.drawer-enter-active .drawer-panel,
.drawer-leave-active .drawer-panel {
  transition: transform 260ms cubic-bezier(0.4, 0, 0.2, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer-panel,
.drawer-leave-to .drawer-panel {
  transform: translateX(100%);
}
</style>