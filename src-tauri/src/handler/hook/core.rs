use crate::core::hook::CoreHook;

pub fn setup_handler(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let core_hook = CoreHook::new(app);
    core_hook.setup()?;

    Ok(())
}
