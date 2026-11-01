//! OCR 模型管理模块（目前只有签名，未实现）
//!
//! 对应 `tarui_api_requires.md` 第十八节 #176~181。
//! 前端已装 `@paddleocr/paddleocr-js`，模型文件由本模块下载、解压、校验后交给前端加载。
//!
//! 实现时需要新增依赖（届时再改 Cargo.toml）：
//! - `reqwest`（下载，需 `stream` feature 才能分块推进度）
//! - `flate2` + `tar`（解压 tar.gz）
//!
//! 实现要点备忘：
//! - 模型目录：`appCacheDir()/ocr`
//! - 下载：分块写入 `.part` 临时文件 + `rename`，通过 `Channel` 推进度，失败要清理半成品
//! - 解压：必须校验解压路径不能逃出目标目录（zip-slip）
//! - 所有命令返回 `Result<T, String>`，与 crash.rs 风格一致

use std::path::PathBuf;

use serde::Serialize;

/// 模型目录名，位于 `appCacheDir()` 下
const MODEL_DIR_NAME: &str = "ocr";

/// 判定「模型齐全」所需的文件清单（相对模型目录），按实际模型包再校准
const REQUIRED_FILES: &[&str] = &[
    "version.txt",
    "det.onnx",
    "rec.onnx",
    "cls.onnx",
    "rec_char_dict.txt",
];

#[derive(Debug, Clone, Serialize)]
pub struct OcrModelStatus {
    /// 模型目录绝对路径
    pub dir: String,
    /// 所需文件是否全部存在
    pub ready: bool,
    /// 缺失的文件名（相对模型目录）
    pub missing: Vec<String>,
    /// 模型版本，取自 version.txt，未下载时为 None
    pub version: Option<String>,
    /// 已占用磁盘字节数
    pub total_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct DownloadProgress {
    pub received_bytes: u64,
    /// 服务端未提供 Content-Length 时为 None
    pub total_bytes: Option<u64>,
    /// 0.0 ~ 100.0，未知总大小时为 -1.0
    pub percent: f32,
    /// 当前阶段：downloading / extracting / done
    pub stage: String,
}

/// 返回本地模型目录（不存在则创建），如 `.../cache/ocr`
pub fn resolve_model_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    todo!()
}

/// #176 返回本地模型目录路径字符串
#[tauri::command]
pub fn get_ocr_model_dir(app: tauri::AppHandle) -> Result<String, String> {
    todo!()
}

/// #177 检查模型文件是否齐全
#[tauri::command]
pub fn check_ocr_model_ready(app: tauri::AppHandle) -> Result<OcrModelStatus, String> {
    todo!()
}

/// #178 下载并解压模型包，`on_progress` 用于推送下载/解压进度
#[tauri::command]
pub async fn download_ocr_model(
    app: tauri::AppHandle,
    url: String,
    on_progress: tauri::ipc::Channel<DownloadProgress>,
) -> Result<OcrModelStatus, String> {
    todo!()
}

/// #179 解压 tar.gz 模型包到指定目录
#[tauri::command]
pub async fn extract_tar_gz(src: String, dest: String) -> Result<(), String> {
    todo!()
}

/// #180 清除模型缓存（删除模型目录）
#[tauri::command]
pub fn clear_ocr_model(app: tauri::AppHandle) -> Result<(), String> {
    todo!()
}

/// #181 读取模型版本号，未下载时返回 None
#[tauri::command]
pub fn get_ocr_model_version(app: tauri::AppHandle) -> Result<Option<String>, String> {
    todo!()
}
