use tauri::Manager;

#[derive(derive_new::new)]
pub struct BootUsecase<'a> {
    app: &'a mut tauri::App,
}

impl BootUsecase<'_> {
    pub fn setup(&self) -> Result<(), String> {
        let home_path = self.app.path().home_dir().map_err(|e| e.to_string())?;
        let output_path = home_path.join(".servantpack").join("output");

        if output_path.exists() && !output_path.is_dir() {
            return Err(format!("{} exists but is not a directory", output_path.display()).into());
        }

        std::fs::create_dir_all(output_path).map_err(|e| e.to_string())?;

        Ok(())
    }
}
