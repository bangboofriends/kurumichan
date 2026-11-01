mod crash;
// OCR 模块仅有签名，实现时去掉 allow 并把命令加进 generate_handler
#[allow(dead_code)]
mod ocr;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            crash::register_crash_recovery,
            crash::write_recovery_file,
            crash::clear_recovery_file,
            crash::get_crash_logs,
        ])
        .setup(|app| {
            match crash::resolve_paths(app.handle()) {
                Ok(paths) => crash::setup_panic_hook(paths),
                Err(e) => eprintln!("[crash] 初始化失败，崩溃恢复不可用：{e}"),
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building application");

    app.run(|app_handle, event| {
        // 正常退出：清掉恢复文件，保证「有文件 = 崩过」的判定成立
        if let tauri::RunEvent::Exit = event {
            if let Err(e) = crash::clear_recovery_file(app_handle.clone()) {
                eprintln!("[crash] 清理恢复文件失败：{e}");
            }
        }
    });
}
