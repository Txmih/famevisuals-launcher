import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownToLine,
  Check,
  CheckCircle2,
  Cpu,
  Download,
  ExternalLink,
  FolderOpen,
  Gamepad2,
  HardDrive,
  Home,
  Image as ImageIcon,
  Languages,
  Loader2,
  MessageCircle,
  Minus,
  Package,
  Play,
  RefreshCw,
  ScrollText,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Wrench,
  X,
} from "lucide-react";
import { TRANSLATIONS } from "./i18n";
import type {
  ChangelogEntry,
  InstalledMod,
  Language,
  LauncherSettings,
  LaunchProgressPayload,
  ModrinthProject,
  SystemInfo,
  TabId,
} from "./types";

interface ChangelogResponse {
  entries: ChangelogEntry[];
  fromCache: boolean;
}

interface ModrinthSearchResult {
  hits: ModrinthProject[];
  total_hits: number;
}

interface ModrinthVersionFile {
  url: string;
  filename: string;
  primary: boolean;
  size: number;
}

interface ModrinthVersion {
  id: string;
  version_number: string;
  files: ModrinthVersionFile[];
}

const DEFAULT_SETTINGS: LauncherSettings = {
  nickname: "FamePlayer",
  ramMb: 4096,
  gameDir: "",
  language: "ru",
  customWallpaper: null,
};

const CATEGORY_STYLES: Record<
  "NEW" | "FIX" | "IMPROVED",
  { bg: string; text: string; border: string }
> = {
  NEW: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    border: "border-emerald-500/30",
  },
  FIX: {
    bg: "bg-amber-500/15",
    text: "text-amber-300",
    border: "border-amber-500/30",
  },
  IMPROVED: {
    bg: "bg-violet-500/15",
    text: "text-violet-300",
    border: "border-violet-500/30",
  },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function formatDownloads(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [modsSubTab, setModsSubTab] = useState<"installed" | "modrinth">("installed");

  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    totalRamMb: 16384,
    defaultGameDir: "",
    launcherVersion: "1.2.0",
  });
  const [settings, setSettings] = useState<LauncherSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [avatarError, setAvatarError] = useState(false);

  const [installedMods, setInstalledMods] = useState<InstalledMod[]>([]);
  const [modsLoading, setModsLoading] = useState(false);
  const [modToDelete, setModToDelete] = useState<InstalledMod | null>(null);

  const [modrinthQuery, setModrinthQuery] = useState("");
  const [modrinthMods, setModrinthMods] = useState<ModrinthProject[]>([]);
  const [modrinthLoading, setModrinthLoading] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [modrinthError, setModrinthError] = useState<string | null>(null);

  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [changelogFromCache, setChangelogFromCache] = useState(false);
  const [changelogLoading, setChangelogLoading] = useState(false);

  const [launching, setLaunching] = useState(false);
  const [launchProgress, setLaunchProgress] = useState<LaunchProgressPayload | null>(null);
  const [toast, setToast] = useState<{ text: string; type: "info" | "error" | "success" } | null>(
    null
  );

  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);
  const [updatingLauncher, setUpdatingLauncher] = useState(false);
  const [updatePercent, setUpdatePercent] = useState(0);
  const [checkingUpdater, setCheckingUpdater] = useState(false);

  const saveTimeoutRef = useRef<number | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  const t = TRANSLATIONS[settings.language];

  const showToast = useCallback(
    (text: string, type: "info" | "error" | "success" = "info") => {
      setToast({ text, type });
      window.setTimeout(() => {
        setToast((prev) => (prev?.text === text ? null : prev));
      }, 3600);
    },
    []
  );

  const persistSettings = useCallback(async (next: LauncherSettings) => {
    try {
      await invoke("save_settings", { settings: next });
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<LauncherSettings>, debounceMs = 0) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        if (saveTimeoutRef.current) {
          window.clearTimeout(saveTimeoutRef.current);
        }
        if (debounceMs > 0) {
          saveTimeoutRef.current = window.setTimeout(() => {
            void persistSettings(next);
          }, debounceMs);
        } else {
          void persistSettings(next);
        }
        return next;
      });
    },
    [persistSettings]
  );

  const refreshInstalledMods = useCallback(async (dir: string) => {
    if (!dir) return;
    setModsLoading(true);
    try {
      const list = await invoke<InstalledMod[]>("list_installed_mods", {
        gameDir: dir,
      });
      setInstalledMods(list);
    } catch (err) {
      console.error("list_installed_mods failed:", err);
    } finally {
      setModsLoading(false);
    }
  }, []);

  const refreshChangelog = useCallback(async (dir: string) => {
    setChangelogLoading(true);
    try {
      const resp = await invoke<ChangelogResponse>("fetch_changelog", {
        gameDir: dir,
      });
      setChangelog(resp.entries);
      setChangelogFromCache(resp.fromCache);
    } catch (err) {
      console.error("fetch_changelog failed:", err);
    } finally {
      setChangelogLoading(false);
    }
  }, []);

  const runUpdaterCheck = useCallback(
    async (manual = false) => {
      setCheckingUpdater(true);
      try {
        const update = await check();
        if (update) {
          setPendingUpdate(update);
        } else if (manual) {
          showToast(TRANSLATIONS[settings.language].upToDateToast, "success");
        }
      } catch (err) {
        if (manual) {
          showToast(TRANSLATIONS[settings.language].upToDateToast, "info");
        }
        console.debug("Updater check skipped or unavailable:", err);
      } finally {
        setCheckingUpdater(false);
      }
    },
    [settings.language, showToast]
  );

  // Initial boot: load system info, settings, installed mods, changelog & updater check
  useEffect(() => {
    let unlistenProgress: (() => void) | null = null;

    const init = async () => {
      try {
        const [sys, loaded] = await Promise.all([
          invoke<SystemInfo>("get_system_info"),
          invoke<LauncherSettings>("load_settings"),
        ]);
        setSystemInfo(sys);
        const merged: LauncherSettings = {
          ...DEFAULT_SETTINGS,
          ...loaded,
          gameDir: loaded.gameDir || sys.defaultGameDir,
          ramMb: Math.min(Math.max(loaded.ramMb || 4096, 1024), sys.totalRamMb),
        };
        setSettings(merged);
        setSettingsLoaded(true);

        void refreshInstalledMods(merged.gameDir);
        void refreshChangelog(merged.gameDir);
        void runUpdaterCheck(false);
      } catch (err) {
        console.error("Initialization error:", err);
        setSettingsLoaded(true);
      }
    };

    void init();

    void listen<LaunchProgressPayload>("launch-progress", (event) => {
      setLaunchProgress(event.payload);
      if (event.payload.stage === "ready") {
        setLaunching(false);
      } else if (event.payload.stage === "error") {
        setLaunching(false);
      }
    }).then((unlisten) => {
      unlistenProgress = unlisten;
    });

    return () => {
      if (unlistenProgress) unlistenProgress();
    };
  }, [refreshChangelog, refreshInstalledMods, runUpdaterCheck]);

  // Modrinth search (initial load & debounced typing)
  const fetchModrinth = useCallback(async (query: string) => {
    setModrinthLoading(true);
    setModrinthError(null);
    try {
      const facets = encodeURIComponent(
        JSON.stringify([["versions:1.21.11"], ["loaders:fabric"], ["project_type:mod"]])
      );
      const qParam = query.trim()
        ? `&query=${encodeURIComponent(query.trim())}`
        : "";
      const url = `https://api.modrinth.com/v2/search?facets=${facets}&index=downloads&limit=24${qParam}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "FameVisuals-Launcher/1.2.0 (github.com/Txmih/famevisuals-launcher)",
        },
      });
      if (!res.ok) throw new Error(`Modrinth HTTP ${res.status}`);
      const data = (await res.json()) as ModrinthSearchResult;
      setModrinthMods(data.hits || []);
    } catch (err) {
      setModrinthError(String(err));
    } finally {
      setModrinthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "mods" || modsSubTab !== "modrinth") return;
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = window.setTimeout(() => {
      void fetchModrinth(modrinthQuery);
    }, modrinthQuery ? 320 : 0);

    return () => {
      if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current);
    };
  }, [activeTab, modsSubTab, modrinthQuery, fetchModrinth]);

  const handleInstallModrinth = async (project: ModrinthProject) => {
    if (!settings.gameDir || installingId) return;
    setInstallingId(project.project_id);
    try {
      const loaders = encodeURIComponent(JSON.stringify(["fabric"]));
      const versions = encodeURIComponent(JSON.stringify(["1.21.11"]));
      const url = `https://api.modrinth.com/v2/project/${project.project_id}/version?loaders=${loaders}&game_versions=${versions}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "FameVisuals-Launcher/1.2.0 (github.com/Txmih/famevisuals-launcher)",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const vers = (await res.json()) as ModrinthVersion[];
      const targetVersion = vers[0];
      const file =
        targetVersion?.files.find((f) => f.primary && f.filename.endsWith(".jar")) ||
        targetVersion?.files.find((f) => f.filename.endsWith(".jar"));

      if (!file) {
        showToast(t.modrinthNoCompatible, "error");
        return;
      }

      await invoke("install_modrinth_mod", {
        gameDir: settings.gameDir,
        downloadUrl: file.url,
        fileName: file.filename,
      });

      await refreshInstalledMods(settings.gameDir);
      showToast(`${project.title} (${file.filename})`, "success");
    } catch (err) {
      showToast(String(err), "error");
    } finally {
      setInstallingId(null);
    }
  };

  const handleToggleMod = async (mod: InstalledMod) => {
    try {
      await invoke("toggle_mod", {
        gameDir: settings.gameDir,
        fileName: mod.fileName,
      });
      await refreshInstalledMods(settings.gameDir);
    } catch (err) {
      showToast(String(err), "error");
    }
  };

  const handleConfirmDeleteMod = async () => {
    if (!modToDelete) return;
    try {
      await invoke("delete_mod", {
        gameDir: settings.gameDir,
        fileName: modToDelete.fileName,
      });
      setModToDelete(null);
      await refreshInstalledMods(settings.gameDir);
    } catch (err) {
      showToast(String(err), "error");
    }
  };

  const handlePickGameDir = async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        defaultPath: settings.gameDir || systemInfo.defaultGameDir,
      });
      if (typeof selected === "string" && selected.length > 0) {
        updateSettings({ gameDir: selected });
        void refreshInstalledMods(selected);
      }
    } catch (err) {
      showToast(String(err), "error");
    }
  };

  const handlePickWallpaper = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [
          {
            name: "Images",
            extensions: ["jpg", "jpeg", "png", "webp"],
          },
        ],
      });
      if (typeof selected === "string" && selected.length > 0) {
        updateSettings({ customWallpaper: selected });
      }
    } catch (err) {
      showToast(String(err), "error");
    }
  };

  const handleLaunchGame = async () => {
    if (launching || !settingsLoaded) return;
    const cleanNick = settings.nickname.trim() || "FamePlayer";
    if (cleanNick !== settings.nickname) {
      updateSettings({ nickname: cleanNick });
    }

    setLaunching(true);
    setLaunchProgress({
      stage: "checking_updates",
      message: t.stageCheckingUpdates,
      percent: 4,
      downloadedMb: 0,
      totalMb: 0,
    });

    try {
      await invoke("launch_game", {
        settings: { ...settings, nickname: cleanNick },
      });
      await refreshInstalledMods(settings.gameDir);
      showToast(t.gameRunningStatus, "success");
    } catch (err) {
      const msg = String(err);
      setLaunchProgress({
        stage: "error",
        message: `${t.stageError}: ${msg}`,
        percent: 0,
        downloadedMb: 0,
        totalMb: 0,
      });
      setLaunching(false);
      showToast(msg, "error");
    }
  };

  const handleInstallUpdater = async () => {
    if (!pendingUpdate || updatingLauncher) return;
    setUpdatingLauncher(true);
    setUpdatePercent(0);
    let downloaded = 0;
    let contentLen = 0;
    try {
      await pendingUpdate.downloadAndInstall((event) => {
        if (event.event === "Started") {
          contentLen = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (contentLen > 0) {
            setUpdatePercent(Math.min(100, Math.round((downloaded / contentLen) * 100)));
          }
        } else if (event.event === "Finished") {
          setUpdatePercent(100);
        }
      });
      await relaunch();
    } catch (err) {
      showToast(String(err), "error");
      setUpdatingLauncher(false);
    }
  };

  const localizedStageText = useMemo(() => {
    if (!launchProgress) return "";
    switch (launchProgress.stage) {
      case "checking_updates":
        return t.stageCheckingUpdates;
      case "syncing_mods":
        return t.stageSyncingMods;
      case "verifying_java":
        return t.stageVerifyingJava;
      case "downloading_minecraft":
        return t.stageDownloadingMinecraft;
      case "launching":
        return t.stageLaunching;
      case "ready":
        return t.stageReady;
      default:
        return launchProgress.message;
    }
  }, [launchProgress, t]);

  const installedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const m of installedMods) {
      keys.add(m.modId.toLowerCase());
      keys.add(m.cleanName.toLowerCase());
      keys.add(m.fileName.toLowerCase().replace(/\.disabled$/, ""));
    }
    return keys;
  }, [installedMods]);

  const isModrinthInstalled = (project: ModrinthProject) => {
    const slug = project.slug.toLowerCase();
    const title = project.title.toLowerCase();
    for (const k of installedKeys) {
      if (k === slug || k.includes(slug) || k === title) return true;
    }
    return false;
  };

  const wallpaperUrl = useMemo(() => {
    if (!settings.customWallpaper) return null;
    try {
      return convertFileSrc(settings.customWallpaper);
    } catch {
      return null;
    }
  }, [settings.customWallpaper]);

  const navItems: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] =
    [
      { id: "home", label: t.navHome, icon: Home },
      { id: "mods", label: t.navMods, icon: Package },
      { id: "changelog", label: t.navChangelog, icon: ScrollText },
      { id: "settings", label: t.navSettings, icon: Settings },
    ];

  const cleanNick = settings.nickname.trim() || "Steve";
  const avatarSrc = `https://mc-heads.net/avatar/${encodeURIComponent(cleanNick)}/64`;

  return (
    <div className="relative h-screen w-screen overflow-hidden rounded-2xl border border-white/10 bg-[#09090f] text-white shadow-2xl">
      {/* Background Layer: Custom Wallpaper OR Deep Obsidian Animated Cyber Gradient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {wallpaperUrl ? (
          <>
            <img
              src={wallpaperUrl}
              alt=""
              className="h-full w-full object-cover opacity-45 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#09090f]/85 via-[#09090f]/65 to-[#09090f]/95" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[#09090f]" />
            <div className="cyber-grid absolute inset-0 opacity-70" />
            <motion.div
              animate={{
                scale: [1, 1.12, 1],
                opacity: [0.32, 0.48, 0.32],
              }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-24 -top-24 h-[460px] w-[460px] rounded-full bg-violet-600/30 blur-[120px]"
            />
            <motion.div
              animate={{
                scale: [1.1, 0.96, 1.1],
                opacity: [0.24, 0.4, 0.24],
              }}
              transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-32 right-0 h-[500px] w-[500px] rounded-full bg-indigo-600/25 blur-[130px]"
            />
          </>
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, transparent 25%, rgba(9, 9, 15, 0.72) 100%)",
          }}
        />
      </div>

      {/* Main Window Shell */}
      <div className="relative z-10 flex h-full flex-col">
        {/* Custom Frameless Titlebar */}
        <header
          data-tauri-drag-region
          className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] bg-black/25 px-4 backdrop-blur-md"
        >
          <div data-tauri-drag-region className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-600/30">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span
              data-tauri-drag-region
              className="text-xs font-bold tracking-[0.18em] text-white/90"
            >
              FAMEVISUALS LAUNCHER
            </span>
            <span className="rounded-full border border-violet-500/30 bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
              v{systemInfo.launcherVersion}
            </span>
          </div>

          <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => void runUpdaterCheck(true)}
              disabled={checkingUpdater}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/75 transition hover:border-violet-400/40 hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${checkingUpdater ? "animate-spin" : ""}`} />
              <span>{checkingUpdater ? t.checkingUpdates : t.checkUpdatesBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => void handlePickWallpaper()}
              title={t.settingsWallpaperTitle}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </button>

            <div className="mx-1 h-4 w-px bg-white/10" />

            <button
              type="button"
              onClick={() => void getCurrentWindow().minimize()}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/65 transition hover:bg-white/10 hover:text-white"
              aria-label="Minimize"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void getCurrentWindow().close()}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/65 transition hover:bg-rose-500/80 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Body Layout: Sidebar + Tab Content */}
        <div className="flex min-h-0 flex-1">
          {/* Left Glass Sidebar */}
          <aside className="flex w-52 shrink-0 flex-col justify-between border-r border-white/[0.06] bg-black/25 p-3 backdrop-blur-xl">
            <nav className="flex flex-col gap-1.5 pt-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                      active
                        ? "text-white"
                        : "text-white/55 hover:bg-white/[0.04] hover:text-white/85"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active-pill"
                        transition={{ type: "spring", stiffness: 360, damping: 28 }}
                        className="absolute inset-0 rounded-xl border border-violet-400/35 bg-gradient-to-r from-violet-600/25 to-indigo-600/15 shadow-inner"
                      />
                    )}
                    <Icon
                      className={`relative z-10 h-4 w-4 ${
                        active ? "text-violet-300" : "text-white/50"
                      }`}
                    />
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span>{t.statusOnline}</span>
              </div>
              <p className="mt-1.5 truncate text-[11px] text-white/45" title={settings.gameDir}>
                {settings.gameDir || "..."}
              </p>
            </div>
          </aside>

          {/* Main Tab Area */}
          <main className="relative flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {activeTab === "home" && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex h-full flex-col justify-between gap-6"
                >
                  {/* Top & Center Split: Hero + Profile Card */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center pt-2">
                    {/* Hero Composition */}
                    <div className="lg:col-span-7 space-y-5">
                      <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3.5 py-1 text-xs font-semibold text-violet-200">
                        <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
                        <span>{t.heroSubtitle}</span>
                      </div>

                      <h1 className="bg-gradient-to-r from-white via-violet-200 to-indigo-300 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl leading-[1.12]">
                        {t.heroTitle}
                      </h1>

                      {/* Quick Stats Cards */}
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        <div className="glass-card rounded-xl p-3.5">
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/50">
                            <Package className="h-3.5 w-3.5 text-violet-400" />
                            <span>{t.statMods}</span>
                          </div>
                          <div className="mt-1.5 text-lg font-bold text-white">
                            {installedMods.filter((m) => m.enabled).length}
                          </div>
                        </div>

                        <div className="glass-card rounded-xl p-3.5">
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/50">
                            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                            <span>{t.statRam}</span>
                          </div>
                          <div className="mt-1.5 text-lg font-bold text-white">
                            {(settings.ramMb / 1024).toFixed(1)} GB
                          </div>
                        </div>

                        <div className="glass-card rounded-xl p-3.5">
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/50">
                            <Gamepad2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span>{t.statLoader}</span>
                          </div>
                          <div className="mt-1.5 text-lg font-bold text-white">Fabric 1.21.11</div>
                        </div>
                      </div>
                    </div>

                    {/* Right Player Profile Glass Card */}
                    <div className="lg:col-span-5">
                      <div className="glass-card rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                            {t.profileTitle}
                          </span>
                          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                            {t.profileOfflineBadge}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black/40 shadow-lg">
                            {!avatarError ? (
                              <img
                                src={avatarSrc}
                                alt={cleanNick}
                                onError={() => setAvatarError(true)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-violet-500/15 text-violet-300">
                                <User className="h-8 w-8" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <label className="block text-[11px] font-medium text-white/55">
                              {t.nicknameLabel}
                            </label>
                            <input
                              type="text"
                              maxLength={16}
                              value={settings.nickname}
                              placeholder={t.nicknamePlaceholder}
                              onChange={(e) => {
                                setAvatarError(false);
                                const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
                                updateSettings({ nickname: val }, 350);
                              }}
                              className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/25"
                            />
                          </div>
                        </div>

                        <div className="border-t border-white/[0.07] pt-3">
                          <div className="mb-2 text-[11px] font-medium text-white/50">
                            {t.socialLinksLabel}
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => void openUrl("https://discord.gg/fSCMzjPMRR")}
                              className="flex items-center justify-center gap-2 rounded-xl border border-indigo-400/25 bg-indigo-500/15 px-3 py-2 text-xs font-semibold text-indigo-200 transition hover:border-indigo-400/50 hover:bg-indigo-500/25"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span>Discord</span>
                              <ExternalLink className="h-3 w-3 opacity-60" />
                            </button>

                            <button
                              type="button"
                              onClick={() => void openUrl("https://t.me/famevisuals")}
                              className="flex items-center justify-center gap-2 rounded-xl border border-sky-400/25 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-200 transition hover:border-sky-400/50 hover:bg-sky-500/25"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>Telegram</span>
                              <ExternalLink className="h-3 w-3 opacity-60" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Launch Dock */}
                  <div className="glass-card rounded-2xl p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div className="text-[11px] uppercase tracking-wider text-white/50">
                          {t.versionProfileLabel}
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-violet-400 shadow-[0_0_10px_#a78bfa]" />
                          <span className="text-sm font-semibold text-white">
                            {t.versionProfileValue}
                          </span>
                        </div>
                      </div>

                      <motion.button
                        type="button"
                        whileHover={{ scale: launching ? 1 : 1.02 }}
                        whileTap={{ scale: launching ? 1 : 0.98 }}
                        onClick={() => void handleLaunchGame()}
                        disabled={launching}
                        className="neon-play-btn flex h-13 min-w-[230px] items-center justify-center gap-3 rounded-xl px-8 py-3.5 text-base font-extrabold tracking-wider text-white transition disabled:cursor-not-allowed disabled:opacity-75"
                      >
                        {launching ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Play className="h-5 w-5 fill-current" />
                        )}
                        <span>{launching ? t.launchingButton : t.playButton}</span>
                      </motion.button>
                    </div>

                    {/* Built-in Launch Progress Bar */}
                    <AnimatePresence>
                      {launchProgress && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 overflow-hidden border-t border-white/[0.07] pt-3.5"
                        >
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span
                              className={`font-medium ${
                                launchProgress.stage === "error"
                                  ? "text-rose-300"
                                  : launchProgress.stage === "ready"
                                    ? "text-emerald-300"
                                    : "text-violet-200"
                              }`}
                            >
                              {localizedStageText}
                            </span>
                            <span className="font-mono text-white/70">
                              {launchProgress.totalMb > 0
                                ? `${launchProgress.downloadedMb.toFixed(1)} / ${launchProgress.totalMb.toFixed(1)} MB (${Math.round(launchProgress.percent)}%)`
                                : `${Math.round(launchProgress.percent)}%`}
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                            <motion.div
                              className={`h-full rounded-full ${
                                launchProgress.stage === "error"
                                  ? "bg-rose-500"
                                  : launchProgress.stage === "ready"
                                    ? "bg-emerald-400"
                                    : "bg-gradient-to-r from-violet-500 via-indigo-400 to-fuchsia-400"
                              }`}
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.max(2, Math.min(100, launchProgress.percent))}%`,
                              }}
                              transition={{ duration: 0.25 }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {activeTab === "mods" && (
                <motion.div
                  key="mods"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{t.modsTitle}</h2>
                      <p className="text-xs text-white/55">{t.modsSubtitle}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void refreshInstalledMods(settings.gameDir)}
                        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${modsLoading ? "animate-spin" : ""}`} />
                        <span>{t.modsRefresh}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void invoke("open_game_dir", {
                            path: `${settings.gameDir}\\mods`,
                          })
                        }
                        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span>{t.modsOpenFolder}</span>
                      </button>
                    </div>
                  </div>

                  {/* Sub-Tab Switcher */}
                  <div className="inline-flex rounded-xl border border-white/10 bg-black/35 p-1">
                    <button
                      type="button"
                      onClick={() => setModsSubTab("installed")}
                      className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                        modsSubTab === "installed"
                          ? "bg-violet-600 text-white shadow"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      {t.modsTabInstalled} ({installedMods.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setModsSubTab("modrinth")}
                      className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                        modsSubTab === "modrinth"
                          ? "bg-violet-600 text-white shadow"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      {t.modsTabModrinth}
                    </button>
                  </div>

                  {modsSubTab === "installed" ? (
                    installedMods.length === 0 ? (
                      <div className="glass-card flex flex-col items-center justify-center rounded-2xl p-10 text-center">
                        <Package className="h-10 w-10 text-violet-400/60" />
                        <h3 className="mt-3 text-base font-semibold text-white">
                          {t.modsEmptyInstalled}
                        </h3>
                        <p className="mt-1 max-w-md text-xs text-white/50">
                          {t.modsEmptyInstalledHint}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {installedMods.map((mod) => (
                          <div
                            key={mod.fileName}
                            className={`glass-card flex items-center justify-between gap-4 rounded-xl p-4 transition ${
                              mod.enabled ? "opacity-100" : "opacity-60"
                            }`}
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-sm font-bold text-white">
                                  {mod.cleanName}
                                </span>
                                <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/75">
                                  {mod.version}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    mod.isOfficial
                                      ? "border border-violet-400/40 bg-violet-500/20 text-violet-200"
                                      : "border border-cyan-400/30 bg-cyan-500/15 text-cyan-200"
                                  }`}
                                >
                                  {mod.isOfficial ? t.modsOfficialBadge : t.modsCustomBadge}
                                </span>
                                {!mod.enabled && (
                                  <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                                    {t.modsDisabledBadge}
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-xs text-white/55">
                                {mod.description || mod.fileName}
                              </p>
                              <div className="text-[11px] font-mono text-white/35">
                                {mod.fileName} • {formatBytes(mod.sizeBytes)}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Enable/Disable Switch */}
                              <button
                                type="button"
                                onClick={() => void handleToggleMod(mod)}
                                aria-label="Toggle Mod"
                                className={`relative h-6 w-11 rounded-full transition ${
                                  mod.enabled ? "bg-violet-600" : "bg-white/15"
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                                    mod.enabled ? "left-[22px]" : "left-0.5"
                                  }`}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() => setModToDelete(mod)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-rose-500/40 hover:bg-rose-500/20 hover:text-rose-300"
                                aria-label="Delete Mod"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="space-y-4">
                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                        <input
                          type="text"
                          value={modrinthQuery}
                          onChange={(e) => setModrinthQuery(e.target.value)}
                          placeholder={t.modrinthSearchPlaceholder}
                          className="w-full rounded-xl border border-white/10 bg-black/35 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/25"
                        />
                      </div>

                      {!modrinthQuery && (
                        <div className="text-xs font-semibold uppercase tracking-wider text-violet-300">
                          {t.modrinthPopularHeading}
                        </div>
                      )}

                      {modrinthError && (
                        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                          {modrinthError}
                        </div>
                      )}

                      {modrinthLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
                        </div>
                      ) : modrinthMods.length === 0 ? (
                        <div className="glass-card rounded-2xl p-8 text-center text-sm text-white/55">
                          {t.modrinthNoResults}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {modrinthMods.map((project) => {
                            const installed = isModrinthInstalled(project);
                            const busy = installingId === project.project_id;
                            return (
                              <div
                                key={project.project_id}
                                className="glass-card flex items-start justify-between gap-3 rounded-xl p-4"
                              >
                                <div className="flex min-w-0 flex-1 gap-3">
                                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                                    {project.icon_url ? (
                                      <img
                                        src={project.icon_url}
                                        alt={project.title}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-violet-300">
                                        <Package className="h-5 w-5" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <h3 className="truncate text-sm font-bold text-white">
                                      {project.title}
                                    </h3>
                                    <p className="mt-0.5 line-clamp-2 text-xs text-white/55">
                                      {project.description}
                                    </p>
                                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/40">
                                      <span>by {project.author}</span>
                                      <span>•</span>
                                      <span>
                                        {formatDownloads(project.downloads)} {t.modrinthDownloads}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={installed || busy}
                                  onClick={() => void handleInstallModrinth(project)}
                                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                    installed
                                      ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                                      : "bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-60"
                                  }`}
                                >
                                  {busy ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : installed ? (
                                    <Check className="h-3.5 w-3.5" />
                                  ) : (
                                    <Download className="h-3.5 w-3.5" />
                                  )}
                                  <span>
                                    {busy
                                      ? t.modrinthInstalling
                                      : installed
                                        ? t.modrinthInstalled
                                        : t.modrinthInstall}
                                  </span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "changelog" && (
                <motion.div
                  key="changelog"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{t.changelogTitle}</h2>
                      <p className="text-xs text-white/55">{t.changelogSubtitle}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {changelogFromCache && (
                        <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-1 text-[11px] text-amber-200">
                          {t.changelogOfflineNote}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => void refreshChangelog(settings.gameDir)}
                        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${changelogLoading ? "animate-spin" : ""}`}
                        />
                        <span>{t.changelogRefresh}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {changelog.map((entry) => (
                      <div key={entry.version} className="glass-card rounded-2xl p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] pb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-extrabold text-white">
                              {entry.version}
                            </span>
                            {entry.isLatest && (
                              <span className="rounded-full border border-violet-400/40 bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-violet-200">
                                {t.changelogLatestBadge}
                              </span>
                            )}
                            {entry.title && (
                              <span className="text-sm font-medium text-white/75">
                                — {entry.title[settings.language] || entry.title.en}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono text-white/45">{entry.date}</span>
                        </div>

                        <ul className="space-y-2.5">
                          {entry.changes.map((ch, idx) => {
                            const style = CATEGORY_STYLES[ch.category] || CATEGORY_STYLES.IMPROVED;
                            return (
                              <li key={idx} className="flex items-start gap-3 text-sm">
                                <span
                                  className={`mt-0.5 shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider ${style.bg} ${style.text} ${style.border}`}
                                >
                                  {ch.category}
                                </span>
                                <span className="text-white/85 leading-relaxed">
                                  {ch.text[settings.language] || ch.text.en}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "settings" && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-white">{t.settingsTitle}</h2>
                    <p className="text-xs text-white/55">{t.settingsSubtitle}</p>
                  </div>

                  {/* Game Directory Card */}
                  <div className="glass-card rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <HardDrive className="h-4 w-4 text-violet-400" />
                      <h3 className="text-sm font-bold text-white">{t.settingsGameDirTitle}</h3>
                    </div>
                    <p className="text-xs text-white/55">{t.settingsGameDirDesc}</p>

                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                      <div className="flex-1 truncate rounded-xl border border-white/10 bg-black/35 px-3.5 py-2.5 font-mono text-xs text-white/85">
                        {settings.gameDir}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handlePickGameDir()}
                          className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-500"
                        >
                          {t.settingsChangeDir}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void invoke("open_game_dir", { path: settings.gameDir })
                          }
                          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-xs font-semibold text-white/85 transition hover:bg-white/10"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          <span>{t.settingsOpenDir}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* RAM Allocation Slider */}
                  <div className="glass-card rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Cpu className="h-4 w-4 text-indigo-400" />
                        <h3 className="text-sm font-bold text-white">{t.settingsRamTitle}</h3>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-extrabold text-violet-300">
                          {(settings.ramMb / 1024).toFixed(1)} GB
                        </span>
                        <span className="font-mono text-xs text-white/45">
                          ({settings.ramMb} MB)
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-white/55">{t.settingsRamDesc}</p>

                    <div className="space-y-2">
                      <input
                        type="range"
                        min={1024}
                        max={systemInfo.totalRamMb}
                        step={512}
                        value={settings.ramMb}
                        onChange={(e) =>
                          updateSettings({ ramMb: Number(e.target.value) }, 120)
                        }
                        style={{
                          background: `linear-gradient(to right, #8b5cf6 0%, #6366f1 ${
                            ((settings.ramMb - 1024) /
                              Math.max(512, systemInfo.totalRamMb - 1024)) *
                            100
                          }%, rgba(255,255,255,0.12) ${
                            ((settings.ramMb - 1024) /
                              Math.max(512, systemInfo.totalRamMb - 1024)) *
                            100
                          }%, rgba(255,255,255,0.12) 100%)`,
                        }}
                        className="ram-slider w-full cursor-pointer"
                      />
                      <div className="flex justify-between text-[11px] text-white/45">
                        <span>1.0 GB</span>
                        <span className="text-violet-300/80">{t.settingsRamRecommended}</span>
                        <span>
                          {t.settingsRamMaxPc} {(systemInfo.totalRamMb / 1024).toFixed(1)} GB
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Language Switcher (EN / RU / PL ONLY) */}
                  <div className="glass-card rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <Languages className="h-4 w-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">{t.settingsLanguageTitle}</h3>
                    </div>
                    <p className="text-xs text-white/55">{t.settingsLanguageDesc}</p>

                    <div className="grid grid-cols-3 gap-3 pt-1">
                      {(
                        [
                          { code: "ru", label: "Русский", sub: "RU" },
                          { code: "en", label: "English", sub: "EN" },
                          { code: "pl", label: "Polski", sub: "PL" },
                        ] as { code: Language; label: string; sub: string }[]
                      ).map((lang) => {
                        const active = settings.language === lang.code;
                        return (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => updateSettings({ language: lang.code })}
                            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                              active
                                ? "border-violet-400/60 bg-violet-500/20 text-white shadow-lg shadow-violet-500/10"
                                : "border-white/10 bg-black/30 text-white/65 hover:border-white/20 hover:text-white"
                            }`}
                          >
                            <div>
                              <div className="text-sm font-bold">{lang.label}</div>
                              <div className="text-[11px] text-white/45">{lang.sub}</div>
                            </div>
                            {active && <CheckCircle2 className="h-4 w-4 text-violet-300" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Background Wallpaper */}
                  <div className="glass-card rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <ImageIcon className="h-4 w-4 text-fuchsia-400" />
                          <h3 className="text-sm font-bold text-white">
                            {t.settingsWallpaperTitle}
                          </h3>
                        </div>
                        <p className="mt-1 text-xs text-white/55">{t.settingsWallpaperDesc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handlePickWallpaper()}
                          className="rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
                        >
                          {t.settingsWallpaperPick}
                        </button>
                        {settings.customWallpaper && (
                          <button
                            type="button"
                            onClick={() => updateSettings({ customWallpaper: null })}
                            className="rounded-xl border border-white/10 px-3.5 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10"
                          >
                            {t.settingsWallpaperReset}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Delete Mod Confirmation Modal */}
      <AnimatePresence>
        {modToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="glass-card w-full max-w-md rounded-2xl border border-white/15 p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-300">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <h3 className="text-base font-bold text-white">{t.modsDeleteTitle}</h3>
              </div>
              <p className="text-sm text-white/75">
                {t.modsDeleteConfirm}{" "}
                <span className="font-mono font-semibold text-white">
                  {modToDelete.fileName}
                </span>
                ?
              </p>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModToDelete(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                >
                  {t.modsCancel}
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmDeleteMod()}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  {t.modsDelete}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Self-Updater Modal */}
      <AnimatePresence>
        {pendingUpdate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="glass-card w-full max-w-md rounded-2xl border border-violet-400/30 p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
                  <ArrowDownToLine className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{t.updaterModalTitle}</h3>
                  <p className="text-xs text-white/60">
                    {t.updaterNewVersion}{" "}
                    <span className="font-semibold text-violet-300">v{pendingUpdate.version}</span>
                  </p>
                </div>
              </div>

              {pendingUpdate.body && (
                <div className="max-h-32 overflow-y-auto rounded-xl border border-white/10 bg-black/35 p-3 text-xs text-white/75 whitespace-pre-wrap">
                  {pendingUpdate.body}
                </div>
              )}

              {updatingLauncher && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-violet-200">
                    <span>
                      {updatePercent >= 100 ? t.updaterRestarting : t.updaterDownloading}
                    </span>
                    <span>{updatePercent}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all"
                      style={{ width: `${updatePercent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-1">
                {!updatingLauncher && (
                  <button
                    type="button"
                    onClick={() => setPendingUpdate(null)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                  >
                    {t.updaterLater}
                  </button>
                )}
                <button
                  type="button"
                  disabled={updatingLauncher}
                  onClick={() => void handleInstallUpdater()}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
                >
                  {updatingLauncher ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wrench className="h-3.5 w-3.5" />
                  )}
                  <span>{t.updaterInstallNow}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Floating Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-2xl backdrop-blur-xl ${
              toast.type === "error"
                ? "border-rose-500/40 bg-rose-950/85 text-rose-100"
                : toast.type === "success"
                  ? "border-emerald-500/40 bg-emerald-950/85 text-emerald-100"
                  : "border-violet-500/40 bg-[#141428]/90 text-white"
            }`}
          >
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
