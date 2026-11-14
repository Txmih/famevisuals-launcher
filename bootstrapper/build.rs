use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    println!("cargo:rerun-if-changed=../src-tauri/icons/icon.ico");
    println!("cargo:rerun-if-changed=build.rs");

    let out_dir = PathBuf::from(env::var_os("OUT_DIR").expect("OUT_DIR not set"));
    let rc_path = out_dir.join("app.rc");
    let res_obj = out_dir.join("app.o");

    let icon_path = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap())
        .join("..")
        .join("src-tauri")
        .join("icons")
        .join("icon.ico");
    let icon_escaped = icon_path.to_string_lossy().replace('\\', "/");

    let rc_content = format!(
        r#"1 ICON "{icon}"
1 VERSIONINFO
FILEVERSION 1,2,0,0
PRODUCTVERSION 1,2,0,0
BEGIN
    BLOCK "StringFileInfo"
    BEGIN
        BLOCK "040904B0"
        BEGIN
            VALUE "CompanyName", "FameVisuals"
            VALUE "FileDescription", "FameLauncher"
            VALUE "FileVersion", "1.2.0"
            VALUE "ProductName", "FameLauncher"
            VALUE "ProductVersion", "1.2.0"
        END
    END
    BLOCK "VarFileInfo"
    BEGIN
        VALUE "Translation", 0x409, 1200
    END
END
"#,
        icon = icon_escaped
    );

    fs::write(&rc_path, rc_content).expect("Failed to write app.rc");

    let windres = env::var_os("WINDRES")
        .map(PathBuf::from)
        .filter(|p| p.is_file())
        .or_else(|| {
            let candidate = PathBuf::from(r"C:\Users\SAMSUNG\.w64devkit\w64devkit\bin\windres.exe");
            candidate.is_file().then_some(candidate)
        })
        .unwrap_or_else(|| PathBuf::from("windres.exe"));

    let status = Command::new(&windres)
        .args([
            "-i",
            rc_path.to_str().unwrap(),
            "-o",
            res_obj.to_str().unwrap(),
            "-O",
            "coff",
        ])
        .status()
        .expect("Failed to execute windres");
    assert!(status.success(), "windres failed with {}", status);

    println!("cargo:rustc-link-arg-bins={}", res_obj.display());
}
