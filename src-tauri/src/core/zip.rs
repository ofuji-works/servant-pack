pub struct Zip {}

const MAX_TOTAL_UNCOMPRESSED_SIZE: u64 = 100 * 1024 * 1024; // 100 MiB
const MAX_FILE_COUNT: usize = 10_000;

impl Zip {
    pub fn extract(zip_path: &std::path::Path, dest_dir: &std::path::Path) -> anyhow::Result<()> {
        let target_file = std::fs::File::open(zip_path)?;
        let mut zip_archive = zip::read::ZipArchive::new(target_file)?;

        if zip_archive.len() > MAX_FILE_COUNT {
            anyhow::bail!(
                "zip contains {} entries, exceeds limit of {}",
                zip_archive.len(),
                MAX_FILE_COUNT
            );
        }

        let mut total: u64 = 0;
        for i in 0..zip_archive.len() {
            let entry = zip_archive.by_index(i)?;
            total = total.saturating_add(entry.size());
            if total > MAX_TOTAL_UNCOMPRESSED_SIZE {
                anyhow::bail!(
                    "uncompressed size exceeds limit of {} bytes",
                    MAX_TOTAL_UNCOMPRESSED_SIZE
                );
            }
        }

        if zip_archive.extract(dest_dir).is_err() {
            anyhow::bail!("Failure extract zip");
        }

        Ok(())
    }
}
