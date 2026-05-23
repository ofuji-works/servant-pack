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
            return Err(format!("{} exists but is not a directory", app_path.display()).into());
        }

        std::fs::create_dir_all(app_path).map_err(|e| e.to_string())?;

        Ok(())
    }
}
