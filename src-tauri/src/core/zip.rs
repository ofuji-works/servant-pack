pub struct Zip {}

impl Zip {
    pub fn extract(zip_path: &std::path::Path, dest_dir: &std::path::Path) -> anyhow::Result<()> {
        let target_file = std::fs::File::open(zip_path)?;
        let mut zip_archive = zip::read::ZipArchive::new(target_file)?;

        if zip_archive.extract(dest_dir).is_err() {
            anyhow::bail!("Failure extract zip");
        }

        Ok(())
    }
}
