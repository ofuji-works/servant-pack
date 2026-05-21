pub mod application;

use application::pty::{pty_open, pty_resize, pty_write, PtyState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(PtyState(std::sync::Arc::new(std::sync::Mutex::new(None))))
        .invoke_handler(tauri::generate_handler![pty_open, pty_write, pty_resize])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
