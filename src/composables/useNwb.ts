import { onMounted, onUnmounted, shallowRef, watch, type Ref } from 'vue';
import { nWb, type PageEffect } from '@/nWb';
import { usePenStore } from '@/store/penStore';

export interface UseNwbOptions {
    canvasRef: Ref<HTMLCanvasElement | null>;
    /** ★ 每个路由页传一个唯一 id（通常用路由 name 就够了） */
    storeId: string;
    effect?: PageEffect;
    /**
     * 是否在组件卸载时把画板内容保存到 store.snapshot，
     * 下次同 id 挂载时自动恢复。默认 false。
     * 若使用 <KeepAlive>，组件不会被卸载，不需要开这个。
     */
    persist?: boolean;
}

export function useNwb(options: UseNwbOptions) {
    const { canvasRef, storeId, effect = 'slide', persist = false } = options;
    const store = usePenStore(storeId);
    const nwb = shallowRef<nWb | null>(null);

    onMounted(async () => {
        if (!canvasRef.value) return;
        const inst = new nWb();

        // nWb → store
        inst.onPageChange = (idx, total) => {
            store.pageIndex = idx;
            store.pageCount = total;
        };
        inst.onScaleChange = (s) => { store.scale = s; };
        inst.onSelectionChange = (has) => { store.hasSelection = has; };

        await inst.init({ canvas: canvasRef.value, changePageEffect: effect });

        // 恢复画板内容
        if (persist && store.snapshot && store.snapshot.length) {
            await inst.importPages(store.snapshot);
        }

        // 应用当前工具 & 笔
        applyTool(inst, store);

        nwb.value = inst;
    });

    onUnmounted(() => {
        if (persist && nwb.value) {
            store.snapshot = nwb.value.exportPages();
        }
        nwb.value?.destroy();
        nwb.value = null;
    });

    // store → nWb
    watch(
        () => [store.color, store.thick] as const,
        () => { if (store.tool === 'pen') nwb.value?.setPen({ color: store.color, thick: store.thick }); },
    );

    watch(
        () => store.tool,
        () => applyTool(nwb.value, store),
    );

    watch(
        () => store.spPen,
        (v) => { if (v && store.tool === 'spPen') nwb.value?.setSpPen(v); },
    );

    const actions = {
        goNext: () => nwb.value?.goNext(),
        goPrev: () => nwb.value?.goPrev(),
        goTo:   (n: number) => nwb.value?.goTo(n),
        newPage:(opts?: Parameters<nWb['newPage']>[0]) => nwb.value?.newPage(opts),
        exportPages: () => nwb.value?.exportPages() ?? [],
        importPages: (p: Parameters<nWb['importPages']>[0]) => nwb.value?.importPages(p),
    };

    return { nwb, actions };
}

function applyTool(inst: nWb | null, store: ReturnType<typeof usePenStore>) {
    if (!inst) return;
    if (store.tool === 'pen') {
        inst.setPen({ color: store.color, thick: store.thick });
    } else if (store.tool === 'spPen') {
        if (store.spPen) inst.setSpPen(store.spPen);
    } else {
        inst.setTool(store.tool);
    }
}