<template>
  <div class="bottom-bar">
    <div class="side side-left">
      <MenuGroup side="left" :store-id="resolvedStoreId" />
    </div>
    <div class="side side-center">
      <CloseButton />
    </div>
    <div class="side side-right">
      <MenuGroup side="right" :store-id="resolvedStoreId" />
    </div>
  </div>

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
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { usePenStore, PANEL_STORE_KEY, DEFAULT_STORE_ID } from '@/store';
import MenuGroup from '@/components/MenuGroupLite.vue';
import CloseButton from '@/components/CloseButton.vue';
import PenPanel from '@/components/PenPanel.vue';
import EraserPanel from '@/components/EraserPanel.vue';

const props = defineProps<{
  /** 不传时从 inject 拿；都没有则使用默认 store */
  storeId?: string;
}>();

const injectedId = inject<string | undefined>(PANEL_STORE_KEY, undefined);
const resolvedStoreId = props.storeId ?? injectedId ?? DEFAULT_STORE_ID;

const pen = usePenStore(resolvedStoreId);
</script>

<style scoped>
.bottom-bar {
  position: fixed;
  bottom: max(16px, env(safe-area-inset-bottom, 16px));
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 24px;
  pointer-events: none;
  z-index: 100;
}

.side {
  pointer-events: auto;
  display: flex;
  align-items: center;
}

.side-left { justify-content: flex-start; }
.side-center { justify-content: center; }
.side-right { justify-content: flex-end; }

.panel-enter-active,
.panel-leave-active {
  transition:
      opacity 220ms cubic-bezier(0.4, 0, 0.2, 1),
      transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>