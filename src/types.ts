export type Language = "en" | "ru" | "pl";

export type TabId =
  | "home"
  | "friends"
  | "shop"
  | "profile"
  | "admin"
  | "mods"
  | "changelog"
  | "settings";

export type AccountType = "offline" | "microsoft";

export interface GlobalsFriend {
  name: string;
  online: boolean;
  activity: string;
  server: string;
  anarchy?: string;
  nick?: string;
  source?: string;
  role?: string;
  avatar?: string;
}

export interface PartyMember {
  login: string;
  nick: string;
  online: boolean;
  server: string;
  source: string;
  is_leader: boolean;
  avatar?: string;
}

export interface PartyInvite {
  party_id: string;
  from: string;
  from_nick: string;
  members_count?: number;
}

export interface PartyMessage {
  id: number;
  author: string;
  nick: string;
  text: string;
  system?: boolean;
  coords?: { x: number; y: number; z: number; dim?: string } | null;
  ts?: number;
}

export interface PartyState {
  id: string;
  leader: string;
  members: PartyMember[];
  messages: PartyMessage[];
}

export interface AdminUserRecord {
  login: string;
  nick: string;
  email: string;
  role: string;
  is_superadmin?: boolean;
  hwid?: string;
  sub_active?: boolean;
  sub_until?: number;
  last_ip: string;
  online: boolean;
  source: string;
  server: string;
  banned: boolean;
  banned_until: number;
  muted: boolean;
  muted_until: number;
  ip_banned: boolean;
  created_at: number;
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
