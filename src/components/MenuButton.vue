<template>
  <div class="menu-group">
    <button
        :class="{ active: pen.panelKind === 'menu' && pen.panelSide === sideOfPanel }"
        aria-label="菜单"
        class="menu-btn"
        @click.stop="onClick"
    >
      <span class="i-mingcute-menu-line" style="font-size: 22px"/>
    </button>
  </div>
</template>

<script lang="ts" setup>
import {computed, inject} from 'vue';
import {DEFAULT_STORE_ID, PANEL_STORE_KEY, usePenStore} from '@/store';

const props = defineProps<{ storeId?: string }>();

const injectedId = inject<string | undefined>(PANEL_STORE_KEY, undefined);
const resolvedStoreId = props.storeId ?? injectedId ?? DEFAULT_STORE_ID;
const pen = usePenStore(resolvedStoreId);

// 菜单从底部左侧弹出
const sideOfPanel = computed(() => 'left');

function onClick() {
  if (pen.panelKind === 'menu' && pen.panelSide === 'left') {
    pen.panelKind = null;
  } else {
    pen.panelKind = 'menu';
    pen.panelSide = 'left';
  }
}
</script>

<style scoped>
.menu-group {
  display: flex;
  padding: 8px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-radius: 22px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08),
  0 0 0 0.5px rgba(0, 0, 0, 0.04);
}

.menu-btn {
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
  transition: background-color 160ms cubic-bezier(0.4, 0, 0.2, 1),
  color 160ms cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.menu-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.menu-btn:active {
  background: rgba(0, 0, 0, 0.08);
}

.menu-btn.active {
  background: #34C759;
  color: #FFFFFF;
}

.menu-btn.active:hover {
  background: #2AB34D;
}
</style>