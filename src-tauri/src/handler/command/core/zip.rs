use crate::core::zip::Zip;

#[tauri::command]
pub fn extract_zip(zip_path: String, dest_dir: String) -> Result<(), String> {
    Zip::extract(
        std::path::Path::new(&zip_path),
        std::path::Path::new(&dest_dir),
    )
    .map_err(|err| err.to_string())
}
