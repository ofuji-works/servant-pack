use tauri::Emitter;

#[derive(derive_new::new)]
pub struct PtySession {
    master: Box<dyn portable_pty::MasterPty + Send>,
    writer: Box<dyn std::io::Write + Send>,
    _child: Box<dyn portable_pty::Child + Send + Sync>,
}

pub struct PtyState(pub std::sync::Arc<std::sync::Mutex<Option<PtySession>>>);

#[derive(derive_new::new)]
pub struct Pty<'a> {
    session: &'a mut PtySession,
}

impl Pty<'_> {
    pub fn open(app: tauri::AppHandle, cols: u16, rows: u16) -> anyhow::Result<PtySession> {
        let app = app.clone();
        let pty_size = portable_pty::PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };
        let pair = portable_pty::native_pty_system()
            .openpty(pty_size)
            .map_err(|e| anyhow::anyhow!("pty:open error: {}", e.to_string()))?;
        let mut cmd = portable_pty::CommandBuilder::new("bash");
        cmd.arg("-c");
        cmd.arg("while true; do printf '\\033c'; claude; sleep 1; done");

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| anyhow::anyhow!("pty:open error: {}", e.to_string()))?;

        drop(pair.slave);

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| anyhow::anyhow!("pty:open error: {}", e.to_string()))?;
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

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| anyhow::anyhow!("pty:open error: {}", e.to_string()))?;

        Ok(PtySession::new(pair.master, writer, child))
    }

    pub fn write(&mut self, data: &str) -> anyhow::Result<()> {
        self.session
            .writer
            .write_all(data.as_bytes())
            .map_err(|e| anyhow::anyhow!("pty:write error: {}", e.to_string()))
    }

    pub fn resize(&self, cols: u16, rows: u16) -> anyhow::Result<()> {
        self.session
            .master
            .resize(portable_pty::PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| anyhow::anyhow!("pty:resize error: {}", e.to_string()))
    }
}
