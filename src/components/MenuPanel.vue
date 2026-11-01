<template>
  <div :class="`side-${side}`" class="menu-panel">
    <div class="panel-body">
      <button :disabled="busy" class="row" @click="handleExport">
        <span class="i-mingcute-download-2-line" style="font-size: 20px"/>
        <span>{{ busy ? '处理中…' : '导出' }}</span>
      </button>
      <button :disabled="busy" class="row" @click="handleImport">
        <span class="i-mingcute-upload-2-line" style="font-size: 20px"/>
        <span>{{ busy ? '处理中…' : '导入' }}</span>
      </button>
      <button class="row" @click="openSub('about')">
        <span class="i-mingcute-information-line" style="font-size: 20px"/>
        <span>关于</span>
      </button>
      <button class="row" @click="openSub('settings')">
        <span class="i-mingcute-settings-3-line" style="font-size: 20px"/>
        <span>设置</span>
      </button>
      <div class="divider"/>
      <button class="row danger" @click="fire('exit')">
        <span class="i-mingcute-exit-line" style="font-size: 20px"/>
        <span>退出</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {inject, ref} from 'vue';
import {DEFAULT_STORE_ID, NWB_INSTANCE_KEY, PANEL_STORE_KEY, usePenStore,} from '@/store';
import {loadKrmc, renderKrmcThumbnail, saveKrmc} from '@/nWb/krmc';

const props = defineProps<{
  side: 'left' | 'right' | 'center';
  storeId?: string;
}>();

const injectedId = inject<string | undefined>(PANEL_STORE_KEY, undefined);
const resolvedStoreId = props.storeId ?? injectedId ?? DEFAULT_STORE_ID;
const pen = usePenStore(resolvedStoreId);

const nwbRef = inject<{ value: any } | null>(NWB_INSTANCE_KEY, null);

/** 导出 / 导入中，避免重复触发 */
const busy = ref(false);

async function handleExport() {
  const inst = nwbRef?.value;
  if (!inst || busy.value) return;

  busy.value = true;
  try {
    const pages = inst.exportPages();
    if (!pages.length) {
      console.warn('[MenuPanel] 导出：无页面内容');
      return;
    }

    // 首屏缩略图（当前页 1-based → 0-based）
    const currentPageIndex = Math.max(0, (pen.pageIndex ?? 1) - 1);
    const thumbnail = renderKrmcThumbnail(inst, currentPageIndex, 480, 360);

    const blob = await saveKrmc(pages, {
      title: 'whiteboard',
      appVersion: '1.0.0',
      thumbnail,
      // 全部默认开启，显式写明方便阅读
      quantize: true,
      strokeBinary: 'auto',
      inlineRemote: true,
      // 严格内联：所有远程图片必须成功内联，否则抛错
      // 如果希望"下载失败就保留 URL"，改成 false
      strictRemote: true,
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiteboard-${Date.now()}.krmc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('[MenuPanel] 导出失败:', e);
    alert(`导出失败：${(e as Error).message}`);
  } finally {
    busy.value = false;
    pen.panelKind = null;
  }
}

async function handleImport() {
  const inst = nwbRef?.value;
  if (!inst || busy.value) return;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.krmc,application/x-krmc,application/zip';
  input.style.display = 'none';

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    busy.value = true;
    try {
      const {pages, manifest} = await loadKrmc(file);
      if (!pages.length) {
        alert('文件里没有可用页面');
        return;
      }
      console.log(
          `[MenuPanel] 导入 ${pages.length} 页，格式 v${manifest.version}`,
      );
      await inst.importPages(pages);
    } catch (e) {
      console.error('[MenuPanel] 导入失败:', e);
      alert(`导入失败：${(e as Error).message}`);
    } finally {
      busy.value = false;
      pen.panelKind = null;
      document.body.removeChild(input);
    }
  };

  document.body.appendChild(input);
  input.click();
}

function fire(type: string) {
  window.dispatchEvent(new CustomEvent('nwb:command', {detail: {type}}));
  pen.panelKind = null;
}

function openSub(kind: 'about' | 'settings') {
  pen.panelKind = kind;
}
</script>

<style scoped>
.menu-panel {
  position: fixed;
  bottom: calc(max(20px, env(safe-area-inset-bottom, 20px)) + 84px);
  width: 220px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12),
  0 0 0 0.5px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  z-index: 99;
  color: #1D1D1F;
  font-family: inherit;
}

.menu-panel.side-left {
  left: 28px;
}

.menu-panel.side-right {
  right: 28px;
}

.menu-panel.side-center {
  left: 50%;
  transform: translateX(-50%);
}

.panel-body {
  padding: 8px;
  display: flex;
  flex-direction: column;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: none;
  background: transparent;
  border-radius: 12px;
  color: #1D1D1F;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 140ms;
  -webkit-tap-highlight-color: transparent;
  font-family: inherit;
  text-align: left;
}

.row:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.04);
}

.row:active:not(:disabled) {
  background: rgba(0, 0, 0, 0.08);
}

.row:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.row.danger {
  color: #FF3B30;
}

.row.danger:hover:not(:disabled) {
  background: rgba(255, 59, 48, 0.08);
}

.divider {
  height: 0.5px;
  background: rgba(0, 0, 0, 0.08);
  margin: 6px 8px;
}
</style>