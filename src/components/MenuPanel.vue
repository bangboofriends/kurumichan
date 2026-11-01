<template>
  <div :class="`side-${side}`" class="menu-panel">
    <div class="panel-body">
      <div ref="saveWrapRef" class="pop-wrap">
        <button :disabled="busy" class="row" @click="toggleMenu('save')">
          <span class="i-mingcute-download-2-line" style="font-size: 20px"/>
          <span>{{ busy ? '处理中…' : '保存' }}</span>
          <span :class="popSide === 'right' ? 'i-mingcute-right-line' : 'i-mingcute-left-line'" class="arrow"/>
        </button>
        <Transition name="submenu">
          <div v-if="openMenu === 'save'" :class="`pop-${popSide}`" class="sub-menu">
            <button :disabled="busy" class="row" @click="handleSaveKrmc">
              <span class="i-mingcute-file-line" style="font-size: 20px"/>
              <span>保存krmc</span>
            </button>
            <button :disabled="busy" class="row" @click="handleSaveImages">
              <span class="i-mingcute-pic-line" style="font-size: 20px"/>
              <span>保存为图片</span>
            </button>
          </div>
        </Transition>
      </div>
      <div ref="importWrapRef" class="pop-wrap">
        <button :disabled="busy" class="row" @click="toggleMenu('import')">
          <span class="i-mingcute-upload-2-line" style="font-size: 20px"/>
          <span>导入</span>
          <span :class="popSide === 'right' ? 'i-mingcute-right-line' : 'i-mingcute-left-line'" class="arrow"/>
        </button>
        <Transition name="submenu">
          <div v-if="openMenu === 'import'" :class="`pop-${popSide}`" class="sub-menu">
            <button :disabled="busy" class="row" @click="handleImportKrmc">
              <span class="i-mingcute-file-line" style="font-size: 20px"/>
              <span>导入krmc</span>
            </button>
            <button :disabled="busy" class="row" @click="handleImportImage">
              <span class="i-mingcute-pic-line" style="font-size: 20px"/>
              <span>导入图片</span>
            </button>
          </div>
        </Transition>
      </div>
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
import {computed, inject, onBeforeUnmount, onMounted, ref} from 'vue';
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

/** 保存 / 导入中，避免重复触发 */
const busy = ref(false);

/** 当前打开的子菜单 */
const openMenu = ref<'save' | 'import' | null>(null);
const saveWrapRef = ref<HTMLElement | null>(null);
const importWrapRef = ref<HTMLElement | null>(null);

/** 子菜单弹出方向：面板在屏幕右侧时向左弹，避免超出屏幕 */
const popSide = computed(() => (props.side === 'right' ? 'left' : 'right'));

function toggleMenu(kind: 'save' | 'import') {
  openMenu.value = openMenu.value === kind ? null : kind;
}

function onWindowPointerDown(e: PointerEvent) {
  if (!openMenu.value) return;
  const wraps = [saveWrapRef.value, importWrapRef.value];
  if (e.target instanceof Node && wraps.every((el) => el && !el.contains(e.target as Node))) {
    openMenu.value = null;
  }
}

onMounted(() => window.addEventListener('pointerdown', onWindowPointerDown, true));
onBeforeUnmount(() => window.removeEventListener('pointerdown', onWindowPointerDown, true));

/* ==================== Tauri / 工具函数 ==================== */

function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function downloadHref(href: string, name: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function handleSaveKrmc() {
  const inst = nwbRef?.value;
  if (!inst || busy.value) return;

  busy.value = true;
  try {
    const pages = inst.exportPages();
    if (!pages.length) {
      console.warn('[MenuPanel] 保存：无页面内容');
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

    const fileName = `whiteboard-${Date.now()}.krmc`;

    if (isTauri()) {
      // Tauri：弹出系统保存对话框，由用户选择位置和文件名
      const {save} = await import('@tauri-apps/plugin-dialog');
      const {writeFile} = await import('@tauri-apps/plugin-fs');
      const path = await save({
        title: '保存白板',
        defaultPath: fileName,
        filters: [{name: 'kurumichan 白板', extensions: ['krmc']}],
      });
      if (!path) return; // 用户取消
      await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
    } else {
      // 浏览器：回退为下载
      const url = URL.createObjectURL(blob);
      downloadHref(url, fileName);
      URL.revokeObjectURL(url);
    }
  } catch (e) {
    console.error('[MenuPanel] 保存失败:', e);
    alert(`保存失败：${(e as Error).message}`);
  } finally {
    busy.value = false;
    pen.panelKind = null;
  }
}

async function handleSaveImages() {
  const inst = nwbRef?.value;
  if (!inst || busy.value) return;

  busy.value = true;
  try {
    const urls: string[] = inst.renderHQImage('all', {scale: 2, format: 'png'});
    if (!urls.length) {
      console.warn('[MenuPanel] 保存图片：无页面内容');
      return;
    }

    if (isTauri()) {
      const {save, open} = await import('@tauri-apps/plugin-dialog');
      const {writeFile} = await import('@tauri-apps/plugin-fs');

      if (urls.length === 1) {
        const path = await save({
          title: '保存为图片',
          defaultPath: `whiteboard-${Date.now()}.png`,
          filters: [{name: 'PNG 图片', extensions: ['png']}],
        });
        if (!path) return; // 用户取消
        await writeFile(path, dataUrlToBytes(urls[0]));
      } else {
        // 多页：让用户选一个目录，逐页写出
        const dir = await open({title: '选择保存目录', directory: true});
        if (!dir) return; // 用户取消
        const {join} = await import('@tauri-apps/api/path');
        for (let i = 0; i < urls.length; i++) {
          const p = await join(dir as string, `page-${i + 1}.png`);
          await writeFile(p, dataUrlToBytes(urls[i]));
        }
        alert(`已保存 ${urls.length} 张图片`);
      }
    } else {
      urls.forEach((url, i) => downloadHref(url, `page-${i + 1}.png`));
    }
  } catch (e) {
    console.error('[MenuPanel] 保存图片失败:', e);
    alert(`保存图片失败：${(e as Error).message}`);
  } finally {
    busy.value = false;
    pen.panelKind = null;
  }
}

async function handleImportKrmc() {
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
          `[MenuPanel] 导入 ${pages.length} 页（覆盖全部页面），格式 v${manifest.version}`,
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

async function handleImportImage() {
  const inst = nwbRef?.value;
  if (!inst || busy.value) return;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.display = 'none';

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    busy.value = true;
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      await inst.addImage(dataUrl);
    } catch (e) {
      console.error('[MenuPanel] 导入图片失败:', e);
      alert(`导入图片失败：${(e as Error).message}`);
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
  overflow: visible;
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

.pop-wrap {
  position: relative;
}

.sub-menu {
  position: absolute;
  top: 0;
  width: 180px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12),
  0 0 0 0.5px rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.sub-menu.pop-right {
  left: calc(100% + 6px);
  transform-origin: left center;
}

.sub-menu.pop-left {
  right: calc(100% + 6px);
  transform-origin: right center;
}

.arrow {
  margin-left: auto;
  font-size: 16px;
  color: rgba(0, 0, 0, 0.35);
}

.submenu-enter-active,
.submenu-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.submenu-enter-from,
.submenu-leave-to {
  opacity: 0;
  transform: scale(0.94);
}
</style>