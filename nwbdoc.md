# nWb 使用文档

> 版本：与 `@/nWb/index.ts` 同步
> 适用：Vue 3 / React / 原生 JS 均可，nWb 本身不依赖任何框架

---

## 目录

1. [概述](#1-概述)
2. [快速开始](#2-快速开始)
3. [核心概念](#3-核心概念)
4. [API 参考](#4-api-参考)
5. [类型参考](#5-类型参考)
6. [事件系统](#6-事件系统)
7. [选区操作详解](#7-选区操作详解)
8. [撤销 / 重做详解](#8-撤销--重做详解)
9. [文件格式 krmc](#9-文件格式-krmc)
10. [OCR 模块](#10-ocr-模块)
11. [手势与触摸](#11-手势与触摸)
12. [常见用例](#12-常见用例)
13. [注意事项与限制](#13-注意事项与限制)

---

## 1. 概述

`nWb` 是一个**零依赖、纯 Canvas 2D、无限画布**的白板内核。所有笔迹以矢量数据存储，视图缩放通过 Canvas transform 完成，无论放大到多少倍都保持矢量清晰。

### 1.1 核心能力

| 能力 | 说明 |
|---|---|
| **无限画布** | 相机可平移、缩放（0.05×~6000×），世界坐标无边界 |
| **多页面** | 每页有独立的 `cam`（相机）、`bgcolor`、`bgimg`、`strokes` |
| **三种笔迹** | `pen` 普通笔、`spPen` 图样笔、`image` 图片 |
| **矢量选区** | 套索圈选后移动 / 缩放，永远高清 |
| **数据级橡皮** | 橡皮直接切分笔迹，被擦除的部分**真实不存在**，移动缩放不"复活" |
| **手掌擦除** | 大面积触摸自动触发（希沃 / Ink Canvas 风格） |
| **撤销 / 重做** | 全量快照，`MAX_HISTORY = 50` |
| **高清导出** | `renderHQImage` 按任意倍率输出 |
| **事件系统** | `onDraw` / `onErase` / `onTouch` / `onPointerDown` / `onPointerUp` |
| **krmc 文件** | ZIP 容器，资源 sha256 去重，支持量化 / 二进制化 / 远程内联 |
| **OCR** | 按需加载 PaddleOCR.js，识别画布选区内容为文字 |

### 1.2 设计取舍

- **纯 Canvas 2D**：不使用 WebGL，兼容性最好；大量笔迹时通过离屏画布 + 视口裁剪保证性能
- **矢量存储**：笔迹以点集存储，缩放/导出永远清晰
- **不做矢量语法糖**（矩形/圆形等）：所有内容最终都是"笔迹"，语义简单
- **全量快照历史**：实现简单可靠，长会话时可定期 `resetHistory` 控制内存

---

## 2. 快速开始

### 2.1 安装依赖

```bash
npm i fflate                           # krmc 依赖
npm i @paddleocr/paddleocr-js          # OCR 依赖（按需，可后装）
```

### 2.2 最小示例

```html
<canvas id="board" style="width: 100vw; height: 100vh; display: block; touch-action: none;"></canvas>
```

```typescript
import { nWb } from '@/nWb';

const nwb = new nWb();
await nwb.init({ canvas: '#board', changePageEffect: 'slide' });

// 默认就是普通笔，也可以显式设置
nwb.setPen({ color: '#1a1a1a', thick: 4 });

// 监听事件
nwb.addEventListener('onDraw', (d) => {
    console.log('画完一笔', d.strokeId, d.points, '个点');
});
```

### 2.3 完整示例（带工具栏）

```typescript
import { nWb } from '@/nWb';
import { saveKrmc, loadKrmc, renderKrmcThumbnail } from '@/nWb/krmc';

const nwb = new nWb();
await nwb.init({ canvas: '#board' });

// 画笔颜色
nwb.setPen({ color: '#ff3b30', thick: 4 });

// 橡皮
nwb.setEraser(30);

// 切回画笔
nwb.setTool('pen');

// 撤销 / 重做
nwb.undo();
nwb.redo();

// 翻页
await nwb.newPage({ bgcolor: '#f5f5f7' });
nwb.goNext();
nwb.goTo(1);

// 导出 krmc
const pages = nwb.exportPages();
const thumbnail = renderKrmcThumbnail(nwb, 0, 480, 360);
const blob = await saveKrmc(pages, { title: '会议', thumbnail });
downloadBlob(blob, 'board.krmc');

// 导入 krmc
const { pages: imported } = await loadKrmc(file);
await nwb.importPages(imported);

// 高清导出
const pngs = nwb.renderHQImage('all', { scale: 3, format: 'png' });
pngs.forEach((url, i) => downloadDataUrl(url, `page-${i + 1}.png`));
```

---

## 3. 核心概念

### 3.1 坐标系

nWb 有两套坐标：

| 坐标系 | 单位 | 用途 |
|---|---|---|
| **世界坐标** | 与显示无关，无限延伸 | 笔迹数据存储 |
| **屏幕坐标** | CSS 像素 | 触摸/鼠标事件输入、UI 覆盖层 |

转换关系：

```
screen.x = world.x * cam.scale + cam.tx
screen.y = world.y * cam.scale + cam.ty

world.x = (screen.x - cam.tx) / cam.scale
world.y = (screen.y - cam.ty) / cam.scale
```

- **相机 `cam`**：`{ scale, tx, ty }`，每页独立
- **`scale`**：缩放倍数，范围 `[0.05, 6000]`
- **`tx / ty`**：世界原点在屏幕上的位置

### 3.2 页面

每页是一个 `Page`，包含：

```typescript
interface Page {
    id: string;
    bgcolor: string;              // 背景色
    bgimg?: HTMLImageElement;     // 背景图
    bgimgSrc?: string;            // 背景图 URL（序列化用）
    strokes: Stroke[];            // 笔迹数组
    cam: { scale, tx, ty };       // 独立相机
}
```

- 新建页默认白底、空笔迹、相机归位（`scale: 1`）
- 翻页不改变任何页的数据，只切换 `pageIndex` 和活动相机

### 3.3 笔迹

三种笔迹模式（`mode`）：

| mode | 说明 | 序列化字段 |
|---|---|---|
| `pen` | 普通笔，带笔锋 | `color`, `width`, `tailLen` |
| `spPen` | 图样笔，用 `CanvasPattern` 填充 | `patternSrc`, `patternWorldSize` |
| `image` | 图片，用 `drawImage` 绘制 | `imgSrc`, `imgW`, `imgH` |

**关键约定**：

- **`width`** 存的是**世界单位**
- 画下时按「屏幕像素 / 当前缩放」换算，保证画下瞬间屏幕上粗细恒定
- 之后随视图缩放，视觉粗细同步变化

### 3.4 相机

`cam` 是页面的一个字段，切换页时 `this.cam` 会自动指向当前页的 `cam` 引用。

**浮动原点机制**：当 `|tx|` 或 `|ty|` 超过 `1e10` 时，会把所有笔迹的世界坐标整体平移，让 `tx/ty` 回到视口中心，防止双精度浮点丢失精度。

### 3.5 选区

选区不是"像素快照"，而是**笔迹引用 + 快照**：

```typescript
interface Selection {
    active: boolean;
    x, y, w, h;                    // 世界坐标的选区矩形
    mode: 'none' | 'lasso' | 'move' | 'resize';
    handle: 'nw' | 'ne' | 'sw' | 'se' | null;
    strokeIds: Set<string>;        // 选中的笔迹 ID
    strokeSnapshots: Map<string, StrokeSnapshot>;   // 操作前快照
}
```

移动 / 缩放**直接修改笔迹坐标**，因此选中后移动/缩放永远矢量、高清。

### 3.6 历史

- 全量快照，`MAX_HISTORY = 50`
- 快照只拷贝**可序列化字段**（`points`、`bbox`、`cam`），运行时对象（`imgEl`、`patternImage`、`patternObj`、`bgimg`）**共享引用**
- 内存占用约 `50 × 页面总笔迹数 × 每笔点数 × 16 bytes`

---

## 4. API 参考

### 4.1 生命周期

#### `init(opts: nWbInitOptions): Promise<void>`

初始化白板。**只能调用一次**，重复调用只 warn。

```typescript
await nwb.init({
    canvas: '#board',              // 或 HTMLCanvasElement
    changePageEffect: 'slide',     // 'slide' | 'fade' | 'none'，默认 'none'
    mode: undefined,               // 'tpdetect' 时进入触摸点调试模式
});
```

**副作用**：
- 绑定所有 pointer / wheel 事件
- 创建 `ResizeObserver` 和 `window.resize` 监听
- 若 `pages` 为空，创建首屏白底页
- 初始化历史栈，emit 一次 `onPageChange` / `onScaleChange`

#### `destroy(): void`

销毁。解绑所有事件、清空历史、释放离屏画布。

**注意**：销毁后必须重新 `init()` 才能使用。

---

### 4.2 画笔 / 工具

#### `setPen(opts: nWbPenOptions): void`

设置普通笔并切到 `pen` 工具。

```typescript
nwb.setPen({ color: '#1a1a1a', thick: 4 });
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `color` | `string` | 颜色字符串 |
| `thick` | `number` | 画下瞬间的屏幕宽度（CSS px） |

**行为**：会先 `commitSelectionIfActive()`（提交当前选区）。

#### `setSpPen(opts: nWbSpPenOptions): Promise<void>`

设置图样笔并切到 `spPen` 工具。**异步加载图样图片**。

```typescript
// 使用预注册的图样
await nwb.registerBuiltIn('star', '/assets/star.png');
await nwb.setSpPen({ pattern: 'star', type: 'built-in', size: 32 });

// 使用远程图片
await nwb.setSpPen({ pattern: 'https://x.com/emoji.png', type: 'url', size: 40 });
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `pattern` | `string` | built-in 名 / URL |
| `type` | `'built-in' \| 'url'` | |
| `size` | `number` | 画下瞬间的屏幕尺寸（CSS px） |

**异常**：`type: 'built-in'` 且未通过 `registerBuiltIn` 注册时抛错。

#### `setEraser(size: number): void`

设置橡皮大小（屏幕像素直径）并切到 `eraser` 工具。

```typescript
nwb.setEraser(30);
```

#### `setTool(tool: ToolType): void`

切换到指定工具。

```typescript
nwb.setTool('pen');      // 切画笔
nwb.setTool('eraser');   // 切橡皮
nwb.setTool('select');   // 切选区
nwb.setTool('spPen');    // 切图样笔（需先 setSpPen）
```

**注意**：
- 切换到非 `select` 会清空当前选区
- `spPen` 需先 `setSpPen`
- `shape` / `ocr` / `beautify` 等未实现的工具会 warn 并忽略

#### `getTool(): ToolType`

返回当前工具。

#### `registerBuiltIn(name: string, src: string): Promise<void>`

注册一个内置图样。

```typescript
await nwb.registerBuiltIn('heart', '/assets/heart.png');
await nwb.setSpPen({ pattern: 'heart', type: 'built-in', size: 24 });
```

---

### 4.3 橡皮擦扩展

#### `setEraserImage(src: string | null): void`

设置自定义橡皮擦图片。设置后，`eraser` 工具下会渲染图片（跟随指针，半透明）。

```typescript
nwb.setEraserImage('/assets/eraser.png');   // 设置
nwb.setEraserImage(null);                    // 恢复默认圆形
```

**注意**：手掌擦除时不显示图片（因为是手掌，不是指针）。

#### `setPalmAreaSize(area: number): void`

调整手掌面积阈值（平方像素）。触摸点的 `width * height` 超过此值即视为手掌。

```typescript
nwb.setPalmAreaSize(800);
```

**默认 500**。不同设备差异大，建议先用 `tpdetect` 模式实测。

---

### 4.4 页面

#### `newPage(opts?: nWbNewPageOptions): Promise<void>`

新建一页追加到末尾（不自动跳转）。

```typescript
await nwb.newPage({ bgcolor: '#f5f5f7' });
await nwb.newPage({ bgimg: '/assets/paper.jpg' });
```

- 若提供 `bgimg`，会加载并按视口等比适配居中
- **会记录一次历史**
- emit `onPageChange`

#### `goTo(pageNum: number): void`

跳转到指定页（**从 1 开始**）。

```typescript
nwb.goTo(1);   // 第一页
nwb.goTo(3);   // 第三页
```

- 提交当前选区
- 结束进行中的翻页动画
- 有 `changePageEffect` 时播放过渡动画
- 翻页**不记历史**

#### `goPrev(): void` / `goNext(): void`

上一页 / 下一页。已在边界则无操作。

---

### 4.5 导入 / 导出

#### `exportPages(): SerializedPage[]`

导出全部页面为纯数据（可 JSON 序列化）。

```typescript
const pages = nwb.exportPages();
const json = JSON.stringify(pages);
```

**返回结构**：

```typescript
interface SerializedPage {
    id: string;
    bgcolor: string;
    bgimgSrc?: string;         // 背景图 URL 或 data URL
    cam: { scale, tx, ty };
    strokes: SerializedStroke[];
}

interface SerializedStroke {
    id: string;
    mode: 'pen' | 'spPen' | 'image';
    points: Array<[number, number]>;   // 世界坐标
    width: number;
    color?: string;
    patternSrc?: string;
    patternWorldSize?: number;
    tailLen?: number;
    imgSrc?: string;
    imgW?: number;
    imgH?: number;
}
```

#### `importPages(pages: SerializedPage[]): Promise<void>`

批量导入页面，**覆盖所有现有页面**。

```typescript
await nwb.importPages(JSON.parse(json));
```

- 图片类字段会异步加载（返回 Promise 表示全部加载完成）
- 重置 `pageIndex` 到 0
- **会记录一次历史**
- 传入空数组回落为 1 张空白页

---

### 4.6 查询

| 方法 | 返回 | 说明 |
|---|---|---|
| `getPageIndex()` | `number` | 当前页码（1-based） |
| `getPageCount()` | `number` | 总页数 |
| `getScale()` | `number` | 当前缩放倍数 |
| `getViewSize()` | `{ width, height }` | 主画布视口尺寸（CSS px） |
| `getCurrentTapPoints()` | `number` | 当前按下的 pointer 数量 |
| `getTouchPoints()` | `TouchPointData[]` | 所有触摸点的最新数据 |
| `isPalmErasing()` | `boolean` | 是否处于手掌擦除状态 |
| `getHistoryIndex()` | `number` | 历史栈当前位置 |
| `getHistoryLength()` | `number` | 历史栈快照总数 |

---

### 4.7 渲染输出

#### `renderPageThumbnail(pageIndex, canvas, cssW, cssH): void`

渲染指定页缩略图到目标 canvas。

```typescript
const canvas = document.createElement('canvas');
nwb.renderPageThumbnail(0, canvas, 240, 180);
const dataUrl = canvas.toDataURL('image/webp', 0.85);
```

- 内容范围：**当前主画布视口对应的世界矩形**（所有页缩略图同一世界区域，便于对比）
- 内部使用 `window.devicePixelRatio`，缩略图同样高清

#### `renderHQImage(range?, options?): string[]`

渲染指定范围的页面为高清 dataURL 数组。

```typescript
// 全部页面，2× 缩放，PNG
const urls = nwb.renderHQImage('all');

// 单页 0，3×，JPEG
const urls = nwb.renderHQImage(0, { scale: 3, format: 'jpeg', quality: 0.92 });

// 第 1~3 页，4×，WebP
const urls = nwb.renderHQImage([0, 2], { scale: 4, format: 'webp' });
```

| 参数 | 说明 |
|---|---|
| `range` | `'all'` / `number`（单页）/ `[start, end]`（含两端） |
| `options.scale` | 相对主画布 CSS 像素的倍数，默认 `2` |
| `options.format` | `'png' \| 'jpeg' \| 'webp'`，默认 `'png'` |
| `options.quality` | 0~1，仅 jpeg / webp 有效 |

---

### 4.8 清空当前页

#### `clearCurrentPage(): void`

清空当前页所有笔迹，**记入历史（可撤销）**。

```typescript
nwb.clearCurrentPage();
```

---

## 5. 类型参考

### 5.1 基础类型

```typescript
type PageEffect = 'slide' | 'fade' | 'none';
type ToolType = 'pen' | 'spPen' | 'select' | 'eraser';
type EventType = 'onDraw' | 'onErase' | 'onTouch' | 'onPointerDown' | 'onPointerUp';
type EventHandler = (data?: any) => void;
```

### 5.2 触摸点数据

```typescript
interface TouchPointData {
    id: number;                   // pointerId
    x: number;                    // 屏幕坐标（CSS px）
    y: number;
    pressure: number;             // 0~1
    width: number;                // 接触面积宽（像素）
    height: number;               // 接触面积高（像素）
    type: 'finger' | 'pen' | 'palm' | 'eraser';
}
```

**`type` 判定规则**：

| 条件 | 类型 |
|---|---|
| `pointerType === 'pen'` 且 `button === 5` | `eraser` |
| `pointerType === 'pen'` | `pen` |
| `pointerType === 'touch'` 且 `width * height > palmAreaSize` | `palm` |
| `pointerType === 'touch'` | `finger` |
| 其他（鼠标等） | `finger` |

---

## 6. 事件系统

### 6.1 订阅 / 退订

```typescript
nwb.addEventListener('onDraw', handler);
nwb.removeEventListener('onDraw', handler);
```

### 6.2 回调字段（可直接赋值）

```typescript
nwb.onPageChange = (pageIndex, pageCount) => { /* 1-based */ };
nwb.onScaleChange = (scale) => { /* 0.05 ~ 6000 */ };
nwb.onSelectionChange = (hasSelection) => { /* true / false */ };
nwb.onHistoryChange = (canUndo, canRedo) => { /* 控制按钮 disabled */ };
nwb.onViewResize = (width, height) => { /* 主画布视口尺寸（CSS px） */ };
```

### 6.3 事件类型

| 事件 | 触发时机 | 数据 |
|---|---|---|
| `onDraw` | 一笔绘制完成 | `{ strokeId, mode, points }` |
| `onErase` | 每次擦除（含手掌、橡皮、笔的橡皮端） | `{ point, radius }` |
| `onTouch` | 任何触摸点按下 / 移动 | `TouchPointData` |
| `onPointerDown` | 底层 pointerdown | `PointerEvent` |
| `onPointerUp` | 底层 pointerup | `PointerEvent` |

### 6.4 使用示例

```typescript
nwb.addEventListener('onDraw', ({ strokeId, mode, points }) => {
    console.log(`画了 ${mode}，${points} 个点，id=${strokeId}`);
});

nwb.addEventListener('onErase', ({ point, radius }) => {
    console.log(`擦除中心 (${point.x.toFixed(1)}, ${point.y.toFixed(1)})，半径 ${radius.toFixed(1)}`);
});

nwb.onHistoryChange = (canUndo, canRedo) => {
    undoBtn.disabled = !canUndo;
    redoBtn.disabled = !canRedo;
};
```

---

## 7. 选区操作详解

### 7.1 交互流程

1. `setTool('select')` 进入选区模式
2. 在空白处拖拽 → **套索圈选**
3. 松手 → **完成选区**，显示虚线框 + 四角手柄
4. 拖动手柄 → **缩放**；拖动内部 → **移动**
5. 点击选区外 → **提交**（笔迹保持在新位置）
6. 点击 `copySelection` 按钮 → **复制**（原位置保留副本）
7. 点击 `cancelSelection` 按钮 → **取消**（回滚到原位置）

### 7.2 公开 API

#### `commitSelection(): void`

提交选区（笔迹保持新位置）。**会记录一次历史**。

#### `copySelection(): void`

复制选区（笔迹留新位置，原位置生成副本）。**会记录一次历史**。

#### `cancelSelection(): void`

取消选区（回滚到原位置）。**不记历史**（等于"没做"）。

#### `hasSelection(): boolean`

当前是否存在选区。

### 7.3 选区的匹配规则

`finishLasso` 的判定逻辑（**当前版本**）：

```typescript
// 1. bbox 相交快速剔除
if (stroke.bbox 与 lasso bbox 不相交) continue;

// 2. 精确判定：遍历笔迹的每个点 + 相邻点中点
//    只要有一个点落在套索多边形内，即选中
```

**判定精度**：bbox 相交 + 采样点（每个点 + 点间中点）在套索内。

**局限**：若笔画大量采样点都在套索外，但中间穿过套索，可能漏选。日常使用可忽略（笔迹采样密度通常 > 每像素一个点）。

### 7.4 选区的渲染

- 虚线框：屏幕坐标下 2px 蓝色虚线（不受缩放影响）
- 四角手柄：12×12 白底蓝框方块
- 移动 / 缩放时实时预览

---

## 8. 撤销 / 重做详解

### 8.1 API

```typescript
nwb.canUndo();         // boolean
nwb.canRedo();         // boolean
nwb.undo();            // boolean，成功返回 true
nwb.redo();            // boolean
nwb.resetHistory();    // 清空历史，把当前状态记为初始快照
```

### 8.2 什么操作会入历史

| 操作 | 入历史 |
|---|---|
| 画一笔 | ✅ 一次 |
| 擦除（一次擦除会话） | ✅ 一次（`historyDirty` 合并整段擦除） |
| 圈选 | ❌ 不改变数据 |
| 移动 / 缩放后松手 | ✅ 一次 |
| 提交选区 | ✅ 一次 |
| 复制选区 | ✅ 一次 |
| 取消选区 | ❌ 恢复原状 |
| 新建页 / 导入页 | ✅ 一次 |
| 翻页 | ❌ 只切视图 |
| 缩放 / 平移画布 | ❌ 只切视图 |
| `clearCurrentPage` | ✅ 一次 |

### 8.3 快照深度

`clonePages()` **只深拷贝可序列化字段**：

- `points`：每个点 `{ x, y }` 深拷贝
- `bbox`：深拷贝
- `cam`：深拷贝
- 运行时对象共享引用：`imgEl` / `patternImage` / `patternObj` / `bgimg`

**优势**：撤销/重做瞬间完成，不需要重新加载图片。

**潜在顾虑**：如果某个图片对象被回收（`imgEl` 置空），快照也会失效——但由于整个生命周期内 `imgEl` 一旦加载就不会主动丢弃，所以安全。

### 8.4 内存控制

`MAX_HISTORY = 50`。超出后丢弃最旧的一条。

长会话建议定期 `resetHistory()`（例如用户保存时），避免历史栈长期占用内存。

---

## 9. 文件格式 krmc

### 9.1 格式概览

`.krmc` = **K**anvas **R**esource **M**edia **C**ontainer

**ZIP 容器结构**：

```
board.krmc (ZIP)
├── mimetype              // 首文件、不压缩，固定 "application/x-krmc"
├── manifest.json         // 元数据 + 资源清单 + 二进制清单
├── document.json         // 全部页面 & 笔迹
├── thumbnail.webp        // 首屏缩略图（可选）
├── assets/<hash>.<ext>   // 图片 / 背景图 / 图样（sha256 去重）
└── strokes/<id>.bin      // 笔画点位二进制（可选）
```

### 9.2 特性

| 特性 | 说明 |
|---|---|
| **纯 ZIP** | 任何解压工具都能打开，方便调试 |
| **资源去重** | 按内容 sha256 去重，跨页复用只存一份 |
| **点量化** | 坐标 × 64 存整数，体积再降 30%+ |
| **二进制化** | 笔画数 ≥ 阈值自动切二进制，规避 JSON 爆炸 |
| **远程内联** | 保存时自动下载远程图片并内联，无外链依赖 |
| **ZIP 炸弹防护** | 两段式解压（先 manifest 校验，再全量） |
| **版本迁移** | `manifest.version` + `MIGRATIONS` 表 |

### 9.3 API

#### `saveKrmc(pages: SerializedPage[], options?: KrmcSaveOptions): Promise<Blob>`

保存为 krmc Blob。

```typescript
import { saveKrmc, renderKrmcThumbnail } from '@/nWb/krmc';

const pages = nwb.exportPages();
const thumbnail = renderKrmcThumbnail(nwb, 0, 480, 360);

const blob = await saveKrmc(pages, {
    title: '会议白板',
    appVersion: '1.0.0',
    thumbnail,
    // 以下都是默认值，可省略
    quantize: true,
    strokeBinary: 'auto',
    inlineRemote: true,
    strictRemote: true,     // 远程图片下载失败则抛错（保证自包含）
});

// 下载
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `board-${Date.now()}.krmc`;
a.click();
URL.revokeObjectURL(url);
```

**`KrmcSaveOptions` 完整字段**：

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `title` | `string` | `'untitled'` | 标题 |
| `appVersion` | `string` | - | 应用版本 |
| `compressionLevel` | `0~9` | `6` | ZIP 压缩级别 |
| `thumbnail` | `string` | - | 缩略图 dataURL（推荐 webp） |
| `quantize` | `boolean` | `true` | 是否量化坐标 |
| `strokeBinary` | `'auto' \| 'always' \| 'never'` | `'auto'` | 二进制化策略 |
| `binaryThreshold` | `number` | `500` | 'auto' 模式的笔画数阈值 |
| `inlineRemote` | `boolean` | `true` | 是否下载远程图片并内联 |
| `remoteTimeout` | `number` | `10000` | 远程下载超时（ms） |
| `strictRemote` | `boolean` | `false` | 下载失败是否抛错 |

#### `loadKrmc(input: Blob | ArrayBuffer | Uint8Array, options?: KrmcLoadOptions): Promise<KrmcLoadResult>`

解析 krmc 文件。

```typescript
import { loadKrmc } from '@/nWb/krmc';

const { pages, manifest } = await loadKrmc(file, {
    verifyHash: false,   // 是否校验每个资源的 sha256（慢）
});

await nwb.importPages(pages);
console.log(`格式 v${manifest.version}，${pages.length} 页`);
```

**`KrmcLoadResult`**：

```typescript
interface KrmcLoadResult {
    pages: SerializedPage[];
    manifest: KrmcManifest;
}
```

#### `renderKrmcThumbnail(nwb, pageIndex, width, height, quality?): string`

渲染某页缩略图 dataURL。

```typescript
const thumbnail = renderKrmcThumbnail(nwb, 0, 480, 360, 0.85);
```

- 优先 webp，不支持时自动降级 png
- 内部调用 `nwb.renderPageThumbnail`

### 9.4 常量

```typescript
import { KRMC_MIME, KRMC_FORMAT, KRMC_VERSION } from '@/nWb/krmc';

KRMC_MIME;     // 'application/x-krmc'
KRMC_FORMAT;   // 'krmc'
KRMC_VERSION;  // 1
```

### 9.5 安全上限

| 限制 | 值 |
|---|---|
| 压缩后最大 | 200 MB |
| 解压后最大 | 500 MB |
| 最大页面数 | 500 |
| 最大资源数 | 5000 |
| 资源总大小 | 150 MB |
| 二进制笔画数 | 20000 |
| 二进制总大小 | 200 MB |

---

## 10. OCR 模块

### 10.1 概览

基于 `@paddleocr/paddleocr-js`，**完全在浏览器端运行**（ONNX Runtime Web + WASM），不会上传图片到服务器。

**按需加载**：首次调用 `recognize` 才会下载几 MB 的模型。

### 10.2 安装

```bash
npm i @paddleocr/paddleocr-js
```

### 10.3 API

#### `getOcr(options?): Promise<PaddleOcrInstance>`

获取（懒加载）OCR 实例。多次调用只初始化一次。

```typescript
import { getOcr } from '@/nWb/ocr';

const ocr = await getOcr({ lang: 'ch', ocrVersion: 'PP-OCRv6', worker: true });
```

**`OcrOptions`**：

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `lang` | `string` | `'ch'` | 语言 |
| `ocrVersion` | `'PP-OCRv5' \| 'PP-OCRv6'` | `'PP-OCRv6'` | 模型版本 |
| `worker` | `boolean` | `true` | 是否用 Web Worker 推理 |
| `modelBaseUrl` | `string` | - | 自定义模型地址（如自建 CDN） |

#### `recognize(image, options?): Promise<OcrResult>`

识别单张图片。

```typescript
import { recognize } from '@/nWb/ocr';

const canvas = document.createElement('canvas');
// ... 把选区画到 canvas ...
const result = await recognize(canvas, { lang: 'ch' });

console.log(result.items.map(i => i.text).join('\n'));
```

**支持的输入**：`HTMLCanvasElement` / `HTMLImageElement` / `ImageData` / `Blob` / `ImageBitmap`。

#### `recognizeBatch(images, options?): Promise<OcrResult[]>`

批量识别。

#### `recognizeText(image, options?): Promise<string>`

只取纯文本（按行拼接）。

```typescript
const text = await recognizeText(canvas);
console.log(text);
```

#### `disposeOcr(): void`

释放 OCR 实例（一般不需要手动调用）。

### 10.4 返回类型

```typescript
interface OcrResult {
    image: { width: number; height: number };
    items: OcrItem[];
    metrics?: {
        detMs?: number;         // 检测耗时
        recMs?: number;         // 识别耗时
        totalMs?: number;
        detectedBoxes?: number;
        recognizedCount?: number;
    };
}

interface OcrItem {
    poly: number[][];    // [[x0,y0], [x1,y1], [x2,y2], [x3,y3]]
    text: string;
    score: number;       // 0~1
}
```

### 10.5 与白板选区集成

```typescript
import { recognizeText } from '@/nWb/ocr';

async function ocrSelection() {
    if (!nwb.hasSelection()) {
        alert('请先圈选要识别的区域');
        return;
    }

    // 从主画布截取选区（需要 nWb 暴露 selection / cam / canvas）
    const sel = (nwb as any).selection;
    const cam = (nwb as any).cam;
    const mainCanvas = (nwb as any).canvas;
    const dpr = window.devicePixelRatio || 1;

    const sx = sel.x * cam.scale + cam.tx;
    const sy = sel.y * cam.scale + cam.ty;
    const sw = sel.w * cam.scale;
    const sh = sel.h * cam.scale;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw * dpr));
    canvas.height = Math.max(1, Math.round(sh * dpr));

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
        mainCanvas,
        sx * dpr, sy * dpr, sw * dpr, sh * dpr,
        0, 0, canvas.width, canvas.height,
    );

    const text = await recognizeText(canvas);
    console.log('识别结果：', text);
}
```

> 建议在 `nWb` 里加三个 getter 让业务层能访问：`getSelectionBBox()`、`getCam()`、`getCanvasElement()`。

---

## 11. 手势与触摸

### 11.1 手势总览

| 手势 | 行为 |
|---|---|
| 单指 / 鼠标拖动 | 绘制（`pen` / `spPen`）或擦除（`eraser`） |
| **双指捏合** | 缩放画布（以两指中点为缩放中心） |
| **双指拖动** | 平移画布 |
| 手掌大面积触摸 | 触发**手掌擦除** |
| 笔的橡皮端（`button 5`） | 直接擦除（无需切工具） |
| 滚轮 / 触控板 | 缩放画布 |

### 11.2 双指缩放细节

- 缩放范围：`[0.05, 6000]`
- 以两指中点为锚点，缩放前中点对应的世界坐标保持不变
- 双指手势开始时，**如果当前正在画一笔，会提交这笔**（不丢弃）

### 11.3 手掌擦除

**触发条件**：任一触摸点的 `width * height > palmAreaSize`

**橡皮大小**：

```
sizeScreen = max(60, sqrt(area) * 0.8)      // CSS 像素
```

面积越大橡皮越大。

**退出手掌擦除**：所有触摸点的面积都低于阈值时自动退出，并记录一次历史。

### 11.4 tpdetect 调试模式

初始化时 `mode: 'tpdetect'` 进入触摸点可视化模式：

- 每个触摸点渲染一个彩色圆圈（颜色由 `pointerId` 哈希生成）
- 圈内小实心圆表示压力值
- 手掌 / 大面积接触用红色虚线框高亮
- 显示 `ID / type / pressure / area` 文字标签
- **不进行任何绘制 / 擦除 / 手势操作**

**用途**：在真实设备上实测触摸面积，确定 `palmAreaSize` 阈值。

```typescript
await nwb.init({ canvas: '#debug', mode: 'tpdetect' });

nwb.addEventListener('onTouch', (d) => {
    console.log(`id=${d.id} type=${d.type} area=${d.width * d.height}`);
});
```

---

## 12. 常见用例

### 12.1 颜色选择器联动

```typescript
colorInput.addEventListener('input', (e) => {
    nwb.setPen({ color: e.target.value, thick: currentThick });
});
```

### 12.2 滑块调整粗细

```typescript
thickSlider.addEventListener('input', (e) => {
    currentThick = parseInt(e.target.value, 10);
    nwb.setPen({ color: currentColor, thick: currentThick });
});
```

### 12.3 滑动清屏

```typescript
// 一次滑动到底部后
nwb.clearCurrentPage();
```

### 12.4 长按关闭（Tauri）

```typescript
nwb.addEventListener('onPointerDown', () => { /* ... */ });

// 长按 3s 后
async function closeWindow() {
    if (window.__TAURI__) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().close();
    } else {
        window.close();
    }
}
```

### 12.5 导入导出完整流程

```typescript
import { saveKrmc, loadKrmc, renderKrmcThumbnail } from '@/nWb/krmc';

// ---- 导出 ----
async function exportBoard() {
    const pages = nwb.exportPages();
    const thumbnail = renderKrmcThumbnail(nwb, 0, 480, 360);

    const blob = await saveKrmc(pages, {
        title: 'board',
        appVersion: '1.0.0',
        thumbnail,
        strictRemote: true,   // 严格内联
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `board-${Date.now()}.krmc`;
    a.click();
    URL.revokeObjectURL(url);
}

// ---- 导入 ----
async function importBoard(file: File) {
    const { pages, manifest } = await loadKrmc(file, { verifyHash: false });
    console.log(`导入 ${pages.length} 页，格式 v${manifest.version}`);
    await nwb.importPages(pages);
}
```

### 12.6 缩略图抽屉

```typescript
// 渲染当前页缩略图
function renderThumbs() {
    for (let i = 0; i < nwb.getPageCount(); i++) {
        const canvas = document.createElement('canvas');
        nwb.renderPageThumbnail(i, canvas, 240, 180);
        thumbContainer.appendChild(canvas);
    }
}

// 点击缩略图跳转
thumbContainer.addEventListener('click', (e) => {
    const idx = parseInt(e.target.dataset.pageIndex, 10);
    nwb.goTo(idx + 1);
});
```

### 12.7 Vue 3 集成（推荐）

```typescript
import { onMounted, onUnmounted, shallowRef } from 'vue';
import { nWb } from '@/nWb';

export function useNwb(canvasRef: Ref<HTMLCanvasElement | null>) {
    const nwb = shallowRef<nWb | null>(null);

    onMounted(async () => {
        if (!canvasRef.value) return;
        const inst = new nWb();
        await inst.init({ canvas: canvasRef.value });
        nwb.value = inst;
    });

    onUnmounted(() => {
        nwb.value?.destroy();
        nwb.value = null;
    });

    return { nwb };
}
```

---

## 13. 注意事项与限制

### 13.1 使用注意

1. **`init` 只能调用一次**：重复调用只 warn，不会重置。需要重置请 `destroy` 后重新 `init`。
2. **`destroy` 后必须重新 `init`**：所有字段被清空，不能直接复用。
3. **`canvas` 必须有尺寸**：`init` 时会 `getBoundingClientRect` 获取 CSS 尺寸。尺寸为 0 时需要显式设置样式。
4. **`touch-action: none`**：`init` 会自动设置，防止浏览器接管触摸手势。
5. **缩放范围**：`[0.05, 6000]`，超出的缩放请求会被 clamp。
6. **手掌阈值**：`palmAreaSize` 默认 500，不同设备差异大，务必先用 `tpdetect` 实测。

### 13.2 已知限制

| 限制 | 说明 | 建议 |
|---|---|---|
| **单指不能平移** | 单指拖动永远绘制 / 擦除，只有双指能平移 | 设计取舍；如需单指平移需额外加"平移工具" |
| **全量快照历史** | 每次 push 克隆所有笔迹的 points | 长会话定期 `resetHistory()` |
| **每帧全量重绘** | 无脏矩形 / tile 缓存 | 日常场景足够；几千笔以上可考虑后续优化 |
| **橡皮求交无索引** | 遍历所有笔画做 bbox 粗筛 | 同上 |
| **`image` 笔迹无法局部擦除** | 图片与橡皮相交即整条删除 | 图片是"整体"语义 |
| **Lasso 只做 bbox 相交** | 可能漏选 bbox 重叠但实际在套索外的笔画 | 建议用户圈选时留余量 |
| **`persist` 不是真持久化** | 只存到 store snapshot，刷新即丢 | 需业务层接入 localStorage / IndexedDB |
| **远程图片内联有 CORS 限制** | 跨域图片下载失败会降级保留 URL（非严格模式） | 用 `strictRemote: true` 强制自包含 |

### 13.3 性能建议

| 场景 | 建议 |
|---|---|
| **日常白板（几页、几十到几百笔）** | 默认实现完全够用 |
| **大文件（>2000 笔/页）** | 定期 `resetHistory` + 减少页面数 |
| **缩略图频繁刷新** | 用 `renderPageThumbnail` 异步渲染，不要同步阻塞 |
| **高清导出** | 用 `renderHQImage` 的 `scale` 参数控制质量 vs 体积，不要盲目 4× 以上 |
| **krmc 保存** | 默认参数已经优化；超大文件可关 `quantize` 提高兼容性 |

### 13.4 兼容性

- **浏览器**：Chrome / Edge / Safari / Firefox 现代版本
- **移动端**：iOS Safari / Android Chrome（`pointer` 事件原生支持）
- **触摸面积**：`PointerEvent.width / height` 在部分老设备上可能为 0，手掌擦除会失效。用 `tpdetect` 模式验证。
- **Tauri**：WebView2（Windows）/ WKWebView（macOS）均支持

### 13.5 事件系统的坑

- **`onTouch` 频率高**：每次 pointermove 都触发，避免在里面做重计算
- **`onDraw` 只在提交时触发**：绘制过程中不触发，不要用它做实时绘制
- **`onErase` 是"每次擦除"**：手掌擦除会高频触发，橡皮工具每次移动也触发

---

## 附录：完整 API 速查表

```
生命周期
  init(opts)                       初始化
  destroy()                        销毁

画笔 / 工具
  setPen({ color, thick })         普通笔
  setSpPen({ pattern, type, size }) 图样笔（异步）
  setEraser(size)                  橡皮
  setTool(tool)                    切工具
  getTool()                        当前工具
  registerBuiltIn(name, src)       注册内置图样（异步）

橡皮扩展
  setEraserImage(src | null)       自定义橡皮图片
  setPalmAreaSize(area)            手掌面积阈值

事件
  addEventListener(type, handler)  订阅
  removeEventListener(type, handler) 退订
  onPageChange = fn                页码变化
  onScaleChange = fn               缩放变化
  onSelectionChange = fn           选区变化
  onHistoryChange = fn             历史变化
  onViewResize = fn                视口尺寸变化

历史
  canUndo() / canRedo()            查询
  undo() / redo()                  执行
  resetHistory()                   清空

选区
  commitSelection()                提交
  copySelection()                  复制
  cancelSelection()                取消
  hasSelection()                   查询

页面
  newPage(opts?)                   新建（异步）
  goTo(pageNum)                    跳转（1-based）
  goPrev() / goNext()              翻页

导入导出
  exportPages()                    导出数据
  importPages(pages)               导入数据（异步）

查询
  getPageIndex() / getPageCount()
  getScale() / getViewSize()
  getCurrentTapPoints() / getTouchPoints()
  isPalmErasing()
  getHistoryIndex() / getHistoryLength()

渲染
  renderPageThumbnail(index, canvas, w, h)
  renderHQImage(range?, options?)
  clearCurrentPage()

文件格式（@/nWb/krmc）
  saveKrmc(pages, options?)        保存（异步）
  loadKrmc(input, options?)        加载（异步）
  renderKrmcThumbnail(nwb, i, w, h, q?)
  KRMC_MIME / KRMC_FORMAT / KRMC_VERSION

OCR（@/nWb/ocr）
  getOcr(options?)                 懒加载实例
  recognize(image, options?)       识别单张（异步）
  recognizeBatch(images, options?) 批量识别（异步）
  recognizeText(image, options?)   纯文本（异步）
  disposeOcr()                     释放
```