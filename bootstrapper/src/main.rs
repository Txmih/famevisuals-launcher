#![windows_subsystem = "windows"]

use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

const WEBVIEW2_DLL: &[u8] = include_bytes!("../../src-tauri/WebView2Loader.dll");
const CORE_EXE: &[u8] = include_bytes!("../../src-tauri/target/release/famevisuals-launcher.exe");

fn runtime_dir() -> PathBuf {
    let base = env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(env::temp_dir);
    base.join("FameLauncher").join("runtime")
}

fn bytes_match(path: &Path, expected: &[u8]) -> bool {
    match fs::read(path) {
        Ok(existing) => existing.len() == expected.len() && existing == expected,
        Err(_) => false,
    }
}

fn write_exact(path: &Path, data: &[u8]) -> std::io::Result<()> {
    if bytes_match(path, data) {
        return Ok(());
    }
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, data)?;
    if fs::rename(&tmp, path).is_err() {
        let _ = fs::remove_file(&tmp);
        fs::write(path, data)?;
    }
    Ok(())
}

fn cleanup_stale_cores(dir: &Path) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                if name.starts_with("FameLauncher-core-") && name.ends_with(".exe") {
                    let _ = fs::remove_file(p);
                }
            }
        }
    }
}

fn main() {
    if let Ok(exe_path) = env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let local_dll = exe_dir.join("WebView2Loader.dll");
            if !local_dll.exists() {
                let _ = fs::write(&local_dll, WEBVIEW2_DLL);
            }
        }
    }

    let dir = runtime_dir();
    if fs::create_dir_all(&dir).is_err() {
        return;
    }
    cleanup_stale_cores(&dir);

    let dll_path = dir.join("WebView2Loader.dll");
    if write_exact(&dll_path, WEBVIEW2_DLL).is_err() && !dll_path.is_file() {
        return;
    }

    let core_path = dir.join("FameLauncher-core.exe");
    let launch_exe = if write_exact(&core_path, CORE_EXE).is_ok() {
        core_path
    } else if bytes_match(&core_path, CORE_EXE) {
        core_path
    } else {
        let alt_path = dir.join(format!("FameLauncher-core-{}.exe", std::process::id()));
        if fs::write(&alt_path, CORE_EXE).is_err() {
            return;
        }
        alt_path
    };

    let mut cmd = Command::new(&launch_exe);
    cmd.args(env::args_os().skip(1));
    if let Ok(cwd) = env::current_dir() {
        cmd.current_dir(cwd);
    }
    let _ = cmd.spawn();
}
