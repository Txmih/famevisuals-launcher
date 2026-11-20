export type Language = "en" | "ru" | "pl";

export type TabId = "home" | "friends" | "mods" | "changelog" | "settings";

export type AccountType = "offline" | "microsoft";

export interface GlobalsFriend {
  name: string;
  online: boolean;
  activity: string;
  server: string;
  anarchy?: string;
  nick?: string;
  source?: string;
}

export interface GlobalsOnlinePlayer {
  login: string;
  nick?: string;
  server: string;
  activity: string;
  source?: string;
  same_server?: boolean;
}

export interface LauncherSettings {
  nickname: string;
  ramMb: number;
  gameDir: string;
  language: Language;
  customWallpaper?: string | null;
  accountType?: AccountType;
  msUsername?: string | null;
  msUuid?: string | null;
  msAccessToken?: string | null;
  msRefreshToken?: string | null;
  globalsServer?: string | null;
  globalsLogin?: string | null;
  globalsToken?: string | null;
}

export interface MicrosoftAccountProfile {
  username: string;
  uuid: string;
  accessToken: string;
  refreshToken: string;
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
