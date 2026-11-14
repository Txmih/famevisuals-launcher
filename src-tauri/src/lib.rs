use futures_util::{stream, StreamExt};
use md5::{Digest as Md5Digest, Md5};
use serde::{Deserialize, Serialize};
use sha1::Sha1;
use sha2::Sha256;
use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use sysinfo::System;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tokio::io::AsyncWriteExt;

const GITHUB_RAW_BASE: &str =
    "https://raw.githubusercontent.com/Txmih/famevisuals-launcher/main";
const DEFAULT_CHANGELOG_JSON: &str = include_str!("../../changelog.json");
const DEFAULT_MANIFEST_JSON: &str = include_str!("../../manifest.json");
const LAUNCHER_USER_AGENT: &str =
    "FameLauncher/1.2.0 (https://github.com/Txmih/famevisuals-launcher)";
const MS_CLIENT_ID: &str = "00000000402b5328";
const MS_REDIRECT_URI: &str = "https://login.live.com/oauth20_desktop.srf";
const MS_SCOPE: &str = "service::user.auth.xboxlive.com::MBI_SSL";

fn default_account_type() -> String {
    "offline".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherSettings {
    pub nickname: String,
    pub ram_mb: u64,
    pub game_dir: String,
    pub language: String,
    #[serde(default)]
    pub custom_wallpaper: Option<String>,
    #[serde(default = "default_account_type")]
    pub account_type: String,
    #[serde(default)]
    pub ms_username: Option<String>,
    #[serde(default)]
    pub ms_uuid: Option<String>,
    #[serde(default)]
    pub ms_access_token: Option<String>,
    #[serde(default)]
    pub ms_refresh_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MicrosoftAccountProfile {
    pub username: String,
    pub uuid: String,
    pub access_token: String,
    pub refresh_token: String,
}

impl Default for LauncherSettings {
    fn default() -> Self {
        Self {
            nickname: "FamePlayer".to_string(),
            ram_mb: 4096,
            game_dir: default_game_dir().to_string_lossy().to_string(),
            language: "ru".to_string(),
            custom_wallpaper: None,
            account_type: default_account_type(),
            ms_username: None,
            ms_uuid: None,
            ms_access_token: None,
            ms_refresh_token: None,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub total_ram_mb: u64,
    pub default_game_dir: String,
    pub launcher_version: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledMod {
    pub file_name: String,
    pub clean_name: String,
    pub mod_id: String,
    pub version: String,
    pub description: String,
    pub enabled: bool,
    pub is_official: bool,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestFile {
    pub name: String,
    pub url: String,
    pub sha256: String,
    #[serde(default)]
    pub size: u64,
    #[serde(default = "default_true")]
    pub required: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModManifest {
    pub version: String,
    #[serde(default = "default_mc_version")]
    pub minecraft_version: String,
    #[serde(default = "default_loader")]
    pub loader: String,
    #[serde(default = "default_loader_version")]
    pub loader_version: String,
    pub files: Vec<ManifestFile>,
}

fn default_mc_version() -> String {
    "1.21.11".to_string()
}

fn default_loader() -> String {
    "fabric".to_string()
}

fn default_loader_version() -> String {
    "0.19.3".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct InstalledManifestState {
    pub version: String,
    pub files: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangelogResponse {
    pub entries: serde_json::Value,
    pub from_cache: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchProgressPayload {
    pub stage: String,
    pub message: String,
    pub percent: f64,
    pub downloaded_mb: f64,
    pub total_mb: f64,
}

#[derive(Debug, Deserialize)]
struct FabricModJson {
    id: Option<String>,
    name: Option<String>,
    version: Option<String>,
    description: Option<String>,
}

fn default_game_dir() -> PathBuf {
    let base = dirs::config_dir()
        .or_else(dirs::data_dir)
        .unwrap_or_else(|| PathBuf::from("."));
    base.join(".famevisuals")
}

fn settings_file_path() -> PathBuf {
    default_game_dir().join("launcher_settings.json")
}

fn sanitize_single_filename(name: &str) -> Result<(), String> {
    if name.is_empty()
        || name.contains('/')
        || name.contains('\\')
        || name.contains("..")
        || Path::new(name).file_name().and_then(|s| s.to_str()) != Some(name)
    {
        return Err(format!("Invalid file name: {}", name));
    }
    Ok(())
}

fn compute_sha256_hex(path: &Path) -> anyhow::Result<String> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 65536];
    loop {
        let n = file.read(&mut buf)?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(hex::encode(hasher.finalize()))
}

fn compute_sha1_hex(path: &Path) -> anyhow::Result<String> {
    let mut file = File::open(path)?;
    let mut hasher = Sha1::new();
    let mut buf = [0u8; 65536];
    loop {
        let n = file.read(&mut buf)?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(hex::encode(hasher.finalize()))
}

fn offline_minecraft_uuid(nickname: &str) -> String {
    let input = format!("OfflinePlayer:{}", nickname);
    let mut hasher = Md5::new();
    hasher.update(input.as_bytes());
    let mut bytes = hasher.finalize();
    bytes[6] = (bytes[6] & 0x0f) | 0x30; // version 3
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC4122
    let h = hex::encode(bytes);
    format!(
        "{}-{}-{}-{}-{}",
        &h[0..8],
        &h[8..12],
        &h[12..16],
        &h[16..20],
        &h[20..32]
    )
}

fn emit_progress(
    app: &AppHandle,
    stage: &str,
    message: &str,
    percent: f64,
    downloaded_bytes: u64,
    total_bytes: u64,
) {
    let payload = LaunchProgressPayload {
        stage: stage.to_string(),
        message: message.to_string(),
        percent: percent.clamp(0.0, 100.0),
        downloaded_mb: downloaded_bytes as f64 / (1024.0 * 1024.0),
        total_mb: total_bytes as f64 / (1024.0 * 1024.0),
    };
    let _ = app.emit("launch-progress", payload);
}

#[tauri::command]
fn get_system_info() -> SystemInfo {
    let mut sys = System::new();
    sys.refresh_memory();
    let total_mb = sys.total_memory() / (1024 * 1024);
    let rounded_mb = ((total_mb / 512) * 512).max(2048);

    SystemInfo {
        total_ram_mb: rounded_mb,
        default_game_dir: default_game_dir().to_string_lossy().to_string(),
        launcher_version: env!("CARGO_PKG_VERSION").to_string(),
    }
}

#[tauri::command]
fn load_settings() -> LauncherSettings {
    let path = settings_file_path();
    let mut settings = if let Ok(raw) = std::fs::read_to_string(&path) {
        serde_json::from_str::<LauncherSettings>(&raw).unwrap_or_default()
    } else {
        LauncherSettings::default()
    };

    if settings.game_dir.trim().is_empty() {
        settings.game_dir = default_game_dir().to_string_lossy().to_string();
    }
    if settings.nickname.trim().is_empty() {
        settings.nickname = "FamePlayer".to_string();
    }
    if settings.ram_mb < 1024 {
        settings.ram_mb = 4096;
    }

    let _ = std::fs::create_dir_all(&settings.game_dir);
    let _ = std::fs::create_dir_all(Path::new(&settings.game_dir).join("mods"));
    settings
}

#[tauri::command]
fn save_settings(settings: LauncherSettings) -> Result<(), String> {
    let cfg_dir = default_game_dir();
    std::fs::create_dir_all(&cfg_dir).map_err(|e| e.to_string())?;
    if !settings.game_dir.trim().is_empty() {
        let gdir = PathBuf::from(&settings.game_dir);
        std::fs::create_dir_all(gdir.join("mods")).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    std::fs::write(settings_file_path(), json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn open_game_dir(path: String) -> Result<(), String> {
    let target = if path.trim().is_empty() {
        default_game_dir()
    } else {
        PathBuf::from(&path)
    };
    std::fs::create_dir_all(&target).map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&target)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("xdg-open")
            .arg(&target)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn read_fabric_metadata(jar_path: &Path) -> Option<FabricModJson> {
    let file = File::open(jar_path).ok()?;
    let mut archive = zip::ZipArchive::new(file).ok()?;
    let mut entry = archive.by_name("fabric.mod.json").ok()?;
    let mut content = String::new();
    entry.read_to_string(&mut content).ok()?;
    let trimmed = content.trim_start_matches('\u{feff}');
    serde_json::from_str::<FabricModJson>(trimmed).ok()
}

fn collect_official_names(game_dir: &Path) -> HashSet<String> {
    let mut set = HashSet::new();
    if let Ok(default_manifest) = serde_json::from_str::<ModManifest>(DEFAULT_MANIFEST_JSON) {
        for f in default_manifest.files {
            set.insert(f.name.to_lowercase());
        }
    }
    let state_path = game_dir.join("installed_manifest.json");
    if let Ok(raw) = std::fs::read_to_string(state_path) {
        if let Ok(state) = serde_json::from_str::<InstalledManifestState>(&raw) {
            for f in state.files {
                set.insert(f.to_lowercase());
            }
        }
    }
    set
}

#[tauri::command]
async fn list_installed_mods(game_dir: String) -> Result<Vec<InstalledMod>, String> {
    let dir = if game_dir.trim().is_empty() {
        default_game_dir()
    } else {
        PathBuf::from(&game_dir)
    };

    tokio::task::spawn_blocking(move || {
        let mods_dir = dir.join("mods");
        std::fs::create_dir_all(&mods_dir).map_err(|e| e.to_string())?;
        let official_names = collect_official_names(&dir);
        let mut results = Vec::new();

        let entries = std::fs::read_dir(&mods_dir).map_err(|e| e.to_string())?;
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let Some(file_name) = path.file_name().and_then(|s| s.to_str()).map(String::from)
            else {
                continue;
            };

            let lower = file_name.to_lowercase();
            let (enabled, base_jar_name) = if lower.ends_with(".jar") {
                (true, file_name.clone())
            } else if lower.ends_with(".jar.disabled") {
                (
                    false,
                    file_name[..file_name.len() - ".disabled".len()].to_string(),
                )
            } else {
                continue;
            };

            let size_bytes = entry.metadata().map(|m| m.len()).unwrap_or(0);
            let meta = read_fabric_metadata(&path);

            let fallback_name = base_jar_name
                .strip_suffix(".jar")
                .unwrap_or(&base_jar_name)
                .to_string();

            let mod_id = meta
                .as_ref()
                .and_then(|m| m.id.clone())
                .filter(|s| !s.trim().is_empty())
                .unwrap_or_else(|| fallback_name.to_lowercase());

            let clean_name = meta
                .as_ref()
                .and_then(|m| m.name.clone())
                .filter(|s| !s.trim().is_empty())
                .unwrap_or(fallback_name);

            let version = meta
                .as_ref()
                .and_then(|m| m.version.clone())
                .filter(|s| !s.trim().is_empty())
                .unwrap_or_else(|| "1.0.0".to_string());

            let description = meta
                .as_ref()
                .and_then(|m| m.description.clone())
                .unwrap_or_default();

            let base_lower = base_jar_name.to_lowercase();
            let is_official = official_names.contains(&base_lower)
                || mod_id.eq_ignore_ascii_case("famevisuals")
                || base_lower.starts_with("famevisuals-");

            results.push(InstalledMod {
                file_name,
                clean_name,
                mod_id,
                version,
                description,
                enabled,
                is_official,
                size_bytes,
            });
        }

        results.sort_by(|a, b| {
            b.is_official
                .cmp(&a.is_official)
                .then_with(|| a.clean_name.to_lowercase().cmp(&b.clean_name.to_lowercase()))
        });
        Ok(results)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
fn toggle_mod(game_dir: String, file_name: String) -> Result<String, String> {
    sanitize_single_filename(&file_name)?;
    let mods_dir = PathBuf::from(&game_dir).join("mods");
    let src = mods_dir.join(&file_name);
    if !src.exists() {
        return Err(format!("Mod file not found: {}", file_name));
    }

    let new_name = if file_name.to_lowercase().ends_with(".jar.disabled") {
        file_name[..file_name.len() - ".disabled".len()].to_string()
    } else if file_name.to_lowercase().ends_with(".jar") {
        format!("{}.disabled", file_name)
    } else {
        return Err("Unsupported mod extension".to_string());
    };

    let dst = mods_dir.join(&new_name);
    std::fs::rename(&src, &dst).map_err(|e| e.to_string())?;
    Ok(new_name)
}

#[tauri::command]
fn delete_mod(game_dir: String, file_name: String) -> Result<(), String> {
    sanitize_single_filename(&file_name)?;
    let lower = file_name.to_lowercase();
    if !lower.ends_with(".jar") && !lower.ends_with(".jar.disabled") {
        return Err("Only .jar files can be deleted".to_string());
    }
    let target = PathBuf::from(&game_dir).join("mods").join(&file_name);
    if target.exists() {
        std::fs::remove_file(&target).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn build_http_client(timeout_secs: u64) -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(LAUNCHER_USER_AGENT)
        .timeout(std::time::Duration::from_secs(timeout_secs))
        .build()
        .map_err(|e| e.to_string())
}

async fn download_to_file_with_callback<F>(
    client: &reqwest::Client,
    url: &str,
    dest: &Path,
    mut on_chunk: F,
) -> Result<u64, String>
where
    F: FnMut(u64, Option<u64>),
{
    if let Some(parent) = dest.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| e.to_string())?;
    }

    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Download request failed ({}): {}", url, e))?;

    if !resp.status().is_success() {
        return Err(format!("HTTP {} while downloading {}", resp.status(), url));
    }

    let total = resp.content_length();
    let part_path = dest.with_extension(format!(
        "{}.part",
        dest.extension().and_then(|s| s.to_str()).unwrap_or("tmp")
    ));

    let mut out = tokio::fs::File::create(&part_path)
        .await
        .map_err(|e| e.to_string())?;
    let mut stream = resp.bytes_stream();
    let mut written: u64 = 0;

    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|e| format!("Stream error ({}): {}", url, e))?;
        out.write_all(&bytes).await.map_err(|e| e.to_string())?;
        written += bytes.len() as u64;
        on_chunk(bytes.len() as u64, total);
    }

    out.flush().await.map_err(|e| e.to_string())?;
    drop(out);

    if dest.exists() {
        let _ = tokio::fs::remove_file(dest).await;
    }
    tokio::fs::rename(&part_path, dest)
        .await
        .map_err(|e| e.to_string())?;

    Ok(written)
}

#[tauri::command]
async fn install_modrinth_mod(
    game_dir: String,
    download_url: String,
    file_name: String,
) -> Result<(), String> {
    sanitize_single_filename(&file_name)?;
    if !file_name.to_lowercase().ends_with(".jar") {
        return Err("Modrinth file must be a .jar".to_string());
    }
    if !download_url.starts_with("https://") {
        return Err("Invalid download URL".to_string());
    }

    let mods_dir = PathBuf::from(&game_dir).join("mods");
    tokio::fs::create_dir_all(&mods_dir)
        .await
        .map_err(|e| e.to_string())?;

    let dest = mods_dir.join(&file_name);
    let client = build_http_client(120)?;
    download_to_file_with_callback(&client, &download_url, &dest, |_, _| {}).await?;
    Ok(())
}

#[tauri::command]
async fn fetch_changelog(game_dir: String) -> Result<ChangelogResponse, String> {
    let dir = if game_dir.trim().is_empty() {
        default_game_dir()
    } else {
        PathBuf::from(&game_dir)
    };
    let cache_path = dir.join("changelog_cache.json");
    let url = format!("{}/changelog.json", GITHUB_RAW_BASE);

    if let Ok(client) = build_http_client(6) {
        if let Ok(resp) = client.get(&url).send().await {
            if resp.status().is_success() {
                if let Ok(text) = resp.text().await {
                    if let Ok(entries) = serde_json::from_str::<serde_json::Value>(&text) {
                        if entries.is_array() {
                            let _ = tokio::fs::create_dir_all(&dir).await;
                            let _ = tokio::fs::write(&cache_path, &text).await;
                            return Ok(ChangelogResponse {
                                entries,
                                from_cache: false,
                            });
                        }
                    }
                }
            }
        }
    }

    if let Ok(cached_raw) = tokio::fs::read_to_string(&cache_path).await {
        if let Ok(entries) = serde_json::from_str::<serde_json::Value>(&cached_raw) {
            return Ok(ChangelogResponse {
                entries,
                from_cache: true,
            });
        }
    }

    let bundled: serde_json::Value = serde_json::from_str(DEFAULT_CHANGELOG_JSON)
        .unwrap_or_else(|_| serde_json::json!([]));
    Ok(ChangelogResponse {
        entries: bundled,
        from_cache: false,
    })
}

// =========================================================================
// Official Modpack Sync + Java 21 + Minecraft 1.21.11 & Fabric Launch
// =========================================================================

async fn sync_official_modpack(
    app: &AppHandle,
    client: &reqwest::Client,
    game_dir: &Path,
) -> Result<ModManifest, String> {
    emit_progress(app, "checking_updates", "Checking manifest...", 6.0, 0, 0);

    let manifest_url = format!("{}/manifest.json", GITHUB_RAW_BASE);
    let manifest: ModManifest = match client.get(&manifest_url).send().await {
        Ok(resp) if resp.status().is_success() => match resp.json::<ModManifest>().await {
            Ok(parsed) => parsed,
            Err(_) => serde_json::from_str(DEFAULT_MANIFEST_JSON).map_err(|e| e.to_string())?,
        },
        _ => serde_json::from_str(DEFAULT_MANIFEST_JSON).map_err(|e| e.to_string())?,
    };

    let mods_dir = game_dir.join("mods");
    tokio::fs::create_dir_all(&mods_dir)
        .await
        .map_err(|e| e.to_string())?;

    let state_path = game_dir.join("installed_manifest.json");
    let prev_state: InstalledManifestState = tokio::fs::read_to_string(&state_path)
        .await
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();

    let new_names: HashSet<String> = manifest.files.iter().map(|f| f.name.clone()).collect();
    for old_file in &prev_state.files {
        if !new_names.contains(old_file) {
            let p1 = mods_dir.join(old_file);
            let p2 = mods_dir.join(format!("{}.disabled", old_file));
            if p1.exists() {
                let _ = tokio::fs::remove_file(p1).await;
            }
            if p2.exists() {
                let _ = tokio::fs::remove_file(p2).await;
            }
        }
    }

    let total_bytes: u64 = manifest
        .files
        .iter()
        .map(|f| if f.size > 0 { f.size } else { 2 * 1024 * 1024 })
        .sum();
    let downloaded_acc = Arc::new(AtomicU64::new(0));

    for (idx, file) in manifest.files.iter().enumerate() {
        sanitize_single_filename(&file.name)?;
        let active_path = mods_dir.join(&file.name);
        let disabled_path = mods_dir.join(format!("{}.disabled", file.name));

        let (target_path, existing_ok) = if active_path.exists() {
            let hash_ok = file.sha256.is_empty()
                || tokio::task::spawn_blocking({
                    let p = active_path.clone();
                    let expected = file.sha256.clone();
                    move || {
                        compute_sha256_hex(&p)
                            .map(|h| h.eq_ignore_ascii_case(&expected))
                            .unwrap_or(false)
                    }
                })
                .await
                .unwrap_or(false);
            (active_path, hash_ok)
        } else if disabled_path.exists() {
            let hash_ok = file.sha256.is_empty()
                || tokio::task::spawn_blocking({
                    let p = disabled_path.clone();
                    let expected = file.sha256.clone();
                    move || {
                        compute_sha256_hex(&p)
                            .map(|h| h.eq_ignore_ascii_case(&expected))
                            .unwrap_or(false)
                    }
                })
                .await
                .unwrap_or(false);
            (disabled_path, hash_ok)
        } else {
            (active_path, false)
        };

        if existing_ok {
            let delta = if file.size > 0 { file.size } else { 0 };
            let done = downloaded_acc.fetch_add(delta, Ordering::Relaxed) + delta;
            let pct = 10.0 + (idx as f64 + 1.0) / manifest.files.len().max(1) as f64 * 15.0;
            emit_progress(app, "syncing_mods", "Syncing mods...", pct, done, total_bytes);
            continue;
        }

        let acc_clone = downloaded_acc.clone();
        let app_clone = app.clone();
        download_to_file_with_callback(client, &file.url, &target_path, |chunk, _| {
            let done = acc_clone.fetch_add(chunk, Ordering::Relaxed) + chunk;
            let ratio = if total_bytes > 0 {
                (done as f64 / total_bytes as f64).min(1.0)
            } else {
                0.5
            };
            emit_progress(
                &app_clone,
                "syncing_mods",
                "Syncing mods...",
                10.0 + ratio * 15.0,
                done,
                total_bytes,
            );
        })
        .await?;

        if !file.sha256.is_empty() {
            let actual_hash = tokio::task::spawn_blocking({
                let p = target_path.clone();
                move || compute_sha256_hex(&p).map_err(|e| e.to_string())
            })
            .await
            .map_err(|e| e.to_string())??;

            if !actual_hash.eq_ignore_ascii_case(&file.sha256) {
                let _ = tokio::fs::remove_file(&target_path).await;
                return Err(format!(
                    "SHA-256 mismatch for {}: expected {}, got {}",
                    file.name, file.sha256, actual_hash
                ));
            }
        }
    }

    let next_state = InstalledManifestState {
        version: manifest.version.clone(),
        files: manifest.files.iter().map(|f| f.name.clone()).collect(),
    };
    let state_json = serde_json::to_string_pretty(&next_state).map_err(|e| e.to_string())?;
    tokio::fs::write(&state_path, state_json)
        .await
        .map_err(|e| e.to_string())?;

    emit_progress(app, "syncing_mods", "Mods synced", 25.0, total_bytes, total_bytes);
    Ok(manifest)
}

fn find_javaw_in_dir(root: &Path) -> Option<PathBuf> {
    let direct = root.join("bin").join("javaw.exe");
    if direct.is_file() {
        return Some(direct);
    }
    if let Ok(entries) = std::fs::read_dir(root) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                let candidate = p.join("bin").join("javaw.exe");
                if candidate.is_file() {
                    return Some(candidate);
                }
            }
        }
    }
    None
}

fn detect_existing_java21(game_dir: &Path) -> Option<PathBuf> {
    let local_runtime = game_dir.join("runtime").join("java-21");
    if let Some(found) = find_javaw_in_dir(&local_runtime) {
        return Some(found);
    }

    let mut search_roots = Vec::new();
    if let Ok(java_home) = std::env::var("JAVA_HOME") {
        search_roots.push(PathBuf::from(java_home));
    }
    if let Some(home) = dirs::home_dir() {
        let jdks = home.join(".jdks");
        if let Ok(entries) = std::fs::read_dir(&jdks) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.to_string_lossy().contains("21") {
                    search_roots.push(p);
                }
            }
        }
    }
    for program_dir in [
        PathBuf::from(r"C:\Program Files\Eclipse Adoptium"),
        PathBuf::from(r"C:\Program Files\Java"),
        PathBuf::from(r"C:\Program Files\Microsoft"),
        PathBuf::from(r"C:\Program Files\Zulu"),
    ] {
        if let Ok(entries) = std::fs::read_dir(&program_dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.to_string_lossy().contains("21") {
                    search_roots.push(p);
                }
            }
        }
    }

    for root in search_roots {
        if let Some(javaw) = find_javaw_in_dir(&root) {
            return Some(javaw);
        }
    }
    None
}

fn extract_zip_all(zip_path: &Path, dest_dir: &Path) -> anyhow::Result<()> {
    let file = File::open(zip_path)?;
    let mut archive = zip::ZipArchive::new(file)?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)?;
        let Some(rel_path) = entry.enclosed_name().map(|p| p.to_path_buf()) else {
            continue;
        };
        let out_path = dest_dir.join(rel_path);
        if entry.is_dir() {
            std::fs::create_dir_all(&out_path)?;
        } else {
            if let Some(parent) = out_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            let mut outfile = File::create(&out_path)?;
            std::io::copy(&mut entry, &mut outfile)?;
        }
    }
    Ok(())
}

async fn ensure_java_21(
    app: &AppHandle,
    client: &reqwest::Client,
    game_dir: &Path,
) -> Result<PathBuf, String> {
    emit_progress(app, "verifying_java", "Checking Java 21...", 28.0, 0, 0);

    let dir_clone = game_dir.to_path_buf();
    if let Some(existing) = tokio::task::spawn_blocking(move || detect_existing_java21(&dir_clone))
        .await
        .map_err(|e| e.to_string())?
    {
        return Ok(existing);
    }

    let runtime_dir = game_dir.join("runtime").join("java-21");
    let zip_path = game_dir.join("runtime").join("temurin-21-jre.zip");
    let url =
        "https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse";

    let app_clone = app.clone();
    let dl_acc = Arc::new(AtomicU64::new(0));
    download_to_file_with_callback(client, url, &zip_path, |chunk, total_opt| {
        let done = dl_acc.fetch_add(chunk, Ordering::Relaxed) + chunk;
        let total = total_opt.unwrap_or(45 * 1024 * 1024);
        let ratio = (done as f64 / total as f64).min(1.0);
        emit_progress(
            &app_clone,
            "verifying_java",
            "Downloading Java 21 runtime...",
            28.0 + ratio * 12.0,
            done,
            total,
        );
    })
    .await?;

    let zip_clone = zip_path.clone();
    let runtime_clone = runtime_dir.clone();
    tokio::task::spawn_blocking(move || -> Result<PathBuf, String> {
        std::fs::create_dir_all(&runtime_clone).map_err(|e| e.to_string())?;
        extract_zip_all(&zip_clone, &runtime_clone).map_err(|e| e.to_string())?;
        let _ = std::fs::remove_file(&zip_clone);
        find_javaw_in_dir(&runtime_clone)
            .ok_or_else(|| "Failed to locate javaw.exe inside downloaded JRE 21".to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

fn rules_allow_windows(rules: &Option<Vec<serde_json::Value>>) -> bool {
    let Some(rules) = rules else {
        return true;
    };
    let mut allowed = false;
    for rule in rules {
        if rule.get("features").is_some() {
            return false;
        }
        let action = rule
            .get("action")
            .and_then(|v| v.as_str())
            .unwrap_or("allow");
        let os_matches = match rule.get("os") {
            Some(os_obj) => {
                let name_ok = os_obj
                    .get("name")
                    .and_then(|v| v.as_str())
                    .map(|n| n == "windows")
                    .unwrap_or(true);
                let arch_ok = os_obj
                    .get("arch")
                    .and_then(|v| v.as_str())
                    .map(|a| a != "x86")
                    .unwrap_or(true);
                name_ok && arch_ok
            }
            None => true,
        };
        if os_matches {
            allowed = action == "allow";
        }
    }
    allowed
}

fn is_incompatible_native(coords_or_path: &str) -> bool {
    let lower = coords_or_path.to_lowercase();
    lower.contains("natives-windows-arm64")
        || (lower.contains("natives-windows-x86") && !lower.contains("natives-windows-x86_64"))
        || lower.contains("natives-linux")
        || lower.contains("natives-macos")
        || lower.contains("natives-osx")
}

fn extract_natives_dlls(jar_path: &Path, natives_dir: &Path) -> anyhow::Result<()> {
    let file = File::open(jar_path)?;
    let mut archive = zip::ZipArchive::new(file)?;
    std::fs::create_dir_all(natives_dir)?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)?;
        let name = entry.name().to_string();
        let lower_name = name.to_lowercase();
        if entry.is_dir() || lower_name.starts_with("meta-inf/") || !lower_name.ends_with(".dll") {
            continue;
        }
        if lower_name.contains("arm64")
            || (lower_name.contains("x86")
                && !lower_name.contains("x86_64")
                && !lower_name.contains("x64"))
        {
            continue;
        }
        if let Some(base_name) = Path::new(&name).file_name() {
            let out_path = natives_dir.join(base_name);
            let mut out = File::create(&out_path)?;
            std::io::copy(&mut entry, &mut out)?;
        }
    }
    Ok(())
}

fn maven_coords_to_path_and_key(coords: &str) -> Option<(String, (String, String, String))> {
    let parts: Vec<&str> = coords.split(':').collect();
    if parts.len() < 3 {
        return None;
    }
    let group = parts[0];
    let artifact = parts[1];
    let version = parts[2];
    let classifier = if parts.len() >= 4 {
        parts[3].split('@').next().unwrap_or("")
    } else {
        ""
    };
    let clean_ver = version.split('@').next().unwrap_or(version);
    let group_path = group.replace('.', "/");
    let jar_name = if classifier.is_empty() {
        format!("{}-{}.jar", artifact, clean_ver)
    } else {
        format!("{}-{}-{}.jar", artifact, clean_ver, classifier)
    };
    let rel_path = format!("{}/{}/{}/{}", group_path, artifact, clean_ver, jar_name);
    let key = (
        group.to_string(),
        artifact.to_string(),
        classifier.to_string(),
    );
    Some((rel_path, key))
}

#[derive(Clone)]
struct DownloadTask {
    url: String,
    dest: PathBuf,
    sha1: Option<String>,
    size: u64,
    is_native: bool,
}

async fn run_download_pool(
    app: &AppHandle,
    client: &reqwest::Client,
    tasks: Vec<DownloadTask>,
    natives_dir: &Path,
    base_percent: f64,
    span_percent: f64,
) -> Result<(), String> {
    let total_bytes: u64 = tasks
        .iter()
        .map(|t| if t.size > 0 { t.size } else { 64 * 1024 })
        .sum();
    let downloaded_acc = Arc::new(AtomicU64::new(0));
    let natives = natives_dir.to_path_buf();

    let results: Vec<Result<(), String>> = stream::iter(tasks)
        .map(|task| {
            let client = client.clone();
            let app = app.clone();
            let acc = downloaded_acc.clone();
            let natives = natives.clone();
            async move {
                let already_valid = if task.dest.is_file() {
                    if let Some(expected_sha1) = &task.sha1 {
                        let p = task.dest.clone();
                        let exp = expected_sha1.clone();
                        tokio::task::spawn_blocking(move || {
                            compute_sha1_hex(&p)
                                .map(|h| h.eq_ignore_ascii_case(&exp))
                                .unwrap_or(false)
                        })
                        .await
                        .unwrap_or(false)
                    } else if task.size > 0 {
                        tokio::fs::metadata(&task.dest)
                            .await
                            .map(|m| m.len() == task.size)
                            .unwrap_or(false)
                    } else {
                        true
                    }
                } else {
                    false
                };

                if already_valid {
                    let add = if task.size > 0 { task.size } else { 64 * 1024 };
                    acc.fetch_add(add, Ordering::Relaxed);
                } else {
                    let app_inner = app.clone();
                    let acc_inner = acc.clone();
                    download_to_file_with_callback(&client, &task.url, &task.dest, |chunk, _| {
                        let done = acc_inner.fetch_add(chunk, Ordering::Relaxed) + chunk;
                        let ratio = if total_bytes > 0 {
                            (done as f64 / total_bytes as f64).min(1.0)
                        } else {
                            0.5
                        };
                        emit_progress(
                            &app_inner,
                            "downloading_minecraft",
                            "Downloading Fabric 1.21.11...",
                            base_percent + ratio * span_percent,
                            done,
                            total_bytes,
                        );
                    })
                    .await?;
                }

                if task.is_native {
                    let p = task.dest.clone();
                    let nd = natives.clone();
                    tokio::task::spawn_blocking(move || {
                        extract_natives_dlls(&p, &nd).map_err(|e| e.to_string())
                    })
                    .await
                    .map_err(|e| e.to_string())??;
                }

                Ok(())
            }
        })
        .buffer_unordered(12)
        .collect()
        .await;

    for r in results {
        r?;
    }

    emit_progress(
        app,
        "downloading_minecraft",
        "Downloading Fabric 1.21.11...",
        base_percent + span_percent,
        total_bytes,
        total_bytes,
    );
    Ok(())
}

// =========================================================================
// Microsoft OAuth2 + Xbox Live + XSTS + Minecraft Services Auth
// =========================================================================

fn format_dashed_uuid(raw: &str) -> String {
    let clean: String = raw.chars().filter(|c| c.is_ascii_hexdigit()).collect();
    if clean.len() == 32 {
        format!(
            "{}-{}-{}-{}-{}",
            &clean[0..8],
            &clean[8..12],
            &clean[12..16],
            &clean[16..20],
            &clean[20..32]
        )
    } else {
        raw.to_string()
    }
}

async fn authenticate_xbox_and_minecraft(
    client: &reqwest::Client,
    msa_access_token: &str,
    msa_refresh_token: String,
) -> Result<MicrosoftAccountProfile, String> {
    // 1. Xbox Live User Authenticate (try raw RpsTicket, fallback to d= prefix)
    let mut xbl_resp_json: Option<serde_json::Value> = None;
    let mut last_xbl_err = String::new();
    for rps_ticket in [msa_access_token.to_string(), format!("d={}", msa_access_token)] {
        let body = serde_json::json!({
            "Properties": {
                "AuthMethod": "RPS",
                "SiteName": "user.auth.xboxlive.com",
                "RpsTicket": rps_ticket
            },
            "RelyingParty": "http://auth.xboxlive.com",
            "TokenType": "JWT"
        });
        let resp = client
            .post("https://user.auth.xboxlive.com/user/authenticate")
            .header("Accept", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Xbox Live request failed: {}", e))?;

        if resp.status().is_success() {
            xbl_resp_json = Some(resp.json().await.map_err(|e| e.to_string())?);
            break;
        } else {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            last_xbl_err = format!("Xbox Live HTTP {}: {}", status, text);
        }
    }

    let xbl_json = xbl_resp_json.ok_or_else(|| {
        if last_xbl_err.is_empty() {
            "Xbox Live authentication failed".to_string()
        } else {
            last_xbl_err
        }
    })?;

    let xbl_token = xbl_json
        .get("Token")
        .and_then(|v| v.as_str())
        .ok_or("Missing Xbox Live token")?
        .to_string();

    let uhs = xbl_json
        .pointer("/DisplayClaims/xui/0/uhs")
        .and_then(|v| v.as_str())
        .ok_or("Missing Xbox Live user hash (uhs)")?
        .to_string();

    // 2. XSTS Authorize
    let xsts_body = serde_json::json!({
        "Properties": {
            "SandboxId": "RETAIL",
            "UserTokens": [xbl_token]
        },
        "RelyingParty": "rp://api.minecraftservices.com/",
        "TokenType": "JWT"
    });
    let xsts_resp = client
        .post("https://xsts.auth.xboxservices.com/xsts/authorize")
        .header("Accept", "application/json")
        .json(&xsts_body)
        .send()
        .await
        .map_err(|e| format!("XSTS request failed: {}", e))?;

    if !xsts_resp.status().is_success() {
        let status = xsts_resp.status();
        let err_json = xsts_resp.json::<serde_json::Value>().await.ok();
        if let Some(xerr) = err_json.as_ref().and_then(|v| v.get("XErr")).and_then(|v| v.as_u64()) {
            let reason = match xerr {
                2148916233 => "У этого Microsoft-аккаунта нет профиля Xbox. Создайте профиль Xbox Live и повторите вход.",
                2148916235 => "Xbox Live недоступен в регионе этого аккаунта.",
                2148916236 | 2148916237 => "Аккаунту требуется подтверждение возраста на сайте Xbox.",
                2148916238 => "Детский аккаунт (до 18 лет): добавьте его в семейную группу Microsoft и разрешите вход.",
                _ => "Ошибка авторизации XSTS.",
            };
            return Err(format!("{} (XErr: {})", reason, xerr));
        }
        return Err(format!("XSTS authorization failed (HTTP {})", status));
    }

    let xsts_json: serde_json::Value = xsts_resp.json().await.map_err(|e| e.to_string())?;
    let xsts_token = xsts_json
        .get("Token")
        .and_then(|v| v.as_str())
        .ok_or("Missing XSTS token")?
        .to_string();

    // 3. Authenticate with Minecraft Services
    let mc_login_body = serde_json::json!({
        "identityToken": format!("XBL3.0 x={};{}", uhs, xsts_token)
    });
    let mc_login_resp = client
        .post("https://api.minecraftservices.com/authentication/login_with_xbox")
        .header("Accept", "application/json")
        .json(&mc_login_body)
        .send()
        .await
        .map_err(|e| format!("Minecraft login request failed: {}", e))?;

    if !mc_login_resp.status().is_success() {
        let status = mc_login_resp.status();
        let text = mc_login_resp.text().await.unwrap_or_default();
        return Err(format!("Minecraft auth failed (HTTP {}): {}", status, text));
    }

    let mc_login_json: serde_json::Value = mc_login_resp.json().await.map_err(|e| e.to_string())?;
    let mc_access_token = mc_login_json
        .get("access_token")
        .and_then(|v| v.as_str())
        .ok_or("Missing Minecraft access_token")?
        .to_string();

    // 4. Fetch Minecraft Java Profile
    let profile_resp = client
        .get("https://api.minecraftservices.com/minecraft/profile")
        .bearer_auth(&mc_access_token)
        .send()
        .await
        .map_err(|e| format!("Profile request failed: {}", e))?;

    if profile_resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(
            "На этом Microsoft-аккаунте не найдена лицензия Minecraft: Java Edition."
                .to_string(),
        );
    }
    if !profile_resp.status().is_success() {
        let status = profile_resp.status();
        let text = profile_resp.text().await.unwrap_or_default();
        return Err(format!("Failed to load Minecraft profile (HTTP {}): {}", status, text));
    }

    let profile_json: serde_json::Value = profile_resp.json().await.map_err(|e| e.to_string())?;
    let raw_uuid = profile_json
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or("Minecraft profile has no UUID (game not owned on this account)")?;
    let username = profile_json
        .get("name")
        .and_then(|v| v.as_str())
        .ok_or("Minecraft profile has no username")?
        .to_string();

    Ok(MicrosoftAccountProfile {
        username,
        uuid: format_dashed_uuid(raw_uuid),
        access_token: mc_access_token,
        refresh_token: msa_refresh_token,
    })
}

async fn exchange_msa_token_request(
    client: &reqwest::Client,
    params: &[(&str, &str)],
) -> Result<(String, String), String> {
    let resp = client
        .post("https://login.live.com/oauth20_token.srf")
        .form(params)
        .send()
        .await
        .map_err(|e| format!("Microsoft OAuth token request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Microsoft OAuth token HTTP {}: {}", status, text));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let access_token = json
        .get("access_token")
        .and_then(|v| v.as_str())
        .ok_or("Microsoft OAuth response missing access_token")?
        .to_string();
    let refresh_token = json
        .get("refresh_token")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    Ok((access_token, refresh_token))
}

async fn refresh_microsoft_profile(
    client: &reqwest::Client,
    refresh_token: &str,
) -> Result<MicrosoftAccountProfile, String> {
    let (msa_access, msa_refresh) = exchange_msa_token_request(
        client,
        &[
            ("client_id", MS_CLIENT_ID),
            ("refresh_token", refresh_token),
            ("grant_type", "refresh_token"),
            ("scope", MS_SCOPE),
            ("redirect_uri", MS_REDIRECT_URI),
        ],
    )
    .await?;

    let final_refresh = if msa_refresh.is_empty() {
        refresh_token.to_string()
    } else {
        msa_refresh
    };
    authenticate_xbox_and_minecraft(client, &msa_access, final_refresh).await
}

#[tauri::command]
async fn login_microsoft(app: AppHandle) -> Result<MicrosoftAccountProfile, String> {
    if let Some(existing) = app.get_webview_window("ms-auth") {
        let _ = existing.destroy();
    }

    let auth_url_str = format!(
        "https://login.live.com/oauth20_authorize.srf?client_id={}&response_type=code&scope=service%3A%3Auser.auth.xboxlive.com%3A%3AMBI_SSL&redirect_uri=https%3A%2F%2Flogin.live.com%2Foauth20_desktop.srf&prompt=select_account",
        MS_CLIENT_ID
    );
    let auth_url = tauri::Url::parse(&auth_url_str).map_err(|e| e.to_string())?;

    let (tx, rx) = tokio::sync::oneshot::channel::<Result<String, String>>();
    let tx_holder = Arc::new(std::sync::Mutex::new(Some(tx)));
    let tx_nav = tx_holder.clone();
    let tx_destroy = tx_holder.clone();
    let app_nav = app.clone();

    let auth_win = WebviewWindowBuilder::new(&app, "ms-auth", WebviewUrl::External(auth_url))
        .title("Microsoft Sign In — FameLauncher")
        .inner_size(500.0, 660.0)
        .center()
        .resizable(true)
        .focused(true)
        .on_navigation(move |nav_url| {
            let s = nav_url.as_str();
            if s.starts_with(MS_REDIRECT_URI) {
                let mut code_opt: Option<String> = None;
                let mut err_opt: Option<String> = None;
                for (k, v) in nav_url.query_pairs() {
                    if k == "code" && !v.is_empty() {
                        code_opt = Some(v.into_owned());
                    } else if (k == "error_description" || k == "error") && !v.is_empty() {
                        err_opt = Some(v.into_owned());
                    }
                }
                if code_opt.is_some() || err_opt.is_some() {
                    if let Ok(mut guard) = tx_nav.lock() {
                        if let Some(sender) = guard.take() {
                            if let Some(code) = code_opt {
                                let _ = sender.send(Ok(code));
                            } else {
                                let _ = sender.send(Err(
                                    err_opt.unwrap_or_else(|| "Microsoft OAuth error".to_string())
                                ));
                            }
                        }
                    }
                    let app_close = app_nav.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Some(w) = app_close.get_webview_window("ms-auth") {
                            let _ = w.close();
                        }
                    });
                    return false;
                }
            }
            true
        })
        .build()
        .map_err(|e| format!("Failed to open Microsoft sign-in window: {}", e))?;

    auth_win.on_window_event(move |event| {
        if let WindowEvent::Destroyed = event {
            if let Ok(mut guard) = tx_destroy.lock() {
                if let Some(sender) = guard.take() {
                    let _ = sender.send(Err("Окно входа Microsoft было закрыто".to_string()));
                }
            }
        }
    });

    let code = tokio::time::timeout(std::time::Duration::from_secs(300), rx)
        .await
        .map_err(|_| "Время ожидания входа Microsoft истекло".to_string())?
        .map_err(|_| "Авторизация Microsoft прервана".to_string())??;

    let client = build_http_client(30)?;
    let (msa_access, msa_refresh) = exchange_msa_token_request(
        &client,
        &[
            ("client_id", MS_CLIENT_ID),
            ("code", &code),
            ("grant_type", "authorization_code"),
            ("redirect_uri", MS_REDIRECT_URI),
            ("scope", MS_SCOPE),
        ],
    )
    .await?;

    authenticate_xbox_and_minecraft(&client, &msa_access, msa_refresh).await
}

#[tauri::command]
async fn launch_game(app: AppHandle, settings: LauncherSettings) -> Result<(), String> {
    let game_dir = if settings.game_dir.trim().is_empty() {
        default_game_dir()
    } else {
        PathBuf::from(&settings.game_dir)
    };
    let offline_nickname = if settings.nickname.trim().is_empty() {
        "FamePlayer".to_string()
    } else {
        settings.nickname.trim().to_string()
    };

    let client = build_http_client(120)?;

    // Resolve Microsoft session if selected
    let mut active_settings = settings.clone();
    let (launch_username, launch_uuid, launch_token, launch_user_type) =
        if active_settings.account_type == "microsoft" {
            let ms_token = active_settings
                .ms_access_token
                .clone()
                .filter(|s| !s.trim().is_empty())
                .ok_or_else(|| {
                    "Выбран режим Microsoft, но вход не выполнен. Нажмите «Войти через Microsoft»."
                        .to_string()
                })?;

            // Validate current Minecraft access token or refresh silently
            let check_resp = client
                .get("https://api.minecraftservices.com/minecraft/profile")
                .bearer_auth(&ms_token)
                .send()
                .await;

            match check_resp {
                Ok(r) if r.status().is_success() => {
                    let u = active_settings
                        .ms_username
                        .clone()
                        .filter(|s| !s.is_empty())
                        .unwrap_or_else(|| offline_nickname.clone());
                    let id = active_settings
                        .ms_uuid
                        .clone()
                        .filter(|s| !s.is_empty())
                        .unwrap_or_else(|| offline_minecraft_uuid(&u));
                    (u, id, ms_token, "msa".to_string())
                }
                _ => {
                    if let Some(ref rt) = active_settings
                        .ms_refresh_token
                        .clone()
                        .filter(|s| !s.trim().is_empty())
                    {
                        emit_progress(
                            &app,
                            "checking_updates",
                            "Refreshing Microsoft session...",
                            3.0,
                            0,
                            0,
                        );
                        let refreshed = refresh_microsoft_profile(&client, rt).await.map_err(|e| {
                            format!(
                                "Сессия Microsoft истекла, выполните вход заново ({})",
                                e
                            )
                        })?;
                        active_settings.ms_username = Some(refreshed.username.clone());
                        active_settings.ms_uuid = Some(refreshed.uuid.clone());
                        active_settings.ms_access_token = Some(refreshed.access_token.clone());
                        active_settings.ms_refresh_token = Some(refreshed.refresh_token.clone());
                        let _ = save_settings(active_settings.clone());
                        (
                            refreshed.username,
                            refreshed.uuid,
                            refreshed.access_token,
                            "msa".to_string(),
                        )
                    } else {
                        return Err(
                            "Токен Microsoft истёк. Пожалуйста, войдите через Microsoft заново."
                                .to_string(),
                        );
                    }
                }
            }
        } else {
            let uuid = offline_minecraft_uuid(&offline_nickname);
            (
                offline_nickname,
                uuid,
                "0".to_string(),
                "legacy".to_string(),
            )
        };

    // 1. Sync official modpack from manifest.json
    let manifest = sync_official_modpack(&app, &client, &game_dir).await?;

    // 2. Ensure Java 21
    let javaw_exe = ensure_java_21(&app, &client, &game_dir).await?;

    // 3. Download/verify Mojang 1.21.11 profile + client + libraries + assets + Fabric Loader
    emit_progress(
        &app,
        "downloading_minecraft",
        "Fetching 1.21.11 metadata...",
        42.0,
        0,
        0,
    );

    let mc_version = &manifest.minecraft_version;
    let version_dir = game_dir.join("versions").join(mc_version);
    let version_json_path = version_dir.join(format!("{}.json", mc_version));
    let client_jar_path = version_dir.join(format!("{}.jar", mc_version));
    tokio::fs::create_dir_all(&version_dir)
        .await
        .map_err(|e| e.to_string())?;

    let mc_profile: serde_json::Value = if version_json_path.is_file() {
        let raw = tokio::fs::read_to_string(&version_json_path)
            .await
            .map_err(|e| e.to_string())?;
        serde_json::from_str(&raw).map_err(|e| e.to_string())?
    } else {
        let vm_resp: serde_json::Value = client
            .get("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json")
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json()
            .await
            .map_err(|e| e.to_string())?;

        let version_url = vm_resp
            .get("versions")
            .and_then(|v| v.as_array())
            .and_then(|arr| {
                arr.iter().find(|entry| {
                    entry.get("id").and_then(|id| id.as_str()) == Some(mc_version.as_str())
                })
            })
            .and_then(|entry| entry.get("url"))
            .and_then(|u| u.as_str())
            .ok_or_else(|| format!("Minecraft {} not found in Mojang manifest", mc_version))?
            .to_string();

        let text = client
            .get(&version_url)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .text()
            .await
            .map_err(|e| e.to_string())?;
        tokio::fs::write(&version_json_path, &text)
            .await
            .map_err(|e| e.to_string())?;
        serde_json::from_str(&text).map_err(|e| e.to_string())?
    };

    // Fetch Fabric Loader profile
    let fabric_dir = game_dir
        .join("versions")
        .join(format!("{}-fabric", mc_version));
    let fabric_json_path = fabric_dir.join(format!("{}-fabric.json", mc_version));
    tokio::fs::create_dir_all(&fabric_dir)
        .await
        .map_err(|e| e.to_string())?;

    let fabric_profile: serde_json::Value = if fabric_json_path.is_file() {
        let raw = tokio::fs::read_to_string(&fabric_json_path)
            .await
            .map_err(|e| e.to_string())?;
        serde_json::from_str(&raw).map_err(|e| e.to_string())?
    } else {
        let primary_url = format!(
            "https://meta.fabricmc.net/v2/versions/loader/{}/{}/profile/json",
            mc_version, manifest.loader_version
        );
        let resp = client.get(&primary_url).send().await;
        let text = match resp {
            Ok(r) if r.status().is_success() => r.text().await.map_err(|e| e.to_string())?,
            _ => {
                // Fallback to latest available loader for mc_version
                let list_url = format!(
                    "https://meta.fabricmc.net/v2/versions/loader/{}",
                    mc_version
                );
                let loaders: serde_json::Value = client
                    .get(&list_url)
                    .send()
                    .await
                    .map_err(|e| e.to_string())?
                    .json()
                    .await
                    .map_err(|e| e.to_string())?;
                let latest_ver = loaders
                    .as_array()
                    .and_then(|arr| arr.first())
                    .and_then(|e| e.pointer("/loader/version"))
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| {
                        format!("No Fabric Loader available for Minecraft {}", mc_version)
                    })?;
                let fallback_url = format!(
                    "https://meta.fabricmc.net/v2/versions/loader/{}/{}/profile/json",
                    mc_version, latest_ver
                );
                client
                    .get(&fallback_url)
                    .send()
                    .await
                    .map_err(|e| e.to_string())?
                    .text()
                    .await
                    .map_err(|e| e.to_string())?
            }
        };
        tokio::fs::write(&fabric_json_path, &text)
            .await
            .map_err(|e| e.to_string())?;
        serde_json::from_str(&text).map_err(|e| e.to_string())?
    };

    let libraries_dir = game_dir.join("libraries");
    let natives_dir = game_dir.join("natives").join(mc_version);
    tokio::fs::create_dir_all(&libraries_dir)
        .await
        .map_err(|e| e.to_string())?;
    if natives_dir.exists() {
        if let Ok(mut entries) = tokio::fs::read_dir(&natives_dir).await {
            while let Ok(Some(entry)) = entries.next_entry().await {
                let p = entry.path();
                if p.extension()
                    .and_then(|e| e.to_str())
                    .map(|e| e.eq_ignore_ascii_case("dll"))
                    .unwrap_or(false)
                {
                    let _ = tokio::fs::remove_file(p).await;
                }
            }
        }
    }
    tokio::fs::create_dir_all(&natives_dir)
        .await
        .map_err(|e| e.to_string())?;

    let mut download_tasks = Vec::new();
    let mut classpath_map: HashMap<(String, String, String), PathBuf> = HashMap::new();

    // Vanilla client jar
    if let Some(client_dl) = mc_profile.pointer("/downloads/client") {
        let url = client_dl
            .get("url")
            .and_then(|v| v.as_str())
            .ok_or("Missing client jar URL")?
            .to_string();
        let sha1 = client_dl
            .get("sha1")
            .and_then(|v| v.as_str())
            .map(String::from);
        let size = client_dl.get("size").and_then(|v| v.as_u64()).unwrap_or(0);
        download_tasks.push(DownloadTask {
            url,
            dest: client_jar_path.clone(),
            sha1,
            size,
            is_native: false,
        });
    }

    // Vanilla libraries + natives (Windows x64 only)
    if let Some(libs) = mc_profile.get("libraries").and_then(|v| v.as_array()) {
        for lib in libs {
            let rules: Option<Vec<serde_json::Value>> = lib
                .get("rules")
                .and_then(|r| serde_json::from_value(r.clone()).ok());
            if !rules_allow_windows(&rules) {
                continue;
            }

            let coords = lib.get("name").and_then(|v| v.as_str()).unwrap_or("");
            if is_incompatible_native(coords) {
                continue;
            }

            if let Some(artifact) = lib.pointer("/downloads/artifact") {
                if let (Some(url), Some(rel_path)) = (
                    artifact.get("url").and_then(|v| v.as_str()),
                    artifact.get("path").and_then(|v| v.as_str()),
                ) {
                    if is_incompatible_native(rel_path) {
                        continue;
                    }
                    let dest = libraries_dir.join(rel_path);
                    let sha1 = artifact
                        .get("sha1")
                        .and_then(|v| v.as_str())
                        .map(String::from);
                    let size = artifact.get("size").and_then(|v| v.as_u64()).unwrap_or(0);
                    let is_native = rel_path.contains("natives-windows");

                    download_tasks.push(DownloadTask {
                        url: url.to_string(),
                        dest: dest.clone(),
                        sha1,
                        size,
                        is_native,
                    });

                    if let Some((_, key)) = maven_coords_to_path_and_key(coords) {
                        classpath_map.insert(key, dest);
                    }
                }
            }

            // Legacy classifier natives if any
            if let Some(native_key) = lib.pointer("/natives/windows").and_then(|v| v.as_str()) {
                let resolved_key = native_key.replace("${arch}", "64");
                if let Some(classifier) =
                    lib.pointer(&format!("/downloads/classifiers/{}", resolved_key))
                {
                    if let (Some(url), Some(rel_path)) = (
                        classifier.get("url").and_then(|v| v.as_str()),
                        classifier.get("path").and_then(|v| v.as_str()),
                    ) {
                        if !is_incompatible_native(rel_path) {
                            download_tasks.push(DownloadTask {
                                url: url.to_string(),
                                dest: libraries_dir.join(rel_path),
                                sha1: classifier
                                    .get("sha1")
                                    .and_then(|v| v.as_str())
                                    .map(String::from),
                                size: classifier
                                    .get("size")
                                    .and_then(|v| v.as_u64())
                                    .unwrap_or(0),
                                is_native: true,
                            });
                        }
                    }
                }
            }
        }
    }

    // Fabric libraries (overwriting matching group:artifact versions in classpath_map)
    if let Some(libs) = fabric_profile.get("libraries").and_then(|v| v.as_array()) {
        for lib in libs {
            let Some(coords) = lib.get("name").and_then(|v| v.as_str()) else {
                continue;
            };
            let base_url = lib
                .get("url")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
                .unwrap_or("https://maven.fabricmc.net/");

            if let Some((rel_path, key)) = maven_coords_to_path_and_key(coords) {
                let dest = libraries_dir.join(&rel_path);
                let url = format!("{}/{}", base_url.trim_end_matches('/'), rel_path);
                let sha1 = lib.get("sha1").and_then(|v| v.as_str()).map(String::from);
                let size = lib.get("size").and_then(|v| v.as_u64()).unwrap_or(0);

                download_tasks.push(DownloadTask {
                    url,
                    dest: dest.clone(),
                    sha1,
                    size,
                    is_native: false,
                });
                classpath_map.insert(key, dest);
            }
        }
    }

    run_download_pool(&app, &client, download_tasks, &natives_dir, 45.0, 25.0).await?;

    // Download Asset Index & Assets
    let assets_dir = game_dir.join("assets");
    let indexes_dir = assets_dir.join("indexes");
    let objects_dir = assets_dir.join("objects");
    tokio::fs::create_dir_all(&indexes_dir)
        .await
        .map_err(|e| e.to_string())?;
    tokio::fs::create_dir_all(&objects_dir)
        .await
        .map_err(|e| e.to_string())?;

    let asset_index_id = mc_profile
        .pointer("/assetIndex/id")
        .and_then(|v| v.as_str())
        .unwrap_or("29")
        .to_string();
    let asset_index_path = indexes_dir.join(format!("{}.json", asset_index_id));

    let asset_index_json: serde_json::Value = if asset_index_path.is_file() {
        let raw = tokio::fs::read_to_string(&asset_index_path)
            .await
            .map_err(|e| e.to_string())?;
        serde_json::from_str(&raw).map_err(|e| e.to_string())?
    } else {
        let idx_url = mc_profile
            .pointer("/assetIndex/url")
            .and_then(|v| v.as_str())
            .ok_or("Missing assetIndex URL")?;
        let raw = client
            .get(idx_url)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .text()
            .await
            .map_err(|e| e.to_string())?;
        tokio::fs::write(&asset_index_path, &raw)
            .await
            .map_err(|e| e.to_string())?;
        serde_json::from_str(&raw).map_err(|e| e.to_string())?
    };

    if let Some(objects) = asset_index_json.get("objects").and_then(|v| v.as_object()) {
        let mut asset_tasks = Vec::with_capacity(objects.len());
        for (_, obj) in objects {
            let Some(hash) = obj.get("hash").and_then(|v| v.as_str()) else {
                continue;
            };
            if hash.len() < 2 {
                continue;
            }
            let size = obj.get("size").and_then(|v| v.as_u64()).unwrap_or(0);
            let prefix = &hash[..2];
            let dest = objects_dir.join(prefix).join(hash);
            let url = format!("https://resources.download.minecraft.net/{}/{}", prefix, hash);
            asset_tasks.push(DownloadTask {
                url,
                dest,
                sha1: Some(hash.to_string()),
                size,
                is_native: false,
            });
        }
        run_download_pool(&app, &client, asset_tasks, &natives_dir, 70.0, 22.0).await?;
    }

    // 4. Spawn Minecraft 1.21.11 + Fabric Process
    emit_progress(&app, "launching", "Launching game...", 95.0, 0, 0);

    let mut cp_entries: Vec<String> = classpath_map
        .values()
        .map(|p| p.to_string_lossy().to_string())
        .collect();
    cp_entries.sort();
    cp_entries.push(client_jar_path.to_string_lossy().to_string());
    let classpath = cp_entries.join(";");

    let main_class = fabric_profile
        .get("mainClass")
        .and_then(|v| v.as_str())
        .unwrap_or("net.fabricmc.loader.impl.launch.knot.KnotClient")
        .to_string();

    let xms = settings.ram_mb.min(1024);
    let natives_str = natives_dir.to_string_lossy().to_string();
    let mut jvm_args = vec![
        format!("-Xmx{}M", settings.ram_mb),
        format!("-Xms{}M", xms),
        "-XX:+UnlockExperimentalVMOptions".to_string(),
        "-XX:+UseG1GC".to_string(),
        "-XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump"
            .to_string(),
        format!("-Djava.library.path={}", natives_str),
        format!("-Dorg.lwjgl.librarypath={}", natives_str),
        format!("-Dorg.lwjgl.system.SharedLibraryExtractPath={}", natives_str),
        format!("-Djna.tmpdir={}", natives_str),
        format!("-Dio.netty.native.workdir={}", natives_str),
        "-Dminecraft.launcher.brand=FameLauncher".to_string(),
        format!("-Dminecraft.launcher.version={}", env!("CARGO_PKG_VERSION")),
    ];

    if let Some(fabric_jvm) = fabric_profile
        .pointer("/arguments/jvm")
        .and_then(|v| v.as_array())
    {
        for item in fabric_jvm {
            if let Some(s) = item.as_str() {
                jvm_args.push(s.to_string());
            }
        }
    }

    jvm_args.push("-cp".to_string());
    jvm_args.push(classpath);

    let mut game_args = vec![
        "--username".to_string(),
        launch_username,
        "--version".to_string(),
        format!("{}-Fabric", mc_version),
        "--gameDir".to_string(),
        game_dir.to_string_lossy().to_string(),
        "--assetsDir".to_string(),
        assets_dir.to_string_lossy().to_string(),
        "--assetIndex".to_string(),
        asset_index_id,
        "--uuid".to_string(),
        launch_uuid,
        "--accessToken".to_string(),
        launch_token,
        "--userType".to_string(),
        launch_user_type,
        "--userProperties".to_string(),
        "{}".to_string(),
        "--versionType".to_string(),
        "FameLauncher".to_string(),
    ];

    if active_settings.account_type != "microsoft" {
        game_args.push("--offlineDeveloperMode".to_string());
    }

    if let Some(fabric_game) = fabric_profile
        .pointer("/arguments/game")
        .and_then(|v| v.as_array())
    {
        for item in fabric_game {
            if let Some(s) = item.as_str() {
                game_args.push(s.to_string());
            }
        }
    }

    let mut child = std::process::Command::new(&javaw_exe)
        .current_dir(&game_dir)
        .args(&jvm_args)
        .arg(&main_class)
        .args(&game_args)
        .spawn()
        .map_err(|e| format!("Failed to start Minecraft process: {}", e))?;

    tokio::time::sleep(std::time::Duration::from_millis(1200)).await;
    if let Ok(Some(status)) = child.try_wait() {
        if !status.success() {
            return Err(format!("Minecraft exited immediately with status {}", status));
        }
    }

    emit_progress(&app, "ready", "Game launched!", 100.0, 0, 0);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            load_settings,
            save_settings,
            open_game_dir,
            list_installed_mods,
            toggle_mod,
            delete_mod,
            install_modrinth_mod,
            fetch_changelog,
            login_microsoft,
            launch_game
        ])
        .run(tauri::generate_context!())
        .expect("error while running FameLauncher");
}
