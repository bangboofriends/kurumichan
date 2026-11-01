//! 崩溃恢复模块
//!
//! - 草稿恢复：`write_recovery_file` 定期落盘，`register_crash_recovery` 启动时检测，
//!   `clear_recovery_file` 正常退出时清理。语义是「恢复文件存在 = 上次异常退出」。
//! - 崩溃日志：安装 panic 钩子，把 panic 信息同步写入 `crash-*.log`，`get_crash_logs` 可列出。
//!
//! panic 钩子运行在崩溃现场，内部只允许纯同步 `std::fs` 操作且不出现 `unwrap`，
//! 防止钩子自身 panic 造成递归。

use std::{
    fs, io, panic,
    path::{Path, PathBuf},
    sync::OnceLock,
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tauri::Manager;

const RECOVERY_DIR_NAME: &str = "recovery";
const RECOVERY_FILE_NAME: &str = "recovery.json";
const CRASH_DIR_NAME: &str = "crash";

/// 单次恢复数据的体积上限，避免大对象频繁落盘拖慢主线程
const MAX_RECOVERY_BYTES: usize = 32 * 1024 * 1024;
/// 崩溃日志最多保留的数量，超出部分在启动时轮转删除
const MAX_CRASH_LOGS: usize = 20;

static RECOVERY_FILE: OnceLock<PathBuf> = OnceLock::new();
static CRASH_DIR: OnceLock<PathBuf> = OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryFile {
    /// 写入时的 Unix 毫秒时间戳
    pub saved_at_ms: u64,
    /// 前端传入的任意 JSON 草稿数据
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize)]
pub struct CrashLogEntry {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub modified_ms: u64,
}

pub struct CrashPaths {
    pub recovery_file: PathBuf,
    pub crash_dir: PathBuf,
}

/// 在 `Builder::setup` 中调用：解析目录并缓存，然后安装 panic 钩子。
pub fn setup_panic_hook(paths: CrashPaths) {
    let crash_dir = paths.crash_dir.clone();
    let _ = RECOVERY_FILE.set(paths.recovery_file);
    let _ = CRASH_DIR.set(paths.crash_dir);

    rotate_crash_logs(&crash_dir);

    let previous = panic::take_hook();
    panic::set_hook(Box::new(move |info| {
        write_crash_log(info);
        previous(info);
    }));
}

/// 解析恢复文件与崩溃日志目录，目录不存在则创建。
pub fn resolve_paths(app: &tauri::AppHandle) -> Result<CrashPaths, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let recovery_dir = data_dir.join(RECOVERY_DIR_NAME);
    fs::create_dir_all(&recovery_dir).map_err(|e| e.to_string())?;

    // 部分平台日志目录可能取不到，回退到应用数据目录
    let crash_dir = match app.path().app_log_dir() {
        Ok(dir) => dir.join(CRASH_DIR_NAME),
        Err(_) => data_dir.join(CRASH_DIR_NAME),
    };
    fs::create_dir_all(&crash_dir).map_err(|e| e.to_string())?;

    Ok(CrashPaths {
        recovery_file: recovery_dir.join(RECOVERY_FILE_NAME),
        crash_dir,
    })
}

#[tauri::command]
pub fn write_recovery_file(app: tauri::AppHandle, data: serde_json::Value) -> Result<(), String> {
    let path = recovery_path(&app)?;
    let payload = RecoveryFile {
        saved_at_ms: now_ms().unwrap_or(0),
        data,
    };
    let bytes = serde_json::to_vec(&payload).map_err(|e| e.to_string())?;
    if bytes.len() > MAX_RECOVERY_BYTES {
        return Err(format!(
            "恢复数据过大：{} 字节，上限 {} 字节",
            bytes.len(),
            MAX_RECOVERY_BYTES
        ));
    }

    // 原子写：先写临时文件再重命名，避免写入过程中崩溃留下半截文件
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, &bytes).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        e.to_string()
    })?;
    Ok(())
}

#[tauri::command]
pub fn register_crash_recovery(app: tauri::AppHandle) -> Result<Option<RecoveryFile>, String> {
    let path = recovery_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }

    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    match serde_json::from_slice::<RecoveryFile>(&bytes) {
        Ok(payload) => Ok(Some(payload)),
        Err(e) => {
            // 文件已损坏，丢弃后按「无可恢复数据」处理，避免阻塞启动
            eprintln!("[crash] 恢复文件损坏，已丢弃：{e}");
            let _ = fs::remove_file(&path);
            Ok(None)
        }
    }
}

#[tauri::command]
pub fn clear_recovery_file(app: tauri::AppHandle) -> Result<(), String> {
    let path = recovery_path(&app)?;
    match fs::remove_file(&path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn get_crash_logs(app: tauri::AppHandle) -> Result<Vec<CrashLogEntry>, String> {
    let dir = crash_dir(&app)?;
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut logs = Vec::new();
    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.starts_with("crash-") || !name.ends_with(".log") {
            continue;
        }
        let Ok(meta) = entry.metadata() else { continue };
        if !meta.is_file() {
            continue;
        }
        logs.push(CrashLogEntry {
            name,
            path: entry.path().to_string_lossy().to_string(),
            size_bytes: meta.len(),
            modified_ms: modified_ms(&meta).unwrap_or(0),
        });
    }

    logs.sort_by(|a, b| {
        b.modified_ms
            .cmp(&a.modified_ms)
            .then_with(|| b.name.cmp(&a.name))
    });
    Ok(logs)
}

fn recovery_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Some(path) = RECOVERY_FILE.get() {
        return Ok(path.clone());
    }
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join(RECOVERY_DIR_NAME).join(RECOVERY_FILE_NAME))
}

fn crash_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Some(dir) = CRASH_DIR.get() {
        return Ok(dir.clone());
    }
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(match app.path().app_log_dir() {
        Ok(dir) => dir.join(CRASH_DIR_NAME),
        Err(_) => data_dir.join(CRASH_DIR_NAME),
    })
}

fn write_crash_log(info: &panic::PanicHookInfo) {
    let Some(dir) = CRASH_DIR.get() else {
        return;
    };
    if fs::create_dir_all(dir).is_err() {
        return;
    }

    let location = match info.location() {
        Some(loc) => format!("{}:{}:{}", loc.file(), loc.line(), loc.column()),
        None => "unknown".to_string(),
    };
    let thread = std::thread::current()
        .name()
        .unwrap_or("<unnamed>")
        .to_string();

    let payload = info.payload();
    let message: String = if let Some(s) = payload.downcast_ref::<&str>() {
        (*s).to_string()
    } else if let Some(s) = payload.downcast_ref::<String>() {
        s.clone()
    } else {
        "Box<dyn Any>".to_string()
    };

    let file = dir.join(format!(
        "crash-{}-{}.log",
        now_ms().unwrap_or(0),
        std::process::id()
    ));
    let content = format!(
        "time_unix_ms: {}\npid: {}\nthread: {}\nlocation: {}\nmessage: {}\n",
        now_ms().unwrap_or(0),
        std::process::id(),
        thread,
        location,
        message
    );
    let _ = fs::write(file, content);
}

fn rotate_crash_logs(dir: &Path) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    let mut files: Vec<(PathBuf, u64)> = entries
        .flatten()
        .filter(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            name.starts_with("crash-") && name.ends_with(".log")
        })
        .filter_map(|e| {
            let meta = e.metadata().ok()?;
            if !meta.is_file() {
                return None;
            }
            Some((e.path(), modified_ms(&meta).unwrap_or(0)))
        })
        .collect();

    if files.len() <= MAX_CRASH_LOGS {
        return;
    }
    files.sort_by(|a, b| b.1.cmp(&a.1));
    for (path, _) in files.iter().skip(MAX_CRASH_LOGS) {
        let _ = fs::remove_file(path);
    }
}

fn now_ms() -> Option<u64> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .ok()
        .map(|d| d.as_millis() as u64)
}

fn modified_ms(meta: &fs::Metadata) -> Option<u64> {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
}
