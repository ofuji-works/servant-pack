use crate::application::usecase::boot::BootUsecase;

pub fn boot_handler(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let usecase = BootUsecase::new(app);
    usecase.setup()?;

    Ok(())
}
