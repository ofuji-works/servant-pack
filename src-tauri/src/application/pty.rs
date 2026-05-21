use tauri::Emitter;

#[derive(derive_new::new)]
pub struct PtySession {
    master: Box<dyn portable_pty::MasterPty + Send>,
    writer: Box<dyn std::io::Write + Send>,
    _child: Box<dyn portable_pty::Child + Send + Sync>,
}

pub struct PtyState(pub std::sync::Arc<std::sync::Mutex<Option<PtySession>>>);

#[tauri::command]
pub fn pty_open(
    app: tauri::AppHandle,
    state: tauri::State<'_, PtyState>,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let pty_size = portable_pty::PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    };
    let pair = portable_pty::native_pty_system()
        .openpty(pty_size)
        .map_err(|e| e.to_string())?;
    let cmd = portable_pty::CommandBuilder::new("bash");
    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

    drop(pair.slave);

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        let mut leftover: Vec<u8> = Vec::new();
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    leftover.extend_from_slice(&buf[..n]);
                    let (chunk, drain_to) = match std::str::from_utf8(&leftover) {
                        Ok(s) => (s.to_string(), leftover.len()),
                        Err(e) => {
                            // コードが完全なutf-8ではない
                            let valid = e.valid_up_to();
                            let s = unsafe {
                                // already checked utf8 validation
                                std::str::from_utf8_unchecked(&leftover[..valid]).to_string()
                            };
                            match e.error_len() {
                                // utf8ではないコード
                                Some(bad) => (s + "\u{FFFD}", valid + bad),
                                // まだ判定が不能なコードを含む
                                None => (s, valid),
                            }
                        }
                    };

                    if !chunk.is_empty() && app.emit("pty:data", chunk).is_err() {
                        break;
                    }
                    leftover.drain(..drain_to);
                }
                Err(_) => break,
            }
        }
        let _ = app.emit("pty:exit", ());
    });

    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    guard.take();
    *guard = Some(PtySession {
        master: pair.master,
        writer,
        _child: child,
    });

    Ok(())
}

#[tauri::command]
pub fn pty_write(data: String, state: tauri::State<'_, PtyState>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(session) = guard.as_mut() {
        session
            .writer
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn pty_resize(state: tauri::State<'_, PtyState>, cols: u16, rows: u16) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(session) = guard.as_mut() {
        session
            .master
            .resize(portable_pty::PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
