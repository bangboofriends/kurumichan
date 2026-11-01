<template>
  <div class="top-bar">
    <PageBar :store-id="resolvedStoreId"/>
  </div>

  <PageDrawer :store-id="resolvedStoreId"/>
</template>

<script lang="ts" setup>
import {inject} from 'vue';
import {DEFAULT_STORE_ID, PANEL_STORE_KEY} from '@/store';
import PageBar from '@/components/PageBar.vue';
import PageDrawer from '@/components/PageDrawer.vue';

const props = defineProps<{ storeId?: string }>();

const injectedId = inject<string | undefined>(PANEL_STORE_KEY, undefined);
const resolvedStoreId = props.storeId ?? injectedId ?? DEFAULT_STORE_ID;
</script>

<style scoped>
.top-bar {
  position: fixed;
  top: max(16px, env(safe-area-inset-top, 16px));
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  pointer-events: none;
  z-index: 100;
}

.top-bar > * {
  pointer-events: auto;
}
</style>