import {onMounted, onUnmounted, provide, type Ref, shallowRef, watch} from 'vue';
import {nWb, type PageEffect, type SerializedPage, type ToolType, type TouchPointData,} from '@/nWb';
import {NWB_INSTANCE_KEY, usePenStore, useSettingsStore} from '@/store';

export interface DrawEventData {
    strokeId: string;
    mode: 'pen' | 'spPen' | 'image';
    points: number;
}

export interface EraseEventData {
    point: { x: number; y: number };
    radius: number;
}

export interface UseNwbOptions {
    canvasRef: Ref<HTMLCanvasElement | null>;
    storeId: string;
    effect?: PageEffect;
    mode?: 'tpdetect';
    persist?: boolean;
    onDraw?: (data: DrawEventData) => void;
    onErase?: (data: EraseEventData) => void;
    onTouch?: (data: TouchPointData) => void;
    onPointerDown?: (e: PointerEvent) => void;
    onPointerUp?: (e: PointerEvent) => void;
}

export function useNwb(options: UseNwbOptions) {
    const {
        canvasRef, storeId, effect = 'none', mode, persist = false,
        onDraw, onErase, onTouch, onPointerDown, onPointerUp,
    } = options;
    const store = usePenStore(storeId);
    const settingsStore = useSettingsStore();
    const nwb = shallowRef<nWb | null>(null);

    provide(NWB_INSTANCE_KEY, nwb);

    onMounted(async () => {
        if (!canvasRef.value) return;
        const inst = new nWb();

        inst.onPageChange = (idx, total) => {
            store.pageIndex = idx;
            store.pageCount = total;
        };
        inst.onScaleChange = (s) => {
            store.scale = s;
        };
        inst.onSelectionChange = (has) => {
            store.hasSelection = has;
        };
        inst.onHistoryChange = (u, r) => {
            store.canUndo = u;
            store.canRedo = r;
        };
        inst.onViewResize = (w, h) => {
            store.viewW = w;
            store.viewH = h;
        };

        inst.addEventListener('onDraw', (d: DrawEventData) => onDraw?.(d));
        inst.addEventListener('onErase', (d: EraseEventData) => onErase?.(d));
        inst.addEventListener('onTouch', (d: TouchPointData) => onTouch?.(d));
        inst.addEventListener('onPointerDown', (e: PointerEvent) => onPointerDown?.(e));
        inst.addEventListener('onPointerUp', (e: PointerEvent) => onPointerUp?.(e));

        await inst.init({
            canvas: canvasRef.value,
            changePageEffect: effect,
            mode,
        });

        inst.setPalmAreaSize(store.palmAreaSize);
        if (store.eraserImage) inst.setEraserImage(store.eraserImage);

        if (persist && store.snapshot && store.snapshot.length) {
            await inst.importPages(store.snapshot);
            inst.resetHistory();
        }

        // 应用全局设置中的画笔默认值（仅初始化时应用一次，之后以用户交互为准）
        store.color = settingsStore.settings.penToolDefaultColor;
        store.thick = settingsStore.settings.penToolDefaultSize;

        applyTool(inst, store);

        const size = inst.getViewSize();
        store.viewW = size.width;
        store.viewH = size.height;
        store.canUndo = inst.canUndo();
        store.canRedo = inst.canRedo();

        nwb.value = inst;
    });

    onUnmounted(() => {
        if (persist && nwb.value) {
            store.snapshot = nwb.value.exportPages();
        }
        nwb.value?.destroy();
        nwb.value = null;
    });

    watch(
        () => [store.color, store.thick, nwb.value] as const,
        () => {
            if (store.tool === 'pen' && nwb.value) {
                nwb.value.setPen({color: store.color, thick: store.thick});
            }
        },
    );

    watch(
        () => [store.tool, nwb.value] as const,
        () => applyTool(nwb.value, store),
    );

    watch(
        () => store.spPen,
        (v) => {
            if (v && store.tool === 'spPen') nwb.value?.setSpPen(v);
        },
    );

    watch(
        () => store.eraserSize,
        (size) => {
            if (store.tool === 'eraser') nwb.value?.setEraser(size);
        },
    );

    watch(
        () => store.eraserImage,
        (src) => {
            nwb.value?.setEraserImage(src);
        },
    );

    watch(
        () => store.palmAreaSize,
        (size) => {
            nwb.value?.setPalmAreaSize(size);
        },
    );

    // 全局设置 → 当前画板：橡皮大小 / 手掌阈值实时同步
    watch(
        () => settingsStore.settings.eraserSize,
        (v) => {
            store.eraserSize = v;
        },
        {immediate: true},
    );
    watch(
        () => settingsStore.settings.handSizeValve,
        (v) => {
            store.palmAreaSize = v;
        },
        {immediate: true},
    );

    const actions = {
        goNext: () => nwb.value?.goNext(),
        goPrev: () => nwb.value?.goPrev(),
        goTo: (n: number) => nwb.value?.goTo(n),
        newPage: (opts?: Parameters<nWb['newPage']>[0]) => nwb.value?.newPage(opts),
        exportPages: (): SerializedPage[] => nwb.value?.exportPages() ?? [],
        importPages: (p: SerializedPage[]) => nwb.value?.importPages(p),
        undo: () => nwb.value?.undo() ?? false,
        redo: () => nwb.value?.redo() ?? false,
        resetHistory: () => nwb.value?.resetHistory(),
        commitSelection: () => nwb.value?.commitSelection(),
        copySelection: () => nwb.value?.copySelection(),
        cancelSelection: () => nwb.value?.cancelSelection(),
        hasSelection: () => nwb.value?.hasSelection() ?? false,
        clearCurrentPage: () => nwb.value?.clearCurrentPage(),
        setEraserImage: (src: string | null) => {
            store.eraserImage = src;
        },
        setPalmAreaSize: (size: number) => {
            store.palmAreaSize = size;
        },
        getTouchPoints: () => nwb.value?.getTouchPoints() ?? [],
        isPalmErasing: () => nwb.value?.isPalmErasing() ?? false,
        renderHQImage: (
            range?: 'all' | number | [number, number],
            opts?: Parameters<nWb['renderHQImage']>[1],
        ) => nwb.value?.renderHQImage(range, opts) ?? [],
    };

    return {nwb, actions};
}

function applyTool(inst: nWb | null, store: ReturnType<typeof usePenStore>) {
    if (!inst) return;
    const tool = store.tool as ToolType;
    if (tool === 'pen') {
        inst.setPen({color: store.color, thick: store.thick});
    } else if (tool === 'spPen') {
        if (store.spPen) inst.setSpPen(store.spPen);
    } else if (tool === 'eraser') {
        inst.setEraser(store.eraserSize);
    } else {
        inst.setTool(tool);
    }
}