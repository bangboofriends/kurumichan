<template>
  <div class="bottom-bar">
    <!-- 左侧栏：菜单 / 笔 / 橡皮 / 最小化 -->
    <div class="side side-left">
      <SideToolbar :store-id="resolvedStoreId" side="left"/>
    </div>

    <!-- 中间：翻页 + 关闭 -->
    <div class="side side-center">
      <PageBar :store-id="resolvedStoreId"/>
      <CloseButton @close="onClose"/>
    </div>

    <!-- 右侧栏：菜单 / 笔 / 橡皮 / 最小化 -->
    <div class="side side-right">
      <SideToolbar :store-id="resolvedStoreId" side="right"/>
    </div>
  </div>

  <!-- 面板 -->
  <Transition name="panel">
    <PenPanel
        v-if="pen.panelKind === 'pen'"
        :side="pen.panelSide"
        :store-id="resolvedStoreId"
    />
  </Transition>
  <Transition name="panel">
    <EraserPanel
        v-if="pen.panelKind === 'eraser'"
        :side="pen.panelSide"
        :store-id="resolvedStoreId"
    />
  </Transition>
  <Transition name="panel">
    <MenuPanel
        v-if="pen.panelKind === 'menu'"
        :side="pen.panelSide"
        :store-id="resolvedStoreId"
    />
  </Transition>
  <Transition name="panel">
    <AboutPanel
        v-if="pen.panelKind === 'about'"
        :store-id="resolvedStoreId"
    />
  </Transition>
  <Transition name="panel">
    <SettingsPanel
        v-if="pen.panelKind === 'settings'"
        :store-id="resolvedStoreId"
    />
  </Transition>

  <PageDrawer :store-id="resolvedStoreId"/>
</template>

<script lang="ts" setup>
import {inject} from 'vue';
import {DEFAULT_STORE_ID, PANEL_STORE_KEY, usePenStore} from '@/store';
import SideToolbar from '@/components/SideToolBar.vue';
import CloseButton from '@/components/CloseButton.vue';
import PageBar from '@/components/PageBar.vue';
import PenPanel from '@/components/PenPanel.vue';
import EraserPanel from '@/components/EraserPanel.vue';
import MenuPanel from '@/components/MenuPanel.vue';
import AboutPanel from '@/components/AboutPanel.vue';
import SettingsPanel from '@/components/SettingsPanel.vue';
import PageDrawer from '@/components/PageDrawer.vue';

const props = defineProps<{ storeId?: string }>();

const injectedId = inject<string | undefined>(PANEL_STORE_KEY, undefined);
const resolvedStoreId = props.storeId ?? injectedId ?? DEFAULT_STORE_ID;
const pen = usePenStore(resolvedStoreId);

function onClose() {
  window.dispatchEvent(new CustomEvent('nwb:command', {detail: {type: 'close'}}));
}
</script>

<style scoped>
.bottom-bar {
  position: fixed;
  bottom: max(20px, env(safe-area-inset-bottom, 20px));
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 28px;
  pointer-events: none;
  z-index: 100;
  gap: 12px;
}

.side {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.side-left {
  justify-content: flex-start;
}

.side-center {
  justify-content: center;
}

.side-right {
  justify-content: flex-end;
}

.panel-enter-active,
.panel-leave-active {
  transition: opacity 220ms cubic-bezier(0.4, 0, 0.2, 1),
  transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>