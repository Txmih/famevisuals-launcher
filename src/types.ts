export type Language = "en" | "ru" | "pl";

export type TabId = "home" | "mods" | "changelog" | "settings";

export interface LauncherSettings {
  nickname: string;
  ramMb: number;
  gameDir: string;
  language: Language;
  customWallpaper?: string | null;
}

export interface SystemInfo {
  totalRamMb: number;
  defaultGameDir: string;
  launcherVersion: string;
}

export interface InstalledMod {
  fileName: string;
  cleanName: string;
  modId: string;
  version: string;
  description: string;
  enabled: boolean;
  isOfficial: boolean;
  sizeBytes: number;
}

export interface ModrinthProject {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  icon_url: string | null;
  downloads: number;
  author: string;
}

export interface ChangelogChange {
  category: "NEW" | "FIX" | "IMPROVED";
  text: Record<Language, string>;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  isLatest?: boolean;
  title?: Record<Language, string>;
  changes: ChangelogChange[];
}

export interface LaunchProgressPayload {
  stage:
    | "checking_updates"
    | "syncing_mods"
    | "verifying_java"
    | "downloading_minecraft"
    | "launching"
    | "ready"
    | "error";
  message: string;
  percent: number;
  downloadedMb: number;
  totalMb: number;
}
