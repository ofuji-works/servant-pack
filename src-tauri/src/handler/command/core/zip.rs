#[tauri::command]
fn extract_zip(zip_path: String, dest_dir: String) -> Result<(), String> {
    Ok(())
}
