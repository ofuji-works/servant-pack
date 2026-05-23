use crate::core::pty::{Pty, PtySession};

pub struct PtyState(pub std::sync::Arc<std::sync::Mutex<Option<PtySession>>>);

#[tauri::command]
pub fn pty_open(
    app: tauri::AppHandle,
    state: tauri::State<'_, PtyState>,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if guard.is_some() {
        return Ok(());
    }

    let session = Pty::open(app, cols, rows).map_err(|e| e.to_string())?;

    guard.take();
    *guard = Some(session);

    Ok(())
}

#[tauri::command]
pub fn pty_write(state: tauri::State<'_, PtyState>, data: String) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(session) = guard.as_mut() {
        let mut pty = Pty::new(session);
        pty.write(&data).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn pty_resize(state: tauri::State<'_, PtyState>, cols: u16, rows: u16) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(session) = guard.as_mut() {
        let pty = Pty::new(session);
        pty.resize(cols, rows).map_err(|e| e.to_string())?;
    }

    Ok(())
}
