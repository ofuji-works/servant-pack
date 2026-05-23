use tauri::Manager;

#[derive(derive_new::new)]
pub struct CoreHook<'a> {
    app: &'a mut tauri::App,
}

impl CoreHook<'_> {
    pub fn setup(&self) -> Result<(), String> {
        let home_path = self.app.path().home_dir().map_err(|e| e.to_string())?;
        let app_path = home_path.join(".servantpack");

        if app_path.exists() && !app_path.is_dir() {
            return Err(format!(
                "{} exists but is not a directory",
                app_path.display()
            ));
        }

        std::fs::create_dir_all(&app_path).map_err(|e| e.to_string())?;

        self.install_claude_template(&app_path)?;

        Ok(())
    }

    fn install_claude_template(&self, app_path: &std::path::Path) -> Result<(), String> {
        let mcp_path = app_path.join(".mcp.json");
        if !mcp_path.exists() {
            let mcp_src = self
                .app
                .path()
                .resolve("claude/.mcp.json", tauri::path::BaseDirectory::Resource)
                .map_err(|e| e.to_string())?;
            std::fs::copy(&mcp_src, &mcp_path).map_err(|e| e.to_string())?;
        }

        std::fs::create_dir_all(app_path.join(".claude").join("hooks"))
            .map_err(|e| e.to_string())?;

        let claude_path = app_path.join(".claude");
        let settings_path = claude_path.join("settings.json");
        if !settings_path.exists() {
            let settings_src = self
                .app
                .path()
                .resolve("claude/settings.json", tauri::path::BaseDirectory::Resource)
                .map_err(|e| e.to_string())?;
            std::fs::copy(&settings_src, &settings_path).map_err(|e| e.to_string())?;
        }

        let hook_path = claude_path.join("hooks").join("scope-guard.sh");
        if !hook_path.exists() {
            let hook_src = self
                .app
                .path()
                .resolve(
                    "claude/hooks/scope-guard.sh",
                    tauri::path::BaseDirectory::Resource,
                )
                .map_err(|e| e.to_string())?;
            std::fs::copy(&hook_src, &hook_path).map_err(|e| e.to_string())?;

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let mut perm = std::fs::metadata(&hook_path)
                    .map_err(|e| e.to_string())?
                    .permissions();
                perm.set_mode(0o755);
                std::fs::set_permissions(&hook_path, perm).map_err(|e| e.to_string())?;
            }
        }

        Ok(())
    }
}
