<template>
  <div class="side-toolbar">
    <!-- 菜单 -->
    <button
        class="tb-btn"
        :class="{ active: isMenuOpen }"
        @click="onMenu"
        aria-label="菜单"
    >
      <span class="i-mingcute-menu-line" style="font-size: 22px" />
    </button>

    <div class="tb-divider" />

    <!-- 笔 -->
    <button
        class="tb-btn"
        :class="{ active: isPenActive }"
        @click="onPen"
        aria-label="画笔"
    >
      <span class="i-mingcute-pen-line" style="font-size: 22px" />
    </button>

    <!-- 橡皮 -->
    <button
        class="tb-btn"
        :class="{ active: isEraserActive }"
        @click="onEraser"
        aria-label="橡皮"
    >
      <span class="i-mingcute-eraser-line" style="font-size: 22px" />
    </button>

    <div class="tb-divider" />

    <!-- 最小化 -->
    <button
        class="tb-btn"
        @click="onMinimize"
        aria-label="最小化"
    >
      <span class="i-mingcute-down-line" style="font-size: 22px" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { usePenStore, PANEL_STORE_KEY, DEFAULT_STORE_ID } from '@/store';

const props = defineProps<{
  side: 'left' | 'right';
  storeId?: string;
}>();

const injectedId = inject<string | undefined>(PANEL_STORE_KEY, undefined);
const resolvedStoreId = props.storeId ?? injectedId ?? DEFAULT_STORE_ID;
const pen = usePenStore(resolvedStoreId);

const isMenuOpen = computed(() =>
    pen.panelKind === 'menu' && pen.panelSide === props.side
);

const isPenActive = computed(() =>
    pen.tool === 'pen' &&
    (pen.panelKind !== 'pen' || pen.panelSide === props.side)
);

const isEraserActive = computed(() =>
    pen.tool === 'eraser' &&
    (pen.panelKind !== 'eraser' || pen.panelSide === props.side)
);

function onMenu() {
  if (pen.panelKind === 'menu' && pen.panelSide === props.side) {
    pen.panelKind = null;
  } else {
    pen.panelKind = 'menu';
    pen.panelSide = props.side;
  }
}

function onPen() {
  if (pen.tool !== 'pen') {
    pen.tool = 'pen';
    pen.panelKind = null;
    return;
  }
  if (pen.panelKind === 'pen' && pen.panelSide === props.side) {
    pen.panelKind = null;
  } else {
    pen.panelKind = 'pen';
    pen.panelSide = props.side;
  }
}

function onEraser() {
  if (pen.tool !== 'eraser') {
    pen.tool = 'eraser';
    pen.panelKind = null;
    return;
  }
  if (pen.panelKind === 'eraser' && pen.panelSide === props.side) {
    pen.panelKind = null;
  } else {
    pen.panelKind = 'eraser';
    pen.panelSide = props.side;
  }
}

function onMinimize() {
  window.dispatchEvent(new CustomEvent('nwb:command', { detail: { type: 'minimize' } }));
}
</script>

<style scoped>
.side-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-radius: 22px;
  box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.08),
      0 0 0 0.5px rgba(0, 0, 0, 0.04);
}

.tb-btn {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: #1D1D1F;
  cursor: pointer;
  transition:
      background-color 160ms cubic-bezier(0.4, 0, 0.2, 1),
      color 160ms cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.tb-btn:hover { background: rgba(0, 0, 0, 0.04); }
.tb-btn:active { background: rgba(0, 0, 0, 0.08); }

.tb-btn.active { background: #34C759; color: #FFFFFF; }
.tb-btn.active:hover { background: #2AB34D; }

.tb-divider {
  width: 1px;
  height: 28px;
  background: rgba(0, 0, 0, 0.08);
  margin: 0 2px;
}
</style>