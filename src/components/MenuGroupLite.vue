<template>
  <div class="menu-group">
    <button
        class="menu-btn"
        :class="{ active: isPenActive }"
        @click.stop="onPen"
        aria-label="画笔"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
           stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z"/>
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
        <path d="M2 2l7.586 7.586"/>
        <circle cx="11" cy="11" r="2"/>
      </svg>
    </button>
    <button
        class="menu-btn"
        :class="{ active: isEraserActive }"
        @click.stop="onEraser"
        aria-label="橡皮"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
           stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 20H7L3 16a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.828 0l4.172 4.172a2 2 0 0 1 0 2.828L13 17"/>
        <path d="M17 17L7 7"/>
      </svg>
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

const isPenActive = computed(() =>
    pen.tool === 'pen' &&
    (pen.panelKind !== 'pen' || pen.panelSide === props.side)
);

const isEraserActive = computed(() =>
    pen.tool === 'eraser' &&
    (pen.panelKind !== 'eraser' || pen.panelSide === props.side)
);

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
</script>

<style scoped>
.menu-group {
  display: flex;
  gap: 4px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-radius: 18px;
  box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.08),
      0 0 0 0.5px rgba(0, 0, 0, 0.04);
}

.menu-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #1D1D1F;
  cursor: pointer;
  transition:
      background-color 160ms cubic-bezier(0.4, 0, 0.2, 1),
      color 160ms cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.menu-btn:hover { background: rgba(0, 0, 0, 0.04); }
.menu-btn:active { background: rgba(0, 0, 0, 0.08); }
.menu-btn.active { background: #34C759; color: #FFFFFF; }
.menu-btn.active:hover { background: #2AB34D; }
</style>