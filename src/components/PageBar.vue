<template>
  <div class="page-bar">
    <button
        :disabled="pen.pageIndex <= 1"
        aria-label="上一页"
        class="nav-btn"
        @click="onPrev"
    >
      <span class="i-mingcute-arrow-left-line" style="font-size: 20px"/>
    </button>

    <button
        :class="{ active: pen.drawerOpen }"
        class="page-info"
        @click="toggleDrawer"
    >
      <span class="num">{{ pen.pageIndex }}</span>
      <span class="sep">/</span>
      <span class="num total">{{ pen.pageCount }}</span>
    </button>

    <button
        v-if="isLastPage"
        aria-label="新建页"
        class="nav-btn add"
        @click="onAdd"
    >
      <span class="i-mingcute-add-line" style="font-size: 22px"/>
    </button>
    <button
        v-else
        aria-label="下一页"
        class="nav-btn"
        @click="onNext"
    >
      <span class="i-mingcute-arrow-right-line" style="font-size: 20px"/>
    </button>
  </div>
</template>

<script lang="ts" setup>
import {computed, inject} from 'vue';
import {DEFAULT_STORE_ID, NWB_INSTANCE_KEY, PANEL_STORE_KEY, usePenStore, useSettingsStore,} from '@/store';

const props = defineProps<{ storeId?: string }>();

const injectedId = inject<string | undefined>(PANEL_STORE_KEY, undefined);
const resolvedStoreId = props.storeId ?? injectedId ?? DEFAULT_STORE_ID;
const pen = usePenStore(resolvedStoreId);

const nwbRef = inject<{ value: any } | null>(NWB_INSTANCE_KEY, null);
const settingsStore = useSettingsStore();

const isLastPage = computed(() => pen.pageIndex >= pen.pageCount);

function onPrev() {
  nwbRef?.value?.goPrev();
}

function onNext() {
  nwbRef?.value?.goNext();
}

async function onAdd() {
  const inst = nwbRef?.value;
  if (!inst) return;
  await inst.newPage({bgcolor: settingsStore.settings.boardDefaultBgColor});
  inst.goTo(inst.getPageCount());
}

function toggleDrawer() {
  pen.drawerOpen = !pen.drawerOpen;
}
</script>

<style scoped>
.page-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-radius: 22px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08),
  0 0 0 0.5px rgba(0, 0, 0, 0.04);
}

.nav-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: #1D1D1F;
  cursor: pointer;
  transition: background-color 160ms cubic-bezier(0.4, 0, 0.2, 1),
  color 160ms,
  transform 80ms;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.04);
}

.nav-btn:active:not(:disabled) {
  background: rgba(0, 0, 0, 0.08);
  transform: scale(0.95);
}

.nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.nav-btn.add {
  color: #34C759;
}

.nav-btn.add:hover {
  background: rgba(52, 199, 89, 0.1);
}

.page-info {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: #1D1D1F;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 160ms;
  -webkit-tap-highlight-color: transparent;
  font-family: inherit;
  font-variant-numeric: tabular-nums;
}

.page-info:hover {
  background: rgba(0, 0, 0, 0.04);
}

.page-info.active {
  background: rgba(0, 0, 0, 0.06);
}

.page-info .num {
  min-width: 16px;
  text-align: center;
}

.page-info .num.total {
  color: #8E8E93;
}

.page-info .sep {
  color: #C7C7CC;
  font-weight: 400;
}
</style>