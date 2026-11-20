#![windows_subsystem = "windows"]

use std::env;
use std::ffi::c_void;
use std::fs;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::ptr::{null, null_mut};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

const WEBVIEW2_DLL: &[u8] = include_bytes!("../../src-tauri/WebView2Loader.dll");
const CORE_EXE: &[u8] = include_bytes!("../../src-tauri/target/release/famevisuals-launcher.exe");
const ICON_ICO: &[u8] = include_bytes!("../../src-tauri/icons/icon.ico");
const LOGO_PNG: &[u8] = include_bytes!("../../src-tauri/icons/icon.png");

const WIN_W: i32 = 540;
const WIN_H: i32 = 380;
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

const WS_POPUP: u32 = 0x8000_0000;
const WS_VISIBLE: u32 = 0x1000_0000;
const WS_EX_APPWINDOW: u32 = 0x0004_0000;

const WM_DESTROY: u32 = 0x0002;
const WM_PAINT: u32 = 0x000F;
const WM_ERASEBKGND: u32 = 0x0014;
const WM_NCHITTEST: u32 = 0x0084;
const WM_TIMER: u32 = 0x0113;
const WM_MOUSEMOVE: u32 = 0x0200;
const WM_LBUTTONDOWN: u32 = 0x0201;
const WM_LBUTTONUP: u32 = 0x0202;

const HTCAPTION: isize = 2;
const HTCLIENT: isize = 1;
const SRCCOPY: u32 = 0x00CC_0020;
const IDC_ARROW: usize = 32512;
const IDC_HAND: usize = 32649;
const SM_CXSCREEN: i32 = 0;
const SM_CYSCREEN: i32 = 1;
const GMEM_MOVEABLE: u32 = 0x0002;
const DWMWA_WINDOW_CORNER_PREFERENCE: u32 = 33;
const DWMWCP_ROUND: u32 = 2;

#[repr(C)]
struct WNDCLASSEXW {
    cb_size: u32,
    style: u32,
    lpfn_wnd_proc: unsafe extern "system" fn(isize, u32, usize, isize) -> isize,
    cb_cls_extra: i32,
    cb_wnd_extra: i32,
    h_instance: isize,
    h_icon: isize,
    h_cursor: isize,
    hbr_background: isize,
    lpsz_menu_name: *const u16,
    lpsz_class_name: *const u16,
    h_icon_sm: isize,
}

#[repr(C)]
struct MSG {
    hwnd: isize,
    message: u32,
    w_param: usize,
    l_param: isize,
    time: u32,
    pt_x: i32,
    pt_y: i32,
}

#[repr(C)]
struct RECT {
    left: i32,
    top: i32,
    right: i32,
    bottom: i32,
}

#[repr(C)]
struct PAINTSTRUCT {
    hdc: isize,
    f_erase: i32,
    rc_paint: RECT,
    f_restore: i32,
    f_inc_update: i32,
    rgb_reserved: [u8; 32],
}

#[repr(C)]
struct GdiplusStartupInput {
    gdiplus_version: u32,
    debug_event_callback: usize,
    suppress_background_thread: i32,
    suppress_external_codecs: i32,
}

#[repr(C)]
struct RectF {
    x: f32,
    y: f32,
    w: f32,
    h: f32,
}

#[link(name = "user32")]
extern "system" {
    fn RegisterClassExW(wc: *const WNDCLASSEXW) -> u16;
    fn CreateWindowExW(
        ex_style: u32,
        class_name: *const u16,
        window_name: *const u16,
        style: u32,
        x: i32,
        y: i32,
        w: i32,
        h: i32,
        parent: isize,
        menu: isize,
        instance: isize,
        param: *const c_void,
    ) -> isize;
    fn ShowWindow(hwnd: isize, cmd: i32) -> i32;
    fn UpdateWindow(hwnd: isize) -> i32;
    fn GetMessageW(msg: *mut MSG, hwnd: isize, min: u32, max: u32) -> i32;
    fn TranslateMessage(msg: *const MSG) -> i32;
    fn DispatchMessageW(msg: *const MSG) -> isize;
    fn DefWindowProcW(hwnd: isize, msg: u32, wp: usize, lp: isize) -> isize;
    fn PostQuitMessage(code: i32);
    fn DestroyWindow(hwnd: isize) -> i32;
    fn BeginPaint(hwnd: isize, ps: *mut PAINTSTRUCT) -> isize;
    fn EndPaint(hwnd: isize, ps: *const PAINTSTRUCT) -> i32;
    fn InvalidateRect(hwnd: isize, rect: *const RECT, erase: i32) -> i32;
    fn GetSystemMetrics(index: i32) -> i32;
    fn LoadCursorW(instance: isize, name: *const u16) -> isize;
    fn SetCursor(cursor: isize) -> isize;
    fn LoadIconW(instance: isize, name: *const u16) -> isize;
    fn SetTimer(hwnd: isize, id: usize, elapse: u32, func: usize) -> usize;
    fn KillTimer(hwnd: isize, id: usize) -> i32;
    fn ScreenToClient(hwnd: isize, pt: *mut [i32; 2]) -> i32;
    fn SetProcessDPIAware() -> i32;
}

#[link(name = "kernel32")]
extern "system" {
    fn GetModuleHandleW(name: *const u16) -> isize;
    fn GlobalAlloc(flags: u32, bytes: usize) -> isize;
    fn GlobalLock(hmem: isize) -> *mut u8;
    fn GlobalUnlock(hmem: isize) -> i32;
}

#[link(name = "gdi32")]
extern "system" {
    fn CreateCompatibleDC(hdc: isize) -> isize;
    fn CreateCompatibleBitmap(hdc: isize, w: i32, h: i32) -> isize;
    fn SelectObject(hdc: isize, obj: isize) -> isize;
    fn DeleteObject(obj: isize) -> i32;
    fn DeleteDC(hdc: isize) -> i32;
    fn BitBlt(
        dst: isize,
        x: i32,
        y: i32,
        w: i32,
        h: i32,
        src: isize,
        sx: i32,
        sy: i32,
        rop: u32,
    ) -> i32;
}

#[link(name = "dwmapi")]
extern "system" {
    fn DwmSetWindowAttribute(hwnd: isize, attr: u32, val: *const c_void, size: u32) -> i32;
}

#[link(name = "ole32")]
extern "system" {
    fn CreateStreamOnHGlobal(hglobal: isize, delete_on_release: i32, ppstm: *mut *mut c_void) -> i32;
}

#[link(name = "gdiplus")]
extern "system" {
    fn GdiplusStartup(token: *mut usize, input: *const GdiplusStartupInput, output: *mut c_void) -> i32;
    fn GdiplusShutdown(token: usize);
    fn GdipCreateFromHDC(hdc: isize, graphics: *mut *mut c_void) -> i32;
    fn GdipDeleteGraphics(graphics: *mut c_void) -> i32;
    fn GdipSetSmoothingMode(graphics: *mut c_void, mode: i32) -> i32;
    fn GdipSetTextRenderingHint(graphics: *mut c_void, hint: i32) -> i32;
    fn GdipSetInterpolationMode(graphics: *mut c_void, mode: i32) -> i32;
    fn GdipCreateSolidFill(argb: u32, brush: *mut *mut c_void) -> i32;
    fn GdipDeleteBrush(brush: *mut c_void) -> i32;
    fn GdipCreatePen1(argb: u32, width: f32, unit: i32, pen: *mut *mut c_void) -> i32;
    fn GdipDeletePen(pen: *mut c_void) -> i32;
    fn GdipFillRectangle(g: *mut c_void, brush: *mut c_void, x: f32, y: f32, w: f32, h: f32) -> i32;
    fn GdipCreatePath(fill_mode: i32, path: *mut *mut c_void) -> i32;
    fn GdipDeletePath(path: *mut c_void) -> i32;
    fn GdipAddPathArc(path: *mut c_void, x: f32, y: f32, w: f32, h: f32, start: f32, sweep: f32) -> i32;
    fn GdipClosePathFigure(path: *mut c_void) -> i32;
    fn GdipFillPath(g: *mut c_void, brush: *mut c_void, path: *mut c_void) -> i32;
    fn GdipDrawPath(g: *mut c_void, pen: *mut c_void, path: *mut c_void) -> i32;
    fn GdipDrawLine(g: *mut c_void, pen: *mut c_void, x1: f32, y1: f32, x2: f32, y2: f32) -> i32;
    fn GdipCreateFontFamilyFromName(name: *const u16, coll: *mut c_void, family: *mut *mut c_void) -> i32;
    fn GdipDeleteFontFamily(family: *mut c_void) -> i32;
    fn GdipCreateFont(family: *mut c_void, em_size: f32, style: i32, unit: i32, font: *mut *mut c_void) -> i32;
    fn GdipDeleteFont(font: *mut c_void) -> i32;
    fn GdipCreateStringFormat(attrs: i32, lang: u16, fmt: *mut *mut c_void) -> i32;
    fn GdipSetStringFormatAlign(fmt: *mut c_void, align: i32) -> i32;
    fn GdipSetStringFormatLineAlign(fmt: *mut c_void, align: i32) -> i32;
    fn GdipDeleteStringFormat(fmt: *mut c_void) -> i32;
    fn GdipDrawString(
        g: *mut c_void,
        s: *const u16,
        len: i32,
        font: *mut c_void,
        layout: *const RectF,
        fmt: *mut c_void,
        brush: *mut c_void,
    ) -> i32;
    fn GdipCreateBitmapFromStream(stream: *mut c_void, bitmap: *mut *mut c_void) -> i32;
    fn GdipDrawImageRect(g: *mut c_void, img: *mut c_void, x: f32, y: f32, w: f32, h: f32) -> i32;
    fn GdipDisposeImage(img: *mut c_void) -> i32;
}

fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

fn install_dir() -> PathBuf {
    let base = env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(env::temp_dir);
    base.join("FameLauncher")
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
    Ready,
    Installing,
    Done,
    Error,
}

struct AppState {
    phase: Phase,
    progress: Arc<AtomicU32>,
    status: Arc<Mutex<String>>,
    desktop_shortcut: Arc<AtomicBool>,
    hover_btn: bool,
    hover_close: bool,
    hover_chk: bool,
    logo_bmp: *mut c_void,
    install_path: String,
    installed_exe: PathBuf,
    display_progress: f32,
}

static mut STATE: Option<Box<AppState>> = None;

fn state_mut() -> &'static mut AppState {
    unsafe {
        (*std::ptr::addr_of_mut!(STATE))
            .as_mut()
            .expect("state initialized")
    }
}

fn btn_rect() -> (i32, i32, i32, i32) {
    (115, 298, 425, 344)
}

fn close_rect() -> (i32, i32, i32, i32) {
    (WIN_W - 42, 12, WIN_W - 14, 38)
}

fn chk_rect() -> (i32, i32, i32, i32) {
    (138, 255, 402, 282)
}

fn hit(r: (i32, i32, i32, i32), x: i32, y: i32) -> bool {
    x >= r.0 && x <= r.2 && y >= r.1 && y <= r.3
}

unsafe fn make_round_path(x: f32, y: f32, w: f32, h: f32, r: f32) -> *mut c_void {
    let mut path = null_mut();
    GdipCreatePath(0, &mut path);
    let d = r * 2.0;
    GdipAddPathArc(path, x, y, d, d, 180.0, 90.0);
    GdipAddPathArc(path, x + w - d, y, d, d, 270.0, 90.0);
    GdipAddPathArc(path, x + w - d, y + h - d, d, d, 0.0, 90.0);
    GdipAddPathArc(path, x, y + h - d, d, d, 90.0, 90.0);
    GdipClosePathFigure(path);
    path
}

unsafe fn fill_round_rect(g: *mut c_void, x: f32, y: f32, w: f32, h: f32, r: f32, argb: u32) {
    let path = make_round_path(x, y, w, h, r);
    let mut brush = null_mut();
    GdipCreateSolidFill(argb, &mut brush);
    GdipFillPath(g, brush, path);
    GdipDeleteBrush(brush);
    GdipDeletePath(path);
}

unsafe fn stroke_round_rect(g: *mut c_void, x: f32, y: f32, w: f32, h: f32, r: f32, argb: u32, width: f32) {
    let path = make_round_path(x, y, w, h, r);
    let mut pen = null_mut();
    GdipCreatePen1(argb, width, 2, &mut pen);
    GdipDrawPath(g, pen, path);
    GdipDeletePen(pen);
    GdipDeletePath(path);
}

unsafe fn draw_text(
    g: *mut c_void,
    text: &str,
    size: f32,
    bold: bool,
    argb: u32,
    rect: RectF,
    align_h: i32,
    align_v: i32,
) {
    let fam_name = wide("Segoe UI");
    let mut fam = null_mut();
    GdipCreateFontFamilyFromName(fam_name.as_ptr(), null_mut(), &mut fam);
    if fam.is_null() {
        return;
    }
    let mut font = null_mut();
    GdipCreateFont(fam, size, if bold { 1 } else { 0 }, 2, &mut font);
    let mut fmt = null_mut();
    GdipCreateStringFormat(0, 0, &mut fmt);
    GdipSetStringFormatAlign(fmt, align_h);
    GdipSetStringFormatLineAlign(fmt, align_v);
    let mut brush = null_mut();
    GdipCreateSolidFill(argb, &mut brush);
    let wtext = wide(text);
    GdipDrawString(
        g,
        wtext.as_ptr(),
        (wtext.len() as i32) - 1,
        font,
        &rect,
        fmt,
        brush,
    );
    GdipDeleteBrush(brush);
    GdipDeleteStringFormat(fmt);
    GdipDeleteFont(font);
    GdipDeleteFontFamily(fam);
}

unsafe fn load_logo_bitmap() -> *mut c_void {
    let hmem = GlobalAlloc(GMEM_MOVEABLE, LOGO_PNG.len());
    if hmem == 0 {
        return null_mut();
    }
    let ptr = GlobalLock(hmem);
    if !ptr.is_null() {
        std::ptr::copy_nonoverlapping(LOGO_PNG.as_ptr(), ptr, LOGO_PNG.len());
        GlobalUnlock(hmem);
    }
    let mut stream = null_mut();
    if CreateStreamOnHGlobal(hmem, 1, &mut stream) != 0 || stream.is_null() {
        return null_mut();
    }
    let mut bmp = null_mut();
    GdipCreateBitmapFromStream(stream, &mut bmp);
    bmp
}

fn create_shortcut(target_exe: &Path, icon_path: &Path, shortcut_path: &Path) {
    let esc = |p: &Path| p.to_string_lossy().replace('\'', "''");
    let script = format!(
        "$ws = New-Object -ComObject WScript.Shell; \
         $s = $ws.CreateShortcut('{}'); \
         $s.TargetPath = '{}'; \
         $s.WorkingDirectory = '{}'; \
         $s.IconLocation = '{}'; \
         $s.Description = 'FameLauncher — Minecraft 1.21.11 Fabric'; \
         $s.Save()",
        esc(shortcut_path),
        esc(target_exe),
        esc(target_exe.parent().unwrap_or(Path::new("."))),
        esc(icon_path),
    );
    let _ = Command::new("powershell.exe")
        .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .status();
}

fn start_install(hwnd: isize) {
    let st = state_mut();
    if st.phase != Phase::Ready && st.phase != Phase::Error {
        return;
    }
    st.phase = Phase::Installing;
    st.progress.store(5, Ordering::SeqCst);
    st.display_progress = 0.05;

    let prog = st.progress.clone();
    let status = st.status.clone();
    let make_desktop = st.desktop_shortcut.load(Ordering::SeqCst);
    let dest_dir = install_dir();

    thread::spawn(move || {
        let set_step = |pct: u32, msg: &str| {
            prog.store(pct, Ordering::SeqCst);
            if let Ok(mut guard) = status.lock() {
                *guard = msg.to_string();
            }
        };

        set_step(15, "Подготовка папки установки...");
        if let Err(e) = fs::create_dir_all(&dest_dir) {
            set_step(1000, &format!("Ошибка: {}", e));
            return;
        }
        thread::sleep(Duration::from_millis(160));

        set_step(45, "Установка FameLauncher.exe...");
        let exe_path = dest_dir.join("FameLauncher.exe");
        if exe_path.exists() {
            let _ = Command::new("taskkill.exe")
                .args(["/F", "/IM", "FameLauncher.exe"])
                .creation_flags(CREATE_NO_WINDOW)
                .status();
            thread::sleep(Duration::from_millis(250));
        }
        let tmp_exe = dest_dir.join("FameLauncher.exe.tmp");
        if let Err(e) = fs::write(&tmp_exe, CORE_EXE) {
            set_step(1000, &format!("Ошибка записи: {}", e));
            return;
        }
        if fs::rename(&tmp_exe, &exe_path).is_err() {
            let _ = fs::remove_file(&tmp_exe);
            if let Err(e) = fs::write(&exe_path, CORE_EXE) {
                set_step(1000, &format!("Закройте FameLauncher и повторите ({})", e));
                return;
            }
        }
        thread::sleep(Duration::from_millis(180));

        set_step(72, "Настройка WebView2 и ресурсов...");
        let dll_path = dest_dir.join("WebView2Loader.dll");
        let _ = fs::write(&dll_path, WEBVIEW2_DLL);
        let ico_path = dest_dir.join("FameLauncher.ico");
        let _ = fs::write(&ico_path, ICON_ICO);
        thread::sleep(Duration::from_millis(180));

        set_step(90, "Создание ярлыков...");
        if let Some(appdata) = env::var_os("APPDATA") {
            let start_menu = PathBuf::from(appdata)
                .join("Microsoft")
                .join("Windows")
                .join("Start Menu")
                .join("Programs");
            let _ = fs::create_dir_all(&start_menu);
            create_shortcut(&exe_path, &ico_path, &start_menu.join("FameLauncher.lnk"));
        }
        if make_desktop {
            if let Some(profile) = env::var_os("USERPROFILE") {
                let desktop = PathBuf::from(profile).join("Desktop");
                if desktop.is_dir() {
                    create_shortcut(&exe_path, &ico_path, &desktop.join("FameLauncher.lnk"));
                }
            }
        }
        thread::sleep(Duration::from_millis(200));

        set_step(100, "Установка успешно завершена!");
        unsafe {
            InvalidateRect(hwnd, null(), 0);
        }
    });
}

unsafe fn paint_ui(_hwnd: isize, hdc: isize) {
    let mem_dc = CreateCompatibleDC(hdc);
    let mem_bmp = CreateCompatibleBitmap(hdc, WIN_W, WIN_H);
    let old_bmp = SelectObject(mem_dc, mem_bmp);

    let mut g = null_mut();
    GdipCreateFromHDC(mem_dc, &mut g);
    GdipSetSmoothingMode(g, 4); // AntiAlias
    GdipSetTextRenderingHint(g, 5); // ClearTypeGridFit
    GdipSetInterpolationMode(g, 7); // HighQualityBicubic

    let st = state_mut();

    // 1. Deep Obsidian Background (#0A0B0F)
    let mut bg_brush = null_mut();
    GdipCreateSolidFill(0xFF0A_0B0F, &mut bg_brush);
    GdipFillRectangle(g, bg_brush, 0.0, 0.0, WIN_W as f32, WIN_H as f32);
    GdipDeleteBrush(bg_brush);

    // Subtle top ambient sheen card header
    let mut hdr_brush = null_mut();
    GdipCreateSolidFill(0xFF0E_1017, &mut hdr_brush);
    GdipFillRectangle(g, hdr_brush, 1.0, 1.0, (WIN_W - 2) as f32, 48.0);
    GdipDeleteBrush(hdr_brush);

    // Thin divider below header
    let mut sep_pen = null_mut();
    GdipCreatePen1(0x14FF_FFFF, 1.0, 2, &mut sep_pen);
    GdipDrawLine(g, sep_pen, 1.0, 49.0, (WIN_W - 1) as f32, 49.0);
    GdipDeletePen(sep_pen);

    // Outer 1px crisp chrome border
    stroke_round_rect(g, 0.5, 0.5, (WIN_W - 1) as f32, (WIN_H - 1) as f32, 10.0, 0x22FF_FFFF, 1.0);

    // 2. Top bar label & minimal Close '×' button
    draw_text(
        g,
        "FAMELAUNCHER  •  SETUP",
        10.5,
        true,
        0xFF8A_90A0,
        RectF { x: 18.0, y: 12.0, w: 280.0, h: 26.0 },
        0,
        1,
    );

    let cr = close_rect();
    if st.hover_close {
        fill_round_rect(
            g,
            cr.0 as f32,
            cr.1 as f32,
            (cr.2 - cr.0) as f32,
            (cr.3 - cr.1) as f32,
            7.0,
            0xCCE1_1D48,
        );
    }
    let mut x_pen = null_mut();
    GdipCreatePen1(if st.hover_close { 0xFFFF_FFFF } else { 0xFF9C_A3AF }, 1.6, 2, &mut x_pen);
    let cx = (cr.0 + cr.2) as f32 * 0.5;
    let cy = (cr.1 + cr.3) as f32 * 0.5;
    GdipDrawLine(g, x_pen, cx - 4.5, cy - 4.5, cx + 4.5, cy + 4.5);
    GdipDrawLine(g, x_pen, cx + 4.5, cy - 4.5, cx - 4.5, cy + 4.5);
    GdipDeletePen(x_pen);

    // 3. Center Logo Badge (High-res 512x512 shattered-chrome 'F' logo)
    let logo_x = (WIN_W as f32 - 80.0) * 0.5;
    let logo_y = 70.0;
    fill_round_rect(g, logo_x - 3.0, logo_y - 3.0, 86.0, 86.0, 18.0, 0xFF13_1620);
    if !st.logo_bmp.is_null() {
        GdipDrawImageRect(g, st.logo_bmp, logo_x + 2.0, logo_y + 2.0, 76.0, 76.0);
    }
    stroke_round_rect(g, logo_x - 3.0, logo_y - 3.0, 86.0, 86.0, 18.0, 0x2AFF_FFFF, 1.2);

    // 4. Title & Subtitle
    draw_text(
        g,
        "FameLauncher",
        22.0,
        true,
        0xFFF6_F7FA,
        RectF { x: 20.0, y: 164.0, w: (WIN_W - 40) as f32, h: 32.0 },
        1,
        1,
    );
    draw_text(
        g,
        "Minecraft 1.21.11  •  Fabric Client  •  v1.3.0",
        11.5,
        false,
        0xFF8C_93A4,
        RectF { x: 20.0, y: 196.0, w: (WIN_W - 40) as f32, h: 22.0 },
        1,
        1,
    );

    // 5. Middle Section: Ready (Path + Shortcut checkbox) OR Installing/Done (Sleek Progress Bar)
    if st.phase == Phase::Ready {
        // Install path pill
        fill_round_rect(g, 76.0, 224.0, (WIN_W - 152) as f32, 26.0, 8.0, 0xFF11_131B);
        stroke_round_rect(g, 76.0, 224.0, (WIN_W - 152) as f32, 26.0, 8.0, 0x16FF_FFFF, 1.0);
        draw_text(
            g,
            &st.install_path,
            10.5,
            false,
            0xFFA6_ADBD,
            RectF { x: 84.0, y: 224.0, w: (WIN_W - 168) as f32, h: 26.0 },
            1,
            1,
        );

        // Desktop shortcut toggle
        let ck = chk_rect();
        let checked = st.desktop_shortcut.load(Ordering::SeqCst);
        let box_x = ck.0 as f32 + 12.0;
        let box_y = ck.1 as f32 + 5.0;
        fill_round_rect(
            g,
            box_x,
            box_y,
            16.0,
            16.0,
            4.5,
            if checked { 0xFFF4_F4F6 } else { 0xFF15_1822 },
        );
        stroke_round_rect(
            g,
            box_x,
            box_y,
            16.0,
            16.0,
            4.5,
            if st.hover_chk { 0x66FF_FFFF } else { 0x2AFF_FFFF },
            1.0,
        );
        if checked {
            let mut chk_pen = null_mut();
            GdipCreatePen1(0xFF0A_0B0F, 2.0, 2, &mut chk_pen);
            GdipDrawLine(g, chk_pen, box_x + 3.6, box_y + 8.2, box_x + 6.6, box_y + 11.4);
            GdipDrawLine(g, chk_pen, box_x + 6.6, box_y + 11.4, box_x + 12.4, box_y + 4.8);
            GdipDeletePen(chk_pen);
        }
        draw_text(
            g,
            "Создать ярлык на рабочем столе",
            11.5,
            false,
            if st.hover_chk { 0xFFFF_FFFF } else { 0xFFC8_CDD8 },
            RectF { x: box_x + 24.0, y: ck.1 as f32, w: 230.0, h: 26.0 },
            0,
            1,
        );
    } else {
        let status_txt = st
            .status
            .lock()
            .map(|s| s.clone())
            .unwrap_or_default();
        let pct_int = (st.display_progress * 100.0).round().clamp(0.0, 100.0) as u32;
        draw_text(
            g,
            &status_txt,
            11.5,
            false,
            if st.phase == Phase::Error {
                0xFFFB_7185
            } else if st.phase == Phase::Done {
                0xFF6E_E7B7
            } else {
                0xFFD4_D8E2
            },
            RectF { x: 76.0, y: 232.0, w: (WIN_W - 210) as f32, h: 22.0 },
            0,
            1,
        );
        draw_text(
            g,
            &format!("{}%", pct_int),
            11.5,
            true,
            0xFFF4_F4F6,
            RectF { x: (WIN_W - 140) as f32, y: 232.0, w: 64.0, h: 22.0 },
            2,
            1,
        );

        let bar_x = 76.0;
        let bar_y = 260.0;
        let bar_w = (WIN_W - 152) as f32;
        let bar_h = 8.0;
        fill_round_rect(g, bar_x, bar_y, bar_w, bar_h, 4.0, 0xFF18_1B25);
        let fill_w = (bar_w * st.display_progress.clamp(0.03, 1.0)).max(8.0);
        let bar_col = if st.phase == Phase::Error {
            0xFFE1_1D48
        } else if st.phase == Phase::Done {
            0xFF34_D399
        } else {
            0xFFF4_F4F6
        };
        fill_round_rect(g, bar_x, bar_y, fill_w, bar_h, 4.0, bar_col);
    }

    // 6. Primary Action Button
    let br = btn_rect();
    let bw = (br.2 - br.0) as f32;
    let bh = (br.3 - br.1) as f32;
    let (btn_bg, btn_border, btn_fg, btn_label) = match st.phase {
        Phase::Ready => (
            if st.hover_btn { 0xFFFF_FFFF } else { 0xFFEA_ECF0 },
            0x44FF_FFFF,
            0xFF0A_0B0F,
            "Установить FameLauncher",
        ),
        Phase::Installing => (0xFF18_1B25, 0x20FF_FFFF, 0xFF8A_90A0, "Установка..."),
        Phase::Done => (
            if st.hover_btn { 0xFF34_D399 } else { 0xFF10_B981 },
            0x5534_D399,
            0xFF06_1812,
            "Запустить FameLauncher",
        ),
        Phase::Error => (
            if st.hover_btn { 0xFFFB_7185 } else { 0xFFE1_1D48 },
            0x44FF_FFFF,
            0xFFFF_FFFF,
            "Повторить установку",
        ),
    };
    fill_round_rect(g, br.0 as f32, br.1 as f32, bw, bh, 11.0, btn_bg);
    stroke_round_rect(g, br.0 as f32, br.1 as f32, bw, bh, 11.0, btn_border, 1.0);
    draw_text(
        g,
        btn_label,
        13.0,
        true,
        btn_fg,
        RectF { x: br.0 as f32, y: br.1 as f32, w: bw, h: bh },
        1,
        1,
    );

    GdipDeleteGraphics(g);

    BitBlt(hdc, 0, 0, WIN_W, WIN_H, mem_dc, 0, 0, SRCCOPY);
    SelectObject(mem_dc, old_bmp);
    DeleteObject(mem_bmp);
    DeleteDC(mem_dc);
}

unsafe extern "system" fn wnd_proc(hwnd: isize, msg: u32, wp: usize, lp: isize) -> isize {
    match msg {
        WM_ERASEBKGND => 1,
        WM_NCHITTEST => {
            let mut pt = [(lp & 0xFFFF) as i16 as i32, ((lp >> 16) & 0xFFFF) as i16 as i32];
            ScreenToClient(hwnd, &mut pt);
            if pt[1] <= 49 && !hit(close_rect(), pt[0], pt[1]) {
                return HTCAPTION;
            }
            HTCLIENT
        }
        WM_MOUSEMOVE => {
            let x = (lp & 0xFFFF) as i16 as i32;
            let y = ((lp >> 16) & 0xFFFF) as i16 as i32;
            let st = state_mut();
            let hb = hit(btn_rect(), x, y) && st.phase != Phase::Installing;
            let hc = hit(close_rect(), x, y);
            let hk = st.phase == Phase::Ready && hit(chk_rect(), x, y);
            if hb != st.hover_btn || hc != st.hover_close || hk != st.hover_chk {
                st.hover_btn = hb;
                st.hover_close = hc;
                st.hover_chk = hk;
                InvalidateRect(hwnd, null(), 0);
            }
            let cur = LoadCursorW(
                0,
                if hb || hc || hk {
                    IDC_HAND as *const u16
                } else {
                    IDC_ARROW as *const u16
                },
            );
            SetCursor(cur);
            0
        }
        WM_LBUTTONDOWN => {
            let x = (lp & 0xFFFF) as i16 as i32;
            let y = ((lp >> 16) & 0xFFFF) as i16 as i32;
            let st = state_mut();
            if hit(close_rect(), x, y) {
                DestroyWindow(hwnd);
                return 0;
            }
            if st.phase == Phase::Ready && hit(chk_rect(), x, y) {
                let prev = st.desktop_shortcut.load(Ordering::SeqCst);
                st.desktop_shortcut.store(!prev, Ordering::SeqCst);
                InvalidateRect(hwnd, null(), 0);
                return 0;
            }
            if hit(btn_rect(), x, y) {
                match st.phase {
                    Phase::Ready | Phase::Error => {
                        start_install(hwnd);
                        InvalidateRect(hwnd, null(), 0);
                    }
                    Phase::Done => {
                        let exe = st.installed_exe.clone();
                        let _ = Command::new(&exe)
                            .current_dir(exe.parent().unwrap_or(Path::new(".")))
                            .spawn();
                        DestroyWindow(hwnd);
                    }
                    Phase::Installing => {}
                }
            }
            0
        }
        WM_LBUTTONUP => 0,
        WM_TIMER => {
            let st = state_mut();
            if st.phase == Phase::Installing {
                let raw = st.progress.load(Ordering::SeqCst);
                if raw >= 1000 {
                    st.phase = Phase::Error;
                    st.display_progress = 1.0;
                    InvalidateRect(hwnd, null(), 0);
                } else {
                    let target = (raw as f32) / 100.0;
                    let diff = target - st.display_progress;
                    if diff.abs() > 0.002 {
                        st.display_progress += diff * 0.22;
                        InvalidateRect(hwnd, null(), 0);
                    }
                    if raw >= 100 && st.display_progress >= 0.992 {
                        st.display_progress = 1.0;
                        st.phase = Phase::Done;
                        InvalidateRect(hwnd, null(), 0);
                    }
                }
            }
            0
        }
        WM_PAINT => {
            let mut ps: PAINTSTRUCT = std::mem::zeroed();
            let hdc = BeginPaint(hwnd, &mut ps);
            paint_ui(hwnd, hdc);
            EndPaint(hwnd, &ps);
            0
        }
        WM_DESTROY => {
            KillTimer(hwnd, 1);
            PostQuitMessage(0);
            0
        }
        _ => DefWindowProcW(hwnd, msg, wp, lp),
    }
}

fn main() {
    unsafe {
        SetProcessDPIAware();
        let mut gdip_token: usize = 0;
        let input = GdiplusStartupInput {
            gdiplus_version: 1,
            debug_event_callback: 0,
            suppress_background_thread: 0,
            suppress_external_codecs: 0,
        };
        GdiplusStartup(&mut gdip_token, &input, null_mut());

        let dest = install_dir();
        let logo_bmp = load_logo_bitmap();

        STATE = Some(Box::new(AppState {
            phase: Phase::Ready,
            progress: Arc::new(AtomicU32::new(0)),
            status: Arc::new(Mutex::new("Готово к установке".to_string())),
            desktop_shortcut: Arc::new(AtomicBool::new(true)),
            hover_btn: false,
            hover_close: false,
            hover_chk: false,
            logo_bmp,
            install_path: dest.to_string_lossy().to_string(),
            installed_exe: dest.join("FameLauncher.exe"),
            display_progress: 0.0,
        }));

        let h_inst = GetModuleHandleW(null());
        let cls_name = wide("FameLauncherInstallerWnd");
        let title = wide("Установка FameLauncher");
        let wc = WNDCLASSEXW {
            cb_size: std::mem::size_of::<WNDCLASSEXW>() as u32,
            style: 0x0003,
            lpfn_wnd_proc: wnd_proc,
            cb_cls_extra: 0,
            cb_wnd_extra: 0,
            h_instance: h_inst,
            h_icon: LoadIconW(h_inst, 1 as *const u16),
            h_cursor: LoadCursorW(0, IDC_ARROW as *const u16),
            hbr_background: 0,
            lpsz_menu_name: null(),
            lpsz_class_name: cls_name.as_ptr(),
            h_icon_sm: LoadIconW(h_inst, 1 as *const u16),
        };
        RegisterClassExW(&wc);

        let sx = (GetSystemMetrics(SM_CXSCREEN) - WIN_W) / 2;
        let sy = (GetSystemMetrics(SM_CYSCREEN) - WIN_H) / 2;
        let hwnd = CreateWindowExW(
            WS_EX_APPWINDOW,
            cls_name.as_ptr(),
            title.as_ptr(),
            WS_POPUP | WS_VISIBLE,
            sx.max(0),
            sy.max(0),
            WIN_W,
            WIN_H,
            0,
            0,
            h_inst,
            null(),
        );

        let pref: u32 = DWMWCP_ROUND;
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE,
            (&pref as *const u32) as *const c_void,
            std::mem::size_of::<u32>() as u32,
        );

        SetTimer(hwnd, 1, 16, 0);
        ShowWindow(hwnd, 5);
        UpdateWindow(hwnd);

        let mut msg: MSG = std::mem::zeroed();
        while GetMessageW(&mut msg, 0, 0, 0) > 0 {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }

        if let Some(st) = (*std::ptr::addr_of_mut!(STATE)).take() {
            if !st.logo_bmp.is_null() {
                GdipDisposeImage(st.logo_bmp);
            }
        }
        GdiplusShutdown(gdip_token);
    }
}
