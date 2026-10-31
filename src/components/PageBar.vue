<template>
  <div class="page-bar">
    <button
        class="nav-btn"
        :disabled="pen.pageIndex <= 1"
        @click="onPrev"
        aria-label="上一页"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
           stroke="currentColor" stroke-width="2.2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>

    <button
        class="page-info"
        :class="{ active: pen.drawerOpen }"
        @click="toggleDrawer"
    >
      <span class="num">{{ pen.pageIndex }}</span>
      <span class="sep">/</span>
      <span class="num total">{{ pen.pageCount }}</span>
    </button>

    <button
        v-if="isLastPage"
        class="nav-btn add"
        @click="onAdd"
        aria-label="新建页"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
           stroke="currentColor" stroke-width="2.4"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    </button>
    <button
        v-else
        class="nav-btn"
        @click="onNext"
        aria-label="下一页"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
           stroke="currentColor" stroke-width="2.2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import {
  usePenStore,
  PANEL_STORE_KEY,
  NWB_INSTANCE_KEY,
  DEFAULT_STORE_ID,
} from '@/store';

const props = defineProps<{ storeId?: string }>();

const injectedId = inject<string | undefined>(PANEL_STORE_KEY, undefined);
const resolvedStoreId = props.storeId ?? injectedId ?? DEFAULT_STORE_ID;
const pen = usePenStore(resolvedStoreId);

const nwbRef = inject<{ value: any } | null>(NWB_INSTANCE_KEY, null);

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
  await inst.newPage();
  // 跳转到新建的那一页
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
  padding: 6px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-radius: 18px;
  box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.08),
      0 0 0 0.5px rgba(0, 0, 0, 0.04);
}

.nav-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #1D1D1F;
  cursor: pointer;
  transition:
      background-color 160ms cubic-bezier(0.4, 0, 0.2, 1),
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
  height: 36px;
  padding: 0 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #1D1D1F;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 160ms cubic-bezier(0.4, 0, 0.2, 1);
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
  min-width: 14px;
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