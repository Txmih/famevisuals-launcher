import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import {
  AlertTriangle,
  ArrowDownToLine,
  Check,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Download,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  Languages,
  Loader2,
  LogOut,
  Minus,
  Package,
  Play,
  RefreshCw,
  Search,
  Trash2,
  User,
  Wrench,
  X,
} from "lucide-react";
import logoImg from "./assets/logo.png";
import { TRANSLATIONS } from "./i18n";
import type {
  AccountType,
  ChangelogEntry,
  InstalledMod,
  Language,
  LauncherSettings,
  LaunchProgressPayload,
  MicrosoftAccountProfile,
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
  accountType: "offline",
  msUsername: null,
  msUuid: null,
  msAccessToken: null,
  msRefreshToken: null,
};

const CATEGORY_STYLES: Record<
  "NEW" | "FIX" | "IMPROVED",
  { bg: string; text: string; border: string }
> = {
  NEW: {
    bg: "bg-emerald-500/12",
    text: "text-emerald-300",
    border: "border-emerald-500/25",
  },
  FIX: {
    bg: "bg-amber-500/12",
    text: "text-amber-300",
    border: "border-amber-500/25",
  },
  IMPROVED: {
    bg: "bg-white/[0.06]",
    text: "text-zinc-200",
    border: "border-white/15",
  },
};

/* Crisp High-Quality Custom Vector Icons */
function IconHome({ className = "h-[19px] w-[19px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4.5v-5.5a1.5 1.5 0 0 1 3 0V21H18a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

function IconMods({ className = "h-[19px] w-[19px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2.75l8 4.6v9.3l-8 4.6-8-4.6v-9.3l8-4.6z" />
      <path d="M12 12l8-4.65M12 12v9.25M12 12L4 7.35" />
    </svg>
  );
}

function IconChangelog({ className = "h-[19px] w-[19px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" />
    </svg>
  );
}

function IconSettings({ className = "h-[19px] w-[19px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
      <circle cx="9" cy="7" r="2.2" fill="#0a0b0e" />
      <circle cx="15" cy="12" r="2.2" fill="#0a0b0e" />
      <circle cx="10.5" cy="17" r="2.2" fill="#0a0b0e" />
    </svg>
  );
}

function DiscordBrandIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function TelegramBrandIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function MicrosoftLogoIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 21 21" fill="none" className={className} aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

const LANGUAGE_OPTIONS: { code: Language; label: string }[] = [
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
  { code: "pl", label: "Polski" },
];

function LanguageFlag({
  code,
  className = "h-3.5 w-5 shrink-0 rounded-[3px] ring-1 ring-white/15",
}: {
  code: Language;
  className?: string;
}) {
  if (code === "ru") {
    return (
      <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
        <rect width="24" height="5.34" y="0" fill="#FFFFFF" />
        <rect width="24" height="5.34" y="5.33" fill="#0039A6" />
        <rect width="24" height="5.34" y="10.67" fill="#D52B1E" />
      </svg>
    );
  }
  if (code === "pl") {
    return (
      <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
        <rect width="24" height="8" y="0" fill="#FFFFFF" />
        <rect width="24" height="8" y="8" fill="#DC143C" />
      </svg>
    );
  }
  // English — crisp US flag SVG
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
      <rect width="24" height="16" fill="#FFFFFF" />
      <rect width="24" height="1.23" y="0" fill="#B22234" />
      <rect width="24" height="1.23" y="2.46" fill="#B22234" />
      <rect width="24" height="1.23" y="4.92" fill="#B22234" />
      <rect width="24" height="1.23" y="7.38" fill="#B22234" />
      <rect width="24" height="1.23" y="9.84" fill="#B22234" />
      <rect width="24" height="1.23" y="12.30" fill="#B22234" />
      <rect width="24" height="1.24" y="14.76" fill="#B22234" />
      <rect width="10.5" height="8.62" x="0" y="0" fill="#3C3B6E" />
      <g fill="#FFFFFF">
        <circle cx="2" cy="1.8" r="0.65" />
        <circle cx="5.2" cy="1.8" r="0.65" />
        <circle cx="8.4" cy="1.8" r="0.65" />
        <circle cx="3.6" cy="4.3" r="0.65" />
        <circle cx="6.8" cy="4.3" r="0.65" />
        <circle cx="2" cy="6.8" r="0.65" />
        <circle cx="5.2" cy="6.8" r="0.65" />
        <circle cx="8.4" cy="6.8" r="0.65" />
      </g>
    </svg>
  );
}

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
    launcherVersion: "1.3.3",
  });
  const [settings, setSettings] = useState<LauncherSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [avatarError, setAvatarError] = useState(false);
  const [msLoggingIn, setMsLoggingIn] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

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
  const nickInputRef = useRef<HTMLInputElement | null>(null);
  const langMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!langMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLangMenuOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [langMenuOpen]);

  const t = TRANSLATIONS[settings.language];

  const showToast = useCallback(
    (text: string, type: "info" | "error" | "success" = "info") => {
      setToast({ text, type });
      window.setTimeout(() => {
        setToast((prev) => (prev?.text === text ? null : prev));
      }, 3400);
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
        const update = await check().catch(() => null);
        if (update) {
          setPendingUpdate(update);
        } else if (manual) {
          showToast(TRANSLATIONS[settings.language].upToDateToast, "success");
        }
      } catch (err) {
        if (manual) {
          showToast(TRANSLATIONS[settings.language].upToDateToast, "info");
        }
        console.debug("Updater check skipped:", err);
      } finally {
        setCheckingUpdater(false);
      }
    },
    [settings.language, showToast]
  );

  // Instant startup (zero fake splash delay)
  useEffect(() => {
    let unlistenProgress: (() => void) | null = null;
    let mounted = true;

    const init = async () => {
      try {
        const [sys, loaded] = await Promise.all([
          invoke<SystemInfo>("get_system_info"),
          invoke<LauncherSettings>("load_settings"),
        ]);
        if (!mounted) return;

        setSystemInfo(sys);
        const merged: LauncherSettings = {
          ...DEFAULT_SETTINGS,
          ...loaded,
          gameDir: loaded.gameDir || sys.defaultGameDir,
          ramMb: Math.min(Math.max(loaded.ramMb || 4096, 1024), sys.totalRamMb),
          accountType: loaded.accountType === "microsoft" ? "microsoft" : "offline",
        };
        setSettings(merged);
        setSettingsLoaded(true);

        void Promise.all([
          refreshInstalledMods(merged.gameDir),
          refreshChangelog(merged.gameDir),
        ]);
        void runUpdaterCheck(false);
      } catch (err) {
        console.error("Initialization error:", err);
        if (mounted) {
          setSettingsLoaded(true);
        }
      }
    };

    void init();

    void listen<LaunchProgressPayload>("launch-progress", (event) => {
      setLaunchProgress(event.payload);
      if (event.payload.stage === "ready" || event.payload.stage === "error") {
        setLaunching(false);
      }
    }).then((unlisten) => {
      unlistenProgress = unlisten;
    });

    return () => {
      mounted = false;
      if (unlistenProgress) unlistenProgress();
    };
  }, [refreshChangelog, refreshInstalledMods, runUpdaterCheck]);

  // Modrinth search
  const fetchModrinth = useCallback(async (query: string) => {
    setModrinthLoading(true);
    setModrinthError(null);
    try {
      const facets = encodeURIComponent(
        JSON.stringify([["versions:1.21.11"], ["loaders:fabric"], ["project_type:mod"]])
      );
      const qParam = query.trim() ? `&query=${encodeURIComponent(query.trim())}` : "";
      const url = `https://api.modrinth.com/v2/search?facets=${facets}&index=downloads&limit=24${qParam}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "FameLauncher/1.3.0 (github.com/Txmih/famevisuals-launcher)",
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
    searchTimeoutRef.current = window.setTimeout(
      () => {
        void fetchModrinth(modrinthQuery);
      },
      modrinthQuery ? 280 : 0
    );

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
          "User-Agent": "FameLauncher/1.3.0 (github.com/Txmih/famevisuals-launcher)",
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

  const handleMicrosoftLogin = async () => {
    if (msLoggingIn) return;
    setMsLoggingIn(true);
    try {
      const profile = await invoke<MicrosoftAccountProfile>("login_microsoft");
      setAvatarError(false);
      updateSettings({
        accountType: "microsoft",
        msUsername: profile.username,
        msUuid: profile.uuid,
        msAccessToken: profile.accessToken,
        msRefreshToken: profile.refreshToken,
      });
      showToast(`${t.msLoginSuccess} ${profile.username}`, "success");
    } catch (err) {
      showToast(String(err), "error");
    } finally {
      setMsLoggingIn(false);
    }
  };

  const handleMicrosoftLogout = () => {
    setAvatarError(false);
    updateSettings({
      msUsername: null,
      msUuid: null,
      msAccessToken: null,
      msRefreshToken: null,
    });
  };

  const handleSwitchAccountType = (type: AccountType) => {
    setAvatarError(false);
    updateSettings({ accountType: type });
  };

  const handleLaunchGame = async () => {
    if (launching || !settingsLoaded) return;

    const isMs = settings.accountType === "microsoft";
    if (isMs && !settings.msAccessToken) {
      showToast(t.msNotSignedInHint, "error");
      return;
    }

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
      if (isMs) {
        const reloaded = await invoke<LauncherSettings>("load_settings");
        setSettings((prev) => ({ ...prev, ...reloaded }));
      }
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

  const navItems: {
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "home", label: t.navHome, icon: IconHome },
    { id: "mods", label: t.navMods, icon: IconMods },
    { id: "changelog", label: t.navChangelog, icon: IconChangelog },
    { id: "settings", label: t.navSettings, icon: IconSettings },
  ];

  const isMicrosoftMode = settings.accountType === "microsoft";
  const isMsSignedIn = Boolean(settings.msUsername && settings.msAccessToken);
  const displayNick =
    isMicrosoftMode && isMsSignedIn
      ? settings.msUsername || "Player"
      : settings.nickname.trim() || "FamePlayer";
  const activeAvatarKey =
    isMicrosoftMode && isMsSignedIn
      ? settings.msUuid || settings.msUsername || "Steve"
      : settings.nickname.trim() || "Steve";
  const avatarSrc = `https://mc-heads.net/avatar/${encodeURIComponent(activeAvatarKey)}/64`;

  const enabledModsCount = useMemo(
    () => installedMods.filter((m) => m.enabled).length,
    [installedMods]
  );

  const readyHeading =
    settings.language === "ru"
      ? "Готов к запуску"
      : settings.language === "pl"
        ? "Gotowy do gry"
        : "Ready to Launch";
  const readySub =
    settings.language === "ru"
      ? "Клиент Fabric • FameVisuals"
      : settings.language === "pl"
        ? "Klient Fabric • FameVisuals"
        : "Fabric Client • FameVisuals";
  const currentLangOption =
    LANGUAGE_OPTIONS.find((l) => l.code === settings.language) || LANGUAGE_OPTIONS[0];
  const launchWord =
    settings.language === "ru"
      ? "Запустить"
      : settings.language === "pl"
        ? "Uruchom"
        : "Launch";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090a0d] text-zinc-100">
      {/* Slim Left Icon Navigation Rail (ONLY useful tabs — no shop, no friends, no bloat) */}
      <aside className="flex w-[64px] shrink-0 flex-col items-center justify-between border-r border-white/[0.06] bg-[#0a0b0f] py-3">
        <div className="flex flex-col items-center gap-4">
          {/* High-res FameVisuals Logo Mark */}
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            title="FameLauncher"
            className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/[0.12] bg-[#12141c] shadow-md transition hover:border-white/30"
          >
            <img
              src={logoImg}
              alt="FameVisuals"
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </button>

          <div className="h-px w-7 bg-white/[0.07]" />

          {/* Navigation Icons */}
          <nav className="flex flex-col items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  onClick={() => setActiveTab(item.id)}
                  className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-150 ${
                    active
                      ? "bg-white/[0.1] text-white"
                      : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200"
                  }`}
                >
                  {active && (
                    <span className="absolute -left-[12px] h-5 w-[3px] rounded-r-full bg-white" />
                  )}
                  <Icon className="h-[19px] w-[19px]" />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Utility Rail Icons */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            title={t.settingsOpenDir}
            onClick={() => {
              if (settings.gameDir) {
                void invoke("open_game_dir", { path: settings.gameDir });
              }
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200"
          >
            <FolderOpen className="h-[17px] w-[17px]" />
          </button>
          <button
            type="button"
            title={t.checkUpdatesBtn}
            disabled={checkingUpdater}
            onClick={() => void runUpdaterCheck(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-[16px] w-[16px] ${checkingUpdater ? "animate-spin" : ""}`} />
          </button>
        </div>
      </aside>

      {/* Right Main Workspace: Clean Top Bar + Active View */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Frameless Minimal Top Header */}
        <header
          data-tauri-drag-region
          className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0b0c10] px-5"
        >
          <div data-tauri-drag-region className="flex items-center gap-3.5">
            <span
              data-tauri-drag-region
              className="text-[13px] font-bold tracking-wide text-zinc-100"
            >
              FameLauncher
            </span>

            {/* Compact Language Dropdown with Flag Icons */}
            <div
              ref={langMenuRef}
              className="relative"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLangMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#12141c] px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:border-white/[0.16] hover:text-white"
              >
                <LanguageFlag code={currentLangOption.code} />
                <span>{currentLangOption.label}</span>
                <ChevronDown
                  className={`h-3 w-3 text-zinc-400 transition-transform duration-150 ${
                    langMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {langMenuOpen && (
                <div className="absolute left-0 top-full z-50 mt-1.5 w-[150px] overflow-hidden rounded-xl border border-white/[0.1] bg-[#11131a]/95 p-1 shadow-2xl backdrop-blur-md">
                  {LANGUAGE_OPTIONS.map((lang) => {
                    const active = settings.language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          updateSettings({ language: lang.code });
                          setLangMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-medium transition-colors ${
                          active
                            ? "bg-white/[0.12] text-white"
                            : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <LanguageFlag code={lang.code} />
                          <span>{lang.label}</span>
                        </span>
                        {active && <Check className="h-3 w-3 shrink-0 text-white" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Center-Right Social & Wallpaper + Window Controls */}
          <div className="flex items-center gap-1.5" onMouseDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              title="Discord"
              onClick={() => void openUrl("https://discord.gg/fSCMzjPMRR")}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-white"
            >
              <DiscordBrandIcon className="h-[15px] w-[15px]" />
            </button>
            <button
              type="button"
              title="Telegram"
              onClick={() => void openUrl("https://t.me/famevisuals")}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-white"
            >
              <TelegramBrandIcon className="h-[14px] w-[14px]" />
            </button>
            <button
              type="button"
              title={t.settingsWallpaperTitle}
              onClick={() => void handlePickWallpaper()}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-white"
            >
              <ImageIcon className="h-[14px] w-[14px]" />
            </button>

            <div className="mx-1.5 h-3.5 w-px bg-white/[0.08]" />

            <button
              type="button"
              onClick={() => void getCurrentWindow().minimize()}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white"
              aria-label="Minimize"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => void getCurrentWindow().close()}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-rose-500/85 hover:text-white"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* Scrollable Content Stage */}
        <main className="relative flex-1 overflow-y-auto p-5">
          {/* ======================== HOME TAB ======================== */}
          {activeTab === "home" && (
            <div key="home" className="tab-fade flex h-full min-h-[500px] flex-col gap-4">
              {/* Atmospheric Hero Launch Card */}
              <section className="fame-hero-stage relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl px-6 py-8">
                {/* Custom Wallpaper OR Atmospheric FameVisuals Emblem Backdrop */}
                {wallpaperUrl ? (
                  <>
                    <img
                      src={wallpaperUrl}
                      alt=""
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-[#0b0c10]/65 to-[#0b0c10]/55" />
                  </>
                ) : (
                  <>
                    {/* Subtle High-Res FameVisuals Logo Ambient Watermark (Uniquely FameVisuals!) */}
                    <img
                      src={logoImg}
                      alt=""
                      className="pointer-events-none absolute left-8 top-1/2 h-[310px] w-[310px] -translate-y-1/2 select-none rounded-full object-cover opacity-[0.22] mix-blend-screen"
                    />
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(circle at 26% 50%, transparent 10%, rgba(11, 12, 16, 0.88) 62%)",
                      }}
                    />
                  </>
                )}

                {/* Top-Left Account Pill */}
                <button
                  type="button"
                  onClick={() => nickInputRef.current?.focus()}
                  className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/[0.1] bg-[#0e1017]/90 px-3 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isMicrosoftMode ? "bg-sky-400" : "bg-emerald-400"
                    }`}
                  />
                  <span>
                    {isMicrosoftMode ? t.accountTypeMicrosoft : t.accountTypeOffline} • {displayNick}
                  </span>
                </button>

                {/* Center Launch Block */}
                <div className="relative z-10 flex max-w-md flex-col items-center text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.14] bg-[#12141c] shadow-lg">
                    <img
                      src={logoImg}
                      alt="FameVisuals"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <h1 className="text-3xl font-bold tracking-tight text-white sm:text-[34px]">
                    {readyHeading}
                  </h1>
                  <p className="mt-1.5 text-xs font-medium text-zinc-400">{readySub}</p>

                  {/* Iconic Sleek Bordered Launch Button */}
                  <button
                    type="button"
                    onClick={() => void handleLaunchGame()}
                    disabled={launching}
                    className="fame-launch-btn mt-6 flex min-w-[238px] items-center justify-center gap-3.5 rounded-xl px-7 py-3 text-left disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {launching ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white" />
                    ) : (
                      <Play className="h-4 w-4 shrink-0 fill-current text-white" />
                    )}
                    <div className="flex flex-col leading-tight">
                      <span className="text-[14px] font-semibold tracking-wide text-white">
                        {launching ? t.launchingButton : launchWord}
                      </span>
                      <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                        FAMEVISUALS
                      </span>
                    </div>
                  </button>

                  {/* Inline Launch & Mod-Sync Progress Bar */}
                  {launchProgress && (
                    <div className="mt-5 w-80 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span
                          className={`truncate font-medium ${
                            launchProgress.stage === "error"
                              ? "text-rose-300"
                              : launchProgress.stage === "ready"
                                ? "text-emerald-300"
                                : "text-zinc-300"
                          }`}
                        >
                          {localizedStageText}
                        </span>
                        <span className="ml-2 shrink-0 font-mono text-zinc-400">
                          {launchProgress.totalMb > 0
                            ? `${launchProgress.downloadedMb.toFixed(1)}/${launchProgress.totalMb.toFixed(1)} MB`
                            : `${Math.round(launchProgress.percent)}%`}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className={`h-full rounded-full transition-[width] duration-200 ${
                            launchProgress.stage === "error"
                              ? "bg-rose-500"
                              : launchProgress.stage === "ready"
                                ? "bg-emerald-400"
                                : "bg-white"
                          }`}
                          style={{
                            width: `${Math.max(3, Math.min(100, launchProgress.percent))}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Clean Compact Bottom Controls Strip (Account + Quick Stats — NO News, NO Friends) */}
              <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                {/* Account / Profile Compact Card */}
                <div className="fame-surface flex flex-col justify-between gap-3 rounded-2xl p-4 lg:col-span-7">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/[0.1] bg-[#0a0b0f]">
                        {!avatarError ? (
                          <img
                            src={avatarSrc}
                            alt={displayNick}
                            onError={() => setAvatarError(true)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zinc-500">
                            <User className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      {!isMicrosoftMode ? (
                        <div className="min-w-0 flex-1">
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            {t.nicknameLabel}
                          </label>
                          <input
                            ref={nickInputRef}
                            type="text"
                            maxLength={16}
                            value={settings.nickname}
                            placeholder={t.nicknamePlaceholder}
                            onChange={(e) => {
                              setAvatarError(false);
                              const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
                              updateSettings({ nickname: val }, 300);
                            }}
                            className="mt-1 w-48 max-w-full rounded-lg border border-white/[0.08] bg-[#0a0b0f] px-2.5 py-1 text-xs font-semibold text-white outline-none transition-colors focus:border-white/30"
                          />
                        </div>
                      ) : isMsSignedIn ? (
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-bold text-white">
                              {settings.msUsername}
                            </span>
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          </div>
                          <div className="text-[11px] text-zinc-500">{t.msLicensedLabel}</div>
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-200">
                            {t.profileMicrosoftBadge}
                          </div>
                          <div className="text-[11px] text-zinc-500">{t.msNotSignedInHint}</div>
                        </div>
                      )}
                    </div>

                    {/* Mode Switcher + MS Action */}
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="flex rounded-lg border border-white/[0.08] bg-[#0a0b0f] p-0.5">
                        <button
                          type="button"
                          onClick={() => handleSwitchAccountType("offline")}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            !isMicrosoftMode
                              ? "bg-white/[0.12] text-white"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {t.accountTypeOffline}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSwitchAccountType("microsoft")}
                          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            isMicrosoftMode
                              ? "bg-white/[0.12] text-white"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          <MicrosoftLogoIcon className="h-3 w-3" />
                          <span>MS</span>
                        </button>
                      </div>

                      {isMicrosoftMode &&
                        (isMsSignedIn ? (
                          <button
                            type="button"
                            onClick={handleMicrosoftLogout}
                            title={t.msLogoutBtn}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-300 transition-colors hover:bg-rose-500/20"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={msLoggingIn}
                            onClick={() => void handleMicrosoftLogin()}
                            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-60"
                          >
                            {msLoggingIn && <Loader2 className="h-3 w-3 animate-spin" />}
                            <span>{t.msLoginBtn}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Quick System / Client Status Card */}
                <div className="fame-surface grid grid-cols-2 divide-x divide-white/[0.06] rounded-2xl p-3 lg:col-span-5">
                  <button
                    type="button"
                    onClick={() => setActiveTab("mods")}
                    className="flex flex-col justify-center rounded-lg px-4 py-1 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      {t.statMods}
                    </span>
                    <span className="mt-1 text-base font-bold text-white">{enabledModsCount}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("settings")}
                    className="flex flex-col justify-center px-4 py-1 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      {t.statRam}
                    </span>
                    <span className="mt-1 text-base font-bold text-white">
                      {(settings.ramMb / 1024).toFixed(1)} GB
                    </span>
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* ======================== MODS TAB ======================== */}
          {activeTab === "mods" && (
            <div key="mods" className="tab-fade space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{t.modsTitle}</h2>
                  <p className="text-xs text-zinc-400">{t.modsSubtitle}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void refreshInstalledMods(settings.gameDir)}
                    className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#12141c] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.08]"
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
                    className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#12141c] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.08]"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    <span>{t.modsOpenFolder}</span>
                  </button>
                </div>
              </div>

              <div className="inline-flex rounded-xl border border-white/[0.08] bg-[#0d0f15] p-1">
                <button
                  type="button"
                  onClick={() => setModsSubTab("installed")}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                    modsSubTab === "installed"
                      ? "bg-white/[0.12] text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {t.modsTabInstalled} ({installedMods.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModsSubTab("modrinth")}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                    modsSubTab === "modrinth"
                      ? "bg-white/[0.12] text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {t.modsTabModrinth}
                </button>
              </div>

              {modsSubTab === "installed" ? (
                installedMods.length === 0 ? (
                  <div className="fame-surface flex flex-col items-center justify-center rounded-2xl p-10 text-center">
                    <Package className="h-9 w-9 text-zinc-500" />
                    <h3 className="mt-3 text-sm font-semibold text-white">
                      {t.modsEmptyInstalled}
                    </h3>
                    <p className="mt-1 max-w-md text-xs text-zinc-400">
                      {t.modsEmptyInstalledHint}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {installedMods.map((mod) => (
                      <div
                        key={mod.fileName}
                        className={`fame-surface flex items-center justify-between gap-4 rounded-xl p-3.5 transition-opacity ${
                          mod.enabled ? "opacity-100" : "opacity-55"
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-white">
                              {mod.cleanName}
                            </span>
                            <span className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                              {mod.version}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                mod.isOfficial
                                  ? "border border-white/20 bg-white/[0.08] text-zinc-100"
                                  : "border border-white/10 bg-white/[0.04] text-zinc-400"
                              }`}
                            >
                              {mod.isOfficial ? t.modsOfficialBadge : t.modsCustomBadge}
                            </span>
                            {!mod.enabled && (
                              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                                {t.modsDisabledBadge}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-zinc-400">
                            {mod.description || mod.fileName}
                          </p>
                          <div className="font-mono text-[11px] text-zinc-500">
                            {mod.fileName} • {formatBytes(mod.sizeBytes)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => void handleToggleMod(mod)}
                            aria-label="Toggle Mod"
                            className={`relative h-5 w-10 rounded-full border transition-colors ${
                              mod.enabled
                                ? "border-white/30 bg-white/25"
                                : "border-white/10 bg-white/[0.05]"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all ${
                                mod.enabled ? "left-[21px]" : "left-0.5"
                              }`}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() => setModToDelete(mod)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-zinc-400 transition-colors hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-300"
                            aria-label="Delete Mod"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={modrinthQuery}
                      onChange={(e) => setModrinthQuery(e.target.value)}
                      placeholder={t.modrinthSearchPlaceholder}
                      className="w-full rounded-xl border border-white/[0.08] bg-[#0e1017] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-colors focus:border-white/25"
                    />
                  </div>

                  {!modrinthQuery && (
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
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
                      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                    </div>
                  ) : modrinthMods.length === 0 ? (
                    <div className="fame-surface rounded-2xl p-8 text-center text-sm text-zinc-400">
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
                            className="fame-surface flex items-start justify-between gap-3 rounded-xl p-3.5"
                          >
                            <div className="flex min-w-0 flex-1 gap-3">
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-[#0a0b0f]">
                                {project.icon_url ? (
                                  <img
                                    src={project.icon_url}
                                    alt={project.title}
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-zinc-500">
                                    <Package className="h-4 w-4" />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <h3 className="truncate text-sm font-semibold text-white">
                                  {project.title}
                                </h3>
                                <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">
                                  {project.description}
                                </p>
                                <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                                  <span>{project.author}</span>
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
                              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                installed
                                  ? "border border-emerald-500/25 bg-emerald-500/12 text-emerald-300"
                                  : "bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
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
            </div>
          )}

          {/* ======================== CHANGELOG TAB ======================== */}
          {activeTab === "changelog" && (
            <div key="changelog" className="tab-fade space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{t.changelogTitle}</h2>
                  <p className="text-xs text-zinc-400">{t.changelogSubtitle}</p>
                </div>

                <div className="flex items-center gap-2">
                  {changelogFromCache && (
                    <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200">
                      {t.changelogOfflineNote}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void refreshChangelog(settings.gameDir)}
                    className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#12141c] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.08]"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${changelogLoading ? "animate-spin" : ""}`} />
                    <span>{t.changelogRefresh}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {changelog.map((entry) => (
                  <div key={entry.version} className="fame-surface space-y-3 rounded-2xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-bold text-white">{entry.version}</span>
                        {entry.isLatest && (
                          <span className="rounded-full border border-white/20 bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-zinc-100">
                            {t.changelogLatestBadge}
                          </span>
                        )}
                        {entry.title && (
                          <span className="text-xs text-zinc-400">
                            — {entry.title[settings.language] || entry.title.en}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-zinc-500">{entry.date}</span>
                    </div>

                    <ul className="space-y-2">
                      {entry.changes.map((ch, idx) => {
                        const style = CATEGORY_STYLES[ch.category] || CATEGORY_STYLES.IMPROVED;
                        const catLabel =
                          ch.category === "NEW"
                            ? t.changelogCatNew
                            : ch.category === "FIX"
                              ? t.changelogCatFix
                              : t.changelogCatImproved;
                        return (
                          <li key={idx} className="flex items-start gap-2.5 text-xs">
                            <span
                              className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${style.bg} ${style.text} ${style.border}`}
                            >
                              {catLabel}
                            </span>
                            <span className="leading-relaxed text-zinc-300">
                              {ch.text[settings.language] || ch.text.en}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================== SETTINGS TAB ======================== */}
          {activeTab === "settings" && (
            <div key="settings" className="tab-fade space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">{t.settingsTitle}</h2>
                <p className="text-xs text-zinc-400">{t.settingsSubtitle}</p>
              </div>

              {/* Game Directory */}
              <div className="fame-surface space-y-3 rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-zinc-300" />
                  <h3 className="text-sm font-semibold text-white">{t.settingsGameDirTitle}</h3>
                </div>
                <p className="text-xs text-zinc-400">{t.settingsGameDirDesc}</p>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1 truncate rounded-xl border border-white/[0.08] bg-[#0a0b0f] px-3 py-2 font-mono text-xs text-zinc-200">
                    {settings.gameDir}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handlePickGameDir()}
                      className="rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
                    >
                      {t.settingsChangeDir}
                    </button>
                    <button
                      type="button"
                      onClick={() => void invoke("open_game_dir", { path: settings.gameDir })}
                      className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#141720] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.08]"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      <span>{t.settingsOpenDir}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* RAM Slider */}
              <div className="fame-surface space-y-3.5 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-zinc-300" />
                    <h3 className="text-sm font-semibold text-white">{t.settingsRamTitle}</h3>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold text-white">
                      {(settings.ramMb / 1024).toFixed(1)} GB
                    </span>
                    <span className="font-mono text-xs text-zinc-500">({settings.ramMb} MB)</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-400">{t.settingsRamDesc}</p>

                <div className="space-y-2">
                  <input
                    type="range"
                    min={1024}
                    max={systemInfo.totalRamMb}
                    step={512}
                    value={settings.ramMb}
                    onChange={(e) => updateSettings({ ramMb: Number(e.target.value) }, 120)}
                    style={{
                      background: `linear-gradient(to right, #e4e4e7 0%, #ffffff ${
                        ((settings.ramMb - 1024) / Math.max(512, systemInfo.totalRamMb - 1024)) *
                        100
                      }%, rgba(255,255,255,0.12) ${
                        ((settings.ramMb - 1024) / Math.max(512, systemInfo.totalRamMb - 1024)) *
                        100
                      }%, rgba(255,255,255,0.12) 100%)`,
                    }}
                    className="ram-slider w-full cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <span>1.0 GB</span>
                    <span className="text-zinc-300">{t.settingsRamRecommended}</span>
                    <span>
                      {t.settingsRamMaxPc} {(systemInfo.totalRamMb / 1024).toFixed(1)} GB
                    </span>
                  </div>
                </div>
              </div>

              {/* Language + Wallpaper Row */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="fame-surface space-y-3 rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4 text-zinc-300" />
                    <h3 className="text-sm font-semibold text-white">{t.settingsLanguageTitle}</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {LANGUAGE_OPTIONS.map((lang) => {
                      const active = settings.language === lang.code;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => updateSettings({ language: lang.code })}
                          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                            active
                              ? "border-white/30 bg-white/[0.12] text-white"
                              : "border-white/[0.07] bg-[#0a0b0f] text-zinc-400 hover:text-white"
                          }`}
                        >
                          <LanguageFlag code={lang.code} />
                          <span>{lang.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="fame-surface flex flex-col justify-between gap-3 rounded-2xl p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-zinc-300" />
                      <h3 className="text-sm font-semibold text-white">
                        {t.settingsWallpaperTitle}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">{t.settingsWallpaperDesc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handlePickWallpaper()}
                      className="rounded-xl bg-white/[0.1] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/[0.16]"
                    >
                      {t.settingsWallpaperPick}
                    </button>
                    {settings.customWallpaper && (
                      <button
                        type="button"
                        onClick={() => updateSettings({ customWallpaper: null })}
                        className="rounded-xl border border-white/[0.08] px-3.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08]"
                      >
                        {t.settingsWallpaperReset}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Delete Mod Confirmation Modal */}
      {modToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="fame-surface-elevated w-full max-w-md space-y-4 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-300">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="text-sm font-bold text-white">{t.modsDeleteTitle}</h3>
            </div>
            <p className="text-xs leading-relaxed text-zinc-300">
              {t.modsDeleteConfirm}{" "}
              <span className="font-mono font-semibold text-white">{modToDelete.fileName}</span>?
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModToDelete(null)}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/[0.1]"
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
          </div>
        </div>
      )}

      {/* Launcher Self-Updater Modal */}
      {pendingUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="fame-surface-elevated w-full max-w-md space-y-4 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.08] text-white">
                <ArrowDownToLine className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{t.updaterModalTitle}</h3>
                <p className="text-xs text-zinc-400">
                  {t.updaterNewVersion}{" "}
                  <span className="font-mono font-semibold text-white">
                    v{pendingUpdate.version}
                  </span>
                </p>
              </div>
            </div>

            {pendingUpdate.body && (
              <div className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/[0.08] bg-[#0a0b0f] p-3 text-xs text-zinc-300">
                {pendingUpdate.body}
              </div>
            )}

            {updatingLauncher && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-zinc-200">
                  <span>
                    {updatePercent >= 100 ? t.updaterRestarting : t.updaterDownloading}
                  </span>
                  <span className="font-mono">{updatePercent}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-white transition-[width] duration-150"
                    style={{ width: `${updatePercent}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              {!updatingLauncher && (
                <button
                  type="button"
                  onClick={() => setPendingUpdate(null)}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/[0.1]"
                >
                  {t.updaterLater}
                </button>
              )}
              <button
                type="button"
                disabled={updatingLauncher}
                onClick={() => void handleInstallUpdater()}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
              >
                {updatingLauncher ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wrench className="h-3.5 w-3.5" />
                )}
                <span>{t.updaterInstallNow}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Floating Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-xl ${
            toast.type === "error"
              ? "border-rose-500/40 bg-[#231016] text-rose-100"
              : toast.type === "success"
                ? "border-emerald-500/35 bg-[#0f211b] text-emerald-100"
                : "border-white/15 bg-[#151822] text-zinc-100"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

export default App;
