# Tauri 端完整功能清单

按功能域分组，每个功能给出**方法/API 名称**、**来源**、**用途**。全部列全，不写代码。

**来源图例**：`📦 = 官方 plugin` `🔧 = Tauri 内置 API` `✍️ = 需自写 Rust command`

---

## 一、窗口管理（Window）

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 1 | `getCurrentWindow()` | 🔧 `@tauri-apps/api/window` | 获取当前窗口实例 |
| 2 | `appWindow.close()` | 🔧 | 关闭窗口 |
| 3 | `appWindow.minimize()` | 🔧 | 最小化到桌面 |
| 4 | `appWindow.maximize()` | 🔧 | 最大化 |
| 5 | `appWindow.unmaximize()` | 🔧 | 还原 |
| 6 | `appWindow.toggleMaximize()` | 🔧 | 最大化/还原切换 |
| 7 | `appWindow.isMaximized()` | 🔧 | 查询是否最大化 |
| 8 | `appWindow.hide()` | 🔧 | 隐藏窗口（不退出） |
| 9 | `appWindow.show()` | 🔧 | 显示窗口 |
| 10 | `appWindow.setFocus()` | 🔧 | 聚焦窗口 |
| 11 | `appWindow.setFullscreen(bool)` | 🔧 | 全屏切换 |
| 12 | `appWindow.isFullscreen()` | 🔧 | 查询是否全屏 |
| 13 | `appWindow.setAlwaysOnTop(bool)` | 🔧 | 置顶（教学演示常用） |
| 14 | `appWindow.isAlwaysOnTop()` | 🔧 | 查询是否置顶 |
| 15 | `appWindow.setDecorations(bool)` | 🔧 | 显示/隐藏标题栏 |
| 16 | `appWindow.setResizable(bool)` | 🔧 | 允许/禁止调整大小 |
| 17 | `appWindow.setSize({ width, height })` | 🔧 | 设置尺寸 |
| 18 | `appWindow.setMinSize({ width, height })` | 🔧 | 设置最小尺寸 |
| 19 | `appWindow.setMaxSize({ width, height })` | 🔧 | 设置最大尺寸 |
| 20 | `appWindow.setPosition({ x, y })` | 🔧 | 设置位置 |
| 21 | `appWindow.center()` | 🔧 | 居中 |
| 22 | `appWindow.startDragging()` | 🔧 | 无边框窗口拖拽 |
| 23 | `appWindow.scaleFactor()` | 🔧 | 获取 DPI 缩放比 |
| 24 | `appWindow.innerSize()` | 🔧 | 获取内部尺寸（物理像素） |
| 25 | `appWindow.outerSize()` | 🔧 | 获取外部尺寸 |
| 26 | `appWindow.innerPosition()` | 🔧 | 获取位置 |
| 27 | `appWindow.setTitle(string)` | 🔧 | 设置窗口标题 |
| 28 | `appWindow.setIcon(path)` | 🔧 | 动态换图标 |
| 29 | `appWindow.setSkipTaskbar(bool)` | 🔧 | 从任务栏隐藏 |
| 30 | `appWindow.setOpacity(number)` | 🔧 | 设置窗口透明度 |
| 31 | `appWindow.setShadow(bool)` | 🔧 | 窗口阴影 |
| 32 | `appWindow.setContentProtected(bool)` | 🔧 | 防截屏录制（Win/macOS） |
| 33 | `appWindow.onCloseRequested(fn)` | 🔧 | 拦截关闭（未保存提示） |
| 34 | `appWindow.onResized(fn)` | 🔧 | 监听窗口尺寸变化 |
| 35 | `appWindow.onMoved(fn)` | 🔧 | 监听窗口位置变化 |
| 36 | `appWindow.onFocusChanged(fn)` | 🔧 | 监听焦点变化 |
| 37 | `appWindow.onScaleChanged(fn)` | 🔧 | 监听 DPI 变化 |
| 38 | `appWindow.onThemeChanged(fn)` | 🔧 | 监听系统主题变化 |
| 39 | `appWindow.onDragDropEvent(fn)` | 🔧 | 监听文件拖放 |
| 40 | `appWindow.showMenu()` / `hideMenu()` | 🔧 | 系统菜单 |
| 41 | `appWindow.setBadgeCount(n)` | 🔧 | 任务栏角标（Win/macOS/Linux 部分） |
| 42 | `appWindow.requestUserAttention(type)` | 🔧 | 任务栏闪烁提醒 |
| 43 | `getAllWindows()` | 🔧 | 获取所有窗口 |
| 44 | `getCurrentWebviewWindow()` | 🔧 `@tauri-apps/api/webviewWindow` | 获取当前 WebView |
| 45 | `WebviewWindow.setZoom(scale)` | 🔧 | 调整 WebView 缩放 |
| 46 | `WebviewWindow.clearAllBrowsingData()` | 🔧 | 清除 WebView 缓存 |

---

## 二、多显示器

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 47 | `currentMonitor()` | 🔧 | 当前窗口所在显示器信息 |
| 48 | `primaryMonitor()` | 🔧 | 主显示器信息 |
| 49 | `availableMonitors()` | 🔧 | 所有显示器列表 |
| 50 | `appWindow.setPosition` 到副屏坐标 | 🔧 | 投影模式（主屏控制 + 副屏显示） |

---

## 三、应用 / 进程

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 51 | `exit(code)` | 📦 `@tauri-apps/plugin-process` | 退出应用 |
| 52 | `relaunch()` | 📦 `@tauri-apps/plugin-process` | 重启应用 |
| 53 | `getVersion()` | 🔧 `@tauri-apps/api/app` | 应用版本号 |
| 54 | `getName()` | 🔧 | 应用名 |
| 55 | `getTauriVersion()` | 🔧 | Tauri 版本 |
| 56 | `getIdentifier()` | 🔧 | 应用标识（`com.xxx.yyy`） |
| 57 | `show()` | 🔧 `@tauri-apps/api/app` | 显示应用（macOS 激活） |
| 58 | `hide()` | 🔧 | 隐藏应用（macOS） |
| 59 | `registerListener` / `emit` | 🔧 `@tauri-apps/api/event` | 前端-后端事件总线 |

---

## 四、文件系统（File System）

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 60 | `readFile(path)` | 📦 `@tauri-apps/plugin-fs` | 读二进制（krmc） |
| 61 | `readTextFile(path)` | 📦 | 读文本（JSON） |
| 62 | `writeFile(path, bytes)` | 📦 | 写二进制（krmc / png） |
| 63 | `writeTextFile(path, text)` | 📦 | 写文本 |
| 64 | `appendFile` / `appendTextFile` | 📦 | 追加（日志） |
| 65 | `exists(path)` | 📦 | 文件/目录是否存在 |
| 66 | `mkdir(path, opts)` | 📦 | 创建目录（递归） |
| 67 | `remove(path)` | 📦 | 删除文件 |
| 68 | `removeDir(path, opts)` | 📦 | 删除目录 |
| 69 | `rename(oldPath, newPath)` | 📦 | 重命名 / 移动 |
| 70 | `copyFile(from, to)` | 📦 | 复制文件 |
| 71 | `readDir(path)` | 📦 | 列出目录内容 |
| 72 | `stat(path)` | 📦 | 文件元信息（大小、时间） |
| 73 | `lstat(path)` | 📦 | 不跟随符号链接 |
| 74 | `truncate(path, len)` | 📦 | 截断文件 |
| 75 | `open(path, opts)` | 📦 | 流式读写（大文件） |
| 76 | `watch(path, fn)` | 📦 | 监听文件变化（外部修改自动重载） |
| 77 | `watchImmediate(path, fn)` | 📦 | 立即返回当前状态的监听 |
| 78 | `create(path)` | 📦 | 创建文件 |
| 79 | `FileHandle.read` / `write` / `seek` | 📦 | 精细控制大文件读写 |

---

## 五、路径

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 80 | `appDataDir()` | 🔧 `@tauri-apps/api/path` | 应用数据目录（存草稿） |
| 81 | `appConfigDir()` | 🔧 | 配置目录 |
| 82 | `appLocalDataDir()` | 🔧 | 本地数据目录 |
| 83 | `appCacheDir()` | 🔧 | 缓存目录（OCR 模型） |
| 84 | `appLogDir()` | 🔧 | 日志目录 |
| 85 | `documentDir()` | 🔧 | 用户文档目录 |
| 86 | `downloadDir()` | 🔧 | 下载目录 |
| 87 | `desktopDir()` | 🔧 | 桌面 |
| 88 | `pictureDir()` | 🔧 | 图片目录 |
| 89 | `audioDir()` / `videoDir()` | 🔧 | 音视频目录 |
| 90 | `tempDir()` | 🔧 | 临时目录 |
| 91 | `homeDir()` | 🔧 | 用户主目录 |
| 92 | `publicDir()` / `resourceDir()` | 🔧 | 公共 / 资源目录 |
| 93 | `join(...paths)` | 🔧 | 路径拼接 |
| 94 | `dirname(path)` / `basename(path)` / `extname(path)` | 🔧 | 路径解析 |
| 95 | `resolve(...paths)` | 🔧 | 解析绝对路径 |
| 96 | `normalize(path)` | 🔧 | 规范化路径 |
| 97 | `isAbsolute(path)` | 🔧 | 是否绝对路径 |
| 98 | `sep()` | 🔧 | 路径分隔符 |

---

## 六、对话框（Dialog）

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 99 | `open(opts)` | 📦 `@tauri-apps/plugin-dialog` | 打开文件 |
| 100 | `open({ directory: true })` | 📦 | 打开目录 |
| 101 | `open({ multiple: true })` | 📦 | 多选文件 |
| 102 | `save(opts)` | 📦 | 保存文件 |
| 103 | `message(text, opts)` | 📦 | 消息框（info/warning/error） |
| 104 | `ask(text, opts)` | 📦 | 确认框（确定/取消） |
| 105 | `confirm(text, opts)` | 📦 | 确认框（boolean） |

---

## 七、剪贴板（Clipboard）

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 106 | `writeText(text)` | 📦 `@tauri-apps/plugin-clipboard-manager` | 复制文本（OCR 结果） |
| 107 | `readText()` | 📦 | 读文本 |
| 108 | `writeImage(bytes)` | 📦 | 复制图片（选区 PNG） |
| 109 | `readImage()` | 📦 | 读图片（粘贴到画布） |
| 110 | `writeHtml(html)` | 📦 | 写 HTML |
| 111 | `clear()` | 📦 | 清空剪贴板 |

---

## 八、通知（Notification）

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 112 | `isPermissionGranted()` | 📦 `@tauri-apps/plugin-notification` | 查询权限 |
| 113 | `requestPermission()` | 📦 | 请求权限 |
| 114 | `sendNotification({ title, body })` | 📦 | 发送系统通知（导出完成） |
| 115 | `createChannel()` | 📦 | 通知渠道（Android） |

---

## 九、操作系统信息（OS）

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 116 | `platform()` | 📦 `@tauri-apps/plugin-os` | 系统类型（windows/macos/linux） |
| 117 | `version()` | 📦 | 系统版本 |
| 118 | `arch()` | 📦 | 架构（x86_64/aarch64） |
| 119 | `family()` | 📦 | 系统家族（unix/windows） |
| 120 | `type()` | 📦 | 精确类型（ios/android/windows/macos/linux） |
| 121 | `locale()` | 📦 | 语言环境（`zh-CN`） |
| 122 | `hostname()` | 📦 | 主机名 |
| 123 | `exeExtension()` | 📦 | 可执行文件扩展名 |
| 124 | `eol()` | 📦 | 换行符 |
| 125 | `cpuCount()` | 📦 | CPU 核心数（性能配置） |

---

## 十、存储（Store / KV）

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 126 | `load(path, opts)` | 📦 `@tauri-apps/plugin-store` | 打开存储文件 |
| 127 | `store.set(key, value)` | 📦 | 写键值 |
| 128 | `store.get(key)` | 📦 | 读键值 |
| 129 | `store.has(key)` | 📦 | 是否存在 |
| 130 | `store.delete(key)` | 📦 | 删除键 |
| 131 | `store.clear()` | 📦 | 清空 |
| 132 | `store.keys()` / `values()` / `entries()` | 📦 | 遍历 |
| 133 | `store.save()` | 📦 | 手动落盘 |
| 134 | `store.reload()` | 📦 | 重新读取 |
| 135 | `store.onChange(fn)` | 📦 | 监听变化（多窗口同步） |

---

## 十一、系统集成

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 136 | `openUrl(url)` | 📦 `@tauri-apps/plugin-opener` | 系统浏览器打开（关于页链接） |
| 137 | `openPath(path)` | 📦 | 用默认程序打开文件 |
| 138 | `revealItemInDir(path)` | 📦 | 在资源管理器 / Finder 中选中文件 |
| 139 | `open({ path })` | 📦 `@tauri-apps/plugin-shell` | 打开文件（同 openPath） |
| 140 | `Command.create(...)` | 📦 `@tauri-apps/plugin-shell` | 执行外部命令（需显式 allow） |
| 141 | `open(uri, { with: app })` | 📦 | 用指定应用打开 |

---

## 十二、快捷键

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 142 | `register(shortcut, fn)` | 📦 `@tauri-apps/plugin-global-shortcut` | 注册全局快捷键（`Ctrl+Shift+W` 唤出白板） |
| 143 | `registerAll([...])` | 📦 | 批量注册 |
| 144 | `isRegistered(shortcut)` | 📦 | 是否已注册 |
| 145 | `unregister(shortcut)` | 📦 | 注销 |
| 146 | `unregisterAll()` | 📦 | 全部注销 |
| 147 | 窗口内快捷键 | 🔧 `window.addEventListener('keydown')` | 局部快捷键（Ctrl+Z 等，不需要 Rust） |

---

## 十三、系统托盘

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 148 | `TrayIconBuilder::new()` | 🔧 Rust `tauri::tray` | 创建托盘图标 |
| 149 | `.menu(menu)` | 🔧 | 托盘右键菜单 |
| 150 | `.on_tray_icon_event(fn)` | 🔧 | 托盘点击事件（左键唤出窗口） |
| 151 | `.on_menu_event(fn)` | 🔧 | 菜单项点击 |
| 152 | `TrayIcon::set_icon()` | 🔧 | 动态换图标 |
| 153 | `TrayIcon::set_tooltip(text)` | 🔧 | 设置提示文字 |
| 154 | `TrayIcon::set_title(text)` | 🔧 | 设置标题（macOS 显示文字） |

---

## 十四、系统菜单（Menu）

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 155 | `Menu.new()` | 🔧 `@tauri-apps/api/menu` | 创建菜单 |
| 156 | `Submenu.new({ text })` | 🔧 | 子菜单 |
| 157 | `MenuItem.new({ text, action })` | 🔧 | 菜单项 |
| 158 | `PredefinedMenuItem.new({ item: 'Copy' })` | 🔧 | 系统预置项（复制/粘贴/退出） |
| 159 | `CheckMenuItem.new({ checked })` | 🔧 | 勾选菜单 |
| 160 | `IconMenuItem.new({ icon })` | 🔧 | 带图标菜单 |
| 161 | `menu.setAsAppMenu()` | 🔧 | 设为应用菜单（macOS 顶栏） |
| 162 | `menu.popup()` | 🔧 | 弹出右键菜单 |

---

## 十五、窗口状态持久化

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 163 | `tauri_plugin_window_state::Builder` | 📦 `@tauri-apps/plugin-window-state` | 记住窗口大小/位置/最大化 |
| 164 | `.with_state_flags(flags)` | 📦 | 指定要保存的状态 |
| 165 | `.with_denylist([...])` | 📦 | 排除某些字段 |
| 166 | `saveWindowState(flags)` | 📦 | 手动保存 |
| 167 | `restoreStateCurrent(flags)` | 📦 | 手动恢复 |

---

## 十六、自动更新

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 168 | `check()` | 📦 `@tauri-apps/plugin-updater` | 检查更新 |
| 169 | `update.downloadAndInstall(fn)` | 📦 | 下载安装（带进度） |
| 170 | `update.download(fn)` | 📦 | 仅下载 |
| 171 | `update.install()` | 📦 | 仅安装 |
| 172 | `update.close()` | 📦 | 关闭更新 |

---

## 十七、HTTP 请求

用于远程图片内联、OCR 模型下载、业务 API。

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 173 | `fetch(url, opts)` | 📦 `@tauri-apps/plugin-http` | 绕过 CORS 的请求（krmc 内联远程图片） |
| 174 | `fetch` 支持 stream | 📦 | 大文件流式下载 |
| 175 | `Client` 实例（连接池） | 📦 | 批量请求 |

---

## 十八、OCR 模型管理

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 176 | `getOcrModelDir()` | ✍️ 自写 | 返回本地模型目录（`appCacheDir/ocr`） |
| 177 | `checkOcrModelReady()` | ✍️ | 检查模型文件是否齐全 |
| 178 | `downloadOcrModel(url, onProgress)` | ✍️ | Rust 侧下载解压（比 JS 快 3~5 倍） |
| 179 | `extractTarGz(src, dest)` | ✍️ | 解压 tar.gz 模型包 |
| 180 | `clearOcrModel()` | ✍️ | 清除模型缓存 |
| 181 | `getOcrModelVersion()` | ✍️ | 模型版本号 |

---

## 十九、打印

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 182 | `printPage(pngBytes)` | ✍️ 自写 | Windows `StartDoc` / macOS `NSPrintOperation` |
| 183 | `getPrinters()` | ✍️ | 列出系统打印机 |
| 184 | `printPdf(pdfBytes)` | ✍️ | 直接打印 PDF |
| 185 | `printPreview(pngBytes)` | ✍️ | 打印预览 |

---

## 二十、截图 / 屏幕录制

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 186 | `captureWindow()` | ✍️ 自写 / 社区 plugin | 截取白板窗口 |
| 187 | `captureScreen()` | ✍️ | 截全屏 |
| 188 | `captureRegion(x, y, w, h)` | ✍️ | 截取区域 |
| 189 | `listWindows()` | ✍️ | 列出可捕获窗口 |
| 190 | `startRecording()` / `stopRecording()` | ✍️ | 屏幕录制（教学） |

---

## 二十一、崩溃恢复

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 191 | `setupPanicHook()` | ✍️ Rust `std::panic::set_hook` | 捕获 panic，写入崩溃日志 |
| 192 | `registerCrashRecovery(path)` | ✍️ | 启动时检查恢复文件 |
| 193 | `writeRecoveryFile(data)` | ✍️ | 定期写恢复数据 |
| 194 | `clearRecoveryFile()` | ✍️ | 正常退出时清理 |
| 195 | `getCrashLogs()` | ✍️ | 崩溃日志列表 |
| 196 | `reportCrash(log)` | ✍️ | 上报（可选，接 Sentry） |

---

## 二十二、日志

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 197 | `tauri_plugin_log::Builder` | 📦 `@tauri-apps/plugin-log` | 日志插件 |
| 198 | `info(msg)` / `warn` / `error` / `debug` / `trace` | 📦 | 写日志 |
| 199 | `.with_log_levels(...)` | 📦 | 分模块日志级别 |
| 200 | `.with_targets(...)` | 📦 | 输出到 stdout / 文件 / Webview |
| 201 | `attachConsole()` | 📦 | 前端 console 转发 |

---

## 二十三、单实例

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 202 | `tauri_plugin_single_instance::init()` | 📦 `@tauri-apps/plugin-single-instance` | 只允许一个实例运行 |
| 203 | `.on_second_instance(fn)` | 📦 | 第二次启动时唤出已有窗口 |

---

## 二十四、深链接 / URL Scheme

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 204 | `register('myboard', fn)` | 📦 `@tauri-apps/plugin-deep-link` | 注册 `myboard://` 协议 |
| 205 | `getCurrent()` | 📦 | 获取启动时的深链 URL |
| 206 | `onOpenUrl(fn)` | 📦 | 监听深链打开 |
| 207 | `unregisterAll()` | 📦 | 注销 |

---

## 二十五、文件关联

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 208 | `tauri.conf.json > bundle.fileAssociations` | 🔧 配置 | 关联 `.krmc` 双击打开 |
| 209 | 处理文件打开事件（`onOpenUrl` / 启动参数） | 🔧 | 接收文件路径并加载 |

---

## 二十六、电源管理

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 210 | `tauri_plugin_power_manager::Builder` | 📦 `@tauri-apps/plugin-power-manager` | 电源相关 |
| 211 | `.block_sleep(true)` | 📦 | 阻止系统休眠（演示时） |
| 212 | `BlockSleep` 句柄释放 | 📦 | 结束时恢复 |

---

## 二十七、音频 / 音效

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 213 | `<audio>` / Web Audio | 🔧 前端 | 播放音效（画笔落笔音、提示音） |
| 214 | `playSfx(name)` | ✍️ 可选 | Rust 侧预加载音效文件 |

---

## 二十八、拖放（Drag & Drop）

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 215 | `appWindow.onDragDropEvent(fn)` | 🔧 `@tauri-apps/api/window` | 拖文件进白板窗口 |
| 216 | `event.payload.type === 'drop'` | 🔧 | 处理 drop 事件 |
| 217 | `event.payload.paths` | 🔧 | 拖入的文件路径列表 |

---

## 二十九、WebView 相关

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 218 | `Webview.setZoom(scale)` | 🔧 | 缩放整个 WebView |
| 219 | `Webview.clearAllBrowsingData()` | 🔧 | 清除缓存 |
| 220 | `Webview.eval(code)` | 🔧 | 从 Rust 执行 JS |
| 221 | `Webview.openDevtools()` | 🔧 | 打开 DevTools（调试） |
| 222 | `Webview.closeDevtools()` | 🔧 | 关闭 DevTools |
| 223 | `Webview.reparent(otherWindow)` | 🔧 | 迁移 WebView 到另一窗口 |

---

## 三十、主题 / 外观

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 224 | `appWindow.theme()` | 🔧 | 获取系统主题（light/dark） |
| 225 | `appWindow.onThemeChanged(fn)` | 🔧 | 监听主题变化 |
| 226 | `appWindow.setTheme('dark')` | 🔧 | 强制主题 |
| 227 | CSS `prefers-color-scheme` | 🔧 前端 | 自动跟随系统 |

---

## 三十一、安全 / 凭据

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 228 | `stronghold` plugin | 📦 `@tauri-apps/plugin-stronghold` | 加密存敏感数据（登录 token） |
| 229 | `keyring` | ✍️ 可选 | 系统钥匙串（macOS Keychain / Windows Credential Manager） |

---

## 三十二、其他实用

| # | 方法 / API | 来源 | 用途 |
|---|---|---|---|
| 230 | `convertFileSrc(path)` | 🔧 `@tauri-apps/api/core` | 把本地路径转为 WebView 可访问 URL |
| 231 | `invoke(cmd, args)` | 🔧 | 调用自定义 Rust command |
| 232 | `Channel<T>` | 🔧 | 长连接流式数据（下载进度 / OCR 结果） |
| 233 | `isTauri()` | 🔧 | 检测是否在 Tauri 环境 |
| 234 | `transformCallback(fn, once)` | 🔧 | 底层回调转换 |
| 235 | `appDataDir()` + `mkdir` 组合 | 🔧 | 首次启动创建数据目录 |

---

## 汇总：按 plugin 归类

### 官方 plugin（npm 装 + Cargo 装 + capabilities 声明）

```
@tauri-apps/plugin-dialog
@tauri-apps/plugin-fs
@tauri-apps/plugin-clipboard-manager
@tauri-apps/plugin-notification
@tauri-apps/plugin-os
@tauri-apps/plugin-process
@tauri-apps/plugin-opener
@tauri-apps/plugin-shell
@tauri-apps/plugin-store
@tauri-apps/plugin-global-shortcut
@tauri-apps/plugin-window-state
@tauri-apps/plugin-updater
@tauri-apps/plugin-http
@tauri-apps/plugin-log
@tauri-apps/plugin-single-instance
@tauri-apps/plugin-deep-link
@tauri-apps/plugin-power-manager
@tauri-apps/plugin-stronghold
```

### Tauri 内置 API（`@tauri-apps/api`）

```
window / webviewWindow / webview
path / app / core / event / menu / tray
```

### Rust 内置（`tauri::`）

```
tray / menu / window / webview / Manager / State / Channel
```

### 需自写 Rust command（✍️）

```
OCR 模型：getOcrModelDir / checkOcrModelReady / downloadOcrModel / extractTarGz / clearOcrModel / getOcrModelVersion
打印：printPage / getPrinters / printPdf / printPreview
截图：captureWindow / captureScreen / captureRegion / listWindows / startRecording / stopRecording
崩溃恢复：setupPanicHook / registerCrashRecovery / writeRecoveryFile / clearRecoveryFile / getCrashLogs / reportCrash
音效（可选）：playSfx
凭据（可选）：keyring 相关
```

---

## 白板应用的最小可用集（MVP）

如果只做"能用的白板"，只需这 **4 个 plugin**：

```
@tauri-apps/plugin-dialog        # 导入/导出
@tauri-apps/plugin-fs            # 读写 krmc / png
@tauri-apps/plugin-process       # 退出
@tauri-apps/api                  # 内置窗口 API（关闭/最小化/全屏）
```

加上 `tauri.conf.json` 里配置窗口参数（无边框 / 透明 / 居中），即可完整替代浏览器版本的所有功能。

---

## 白板应用的推荐集（完整形态）

```
官方 plugin：dialog / fs / clipboard-manager / notification /
             os / process / opener / store / global-shortcut /
             window-state / updater / http / log / single-instance

自写 Rust：  OCR 模型管理 + 崩溃恢复 + （可选）打印 / 截图
```

这套覆盖了从"日常白板"到"教学演示工具"的全部核心场景。