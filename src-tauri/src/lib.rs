pub mod application;
pub mod interface;

use crate::application::pty::PtyState;
use crate::interface::core::boot::boot_handler;
use crate::interface::core::pty::{pty_open, pty_resize, pty_write};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(boot_handler)
        .plugin(tauri_plugin_opener::init())
        .manage(PtyState(std::sync::Arc::new(std::sync::Mutex::new(None))))
        .invoke_handler(tauri::generate_handler![pty_open, pty_write, pty_resize])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
