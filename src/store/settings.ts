import {defineStore} from 'pinia';
import {ref} from 'vue';

export type OcrMode = 'be' | 'fe';

/** 应用设置（对应本地 settings.json） */
export interface AppSettings {
    /** 手掌面积阈值：触摸面积超过该值视为手掌，触发手掌擦除 */
    handSizeValve: number;
    /** 橡皮大小（CSS px） */
    eraserSize: number;
    /** 新建页面默认背景色 */
    boardDefaultBgColor: string;
    /** 画笔默认颜色 */
    penToolDefaultColor: string;
    /** 图样笔内置图样（名称 → 图样配置） */
    spPenToolBuiltinPatterns: Record<string, unknown>;
    /** 画笔默认粗细 */
    penToolDefaultSize: number;
    /** 工具栏跟随书写侧：根据用户长期书写的一侧，自动把底部栏移到该侧（左右侧为竖向） */
    enableToolTipMoveWithWrite: boolean;
    /** 工具栏可拖动：显示拖动手柄（一条竖线），按住可自由移动工具栏 */
    ToolMovable: boolean;
    /** OCR 识别方式：be=后端（预留），fe=前端 PaddleOCR */
    ocrMode: OcrMode;
}

export const DEFAULT_SETTINGS: AppSettings = {
    handSizeValve: 500,
    eraserSize: 30,
    boardDefaultBgColor: '#ffffff',
    penToolDefaultColor: '#000000',
    spPenToolBuiltinPatterns: {},
    penToolDefaultSize: 4,
    enableToolTipMoveWithWrite: false,
    ToolMovable: false,
    ocrMode: 'be',
};

const KNOWN_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[];

/** 从外部 JSON 提取合法字段（类型不匹配的忽略） */
function pickKnown(json: Record<string, unknown>): Partial<AppSettings> {
    const out: Record<string, unknown> = {};
    for (const k of KNOWN_KEYS) {
        const v = json[k];
        if (v === undefined) continue;
        const dv = DEFAULT_SETTINGS[k];
        if (typeof dv === 'object') {
            if (typeof v === 'object' && v !== null) out[k] = v;
        } else if (typeof v === typeof dv) {
            out[k] = v;
        }
    }
    return out as Partial<AppSettings>;
}

export const useSettingsStore = defineStore('app-settings', () => {
    const settings = ref<AppSettings>({...DEFAULT_SETTINGS});

    /** 是否已成功从 settings.json 加载 */
    const loaded = ref(false);
    /** 加载来源（设置页展示用） */
    const loadedFrom = ref<string | null>(null);

    /* ---- 运行时 UI 状态（不持久化） ---- */
    /** 工具栏所在侧：bottom（横向底部）/ left / right（竖向贴边） */
    const barSide = ref<'bottom' | 'left' | 'right'>('bottom');
    /** 手动拖动后的自由位置（优先于 barSide） */
    const barPos = ref<{ x: number; y: number } | null>(null);

    function apply(partial: Partial<AppSettings>) {
        settings.value = {...settings.value, ...partial};
    }

    /**
     * 从本地 settings.json 读取配置。
     *
     * - Tauri：读取应用资源目录下的 settings.json
     *   （走官方 @tauri-apps/plugin-fs，无需自定义 Rust 代码）
     * - 浏览器：fetch('/settings.json')
     *
     * 失败时保留当前配置并返回 false。
     */
    async function loadFromDisk(): Promise<boolean> {
        try {
            let raw: string;
            let from: string;
            if ((window as any).__TAURI_INTERNALS__) {
                const {readTextFile} = await import('@tauri-apps/plugin-fs');
                const {BaseDirectory} = await import('@tauri-apps/api/path');
                raw = await readTextFile('settings.json', {baseDir: BaseDirectory.Resource});
                from = 'resource:settings.json';
            } else {
                const resp = await fetch('/settings.json');
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                raw = await resp.text();
                from = '/settings.json';
            }
            apply(pickKnown(JSON.parse(raw)));
            loaded.value = true;
            loadedFrom.value = from;
            return true;
        } catch (e) {
            console.warn('[settings] 读取 settings.json 失败，保留当前配置:', e);
            loaded.value = false;
            loadedFrom.value = null;
            return false;
        }
    }

    return {settings, loaded, loadedFrom, barSide, barPos, apply, loadFromDisk};
});
