import React, { useRef, useState } from "react";
import {
  Camera,
  Crown,
  Loader2,
  LogOut,
  Mail,
  ShieldCheck,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { getBackendHttpBase } from "./globalsEndpoint";
import type { Language, LauncherSettings } from "./types";

interface ProfileTabProps {
  language: Language;
  settings: LauncherSettings;
  userRole: string;
  userAvatar: string;
  userEmail: string;
  friendsCount: number;
  onlineFriendsCount: number;
  totalOnline: number;
  showToast: (text: string, type?: "info" | "error" | "success") => void;
  onAvatarUpdated: (newB64: string) => void;
  onSignOut: () => void;
}

const TEXTS = {
  ru: {
    title: "Профиль",
    subtitle: "Управление аккаунтом FameVisuals и аватаркой для чата и друзей",
    changeAvatar: "Загрузить аватарку",
    removeAvatar: "Удалить аватарку",
    avatarUpdated: "Аватарка обновлена!",
    avatarRemoved: "Аватарка удалена",
    logout: "Выйти из аккаунта",
    emailLabel: "Привязанная почта",
    noEmail: "Не указана",
    syncLabel: "Синхронизация с Minecraft",
    syncDesc: "Ваш аккаунт и аватарка автоматически синхронизированы с клиентом FameVisuals.",
    friendsStat: "Друзья",
    onlineStat: "Всего онлайн",
    roleUser: "Игрок",
    roleAdmin: "Администратор",
    errNetwork: "Нет соединения с сервером",
  },
  en: {
    title: "Profile",
    subtitle: "Manage your FameVisuals account and custom avatar",
    changeAvatar: "Upload Avatar",
    removeAvatar: "Remove Avatar",
    avatarUpdated: "Avatar updated!",
    avatarRemoved: "Avatar removed",
    logout: "Sign Out",
    emailLabel: "Linked Email",
    noEmail: "Not linked",
    syncLabel: "Minecraft Auto-Sync",
    syncDesc: "Your account and avatar automatically sync with the FameVisuals client.",
    friendsStat: "Friends",
    onlineStat: "Total Online",
    roleUser: "Player",
    roleAdmin: "Administrator",
    errNetwork: "Could not reach server",
  },
  pl: {
    title: "Profil",
    subtitle: "Zarządzaj kontem FameVisuals i własnym awatarem",
    changeAvatar: "Wgraj awatar",
    removeAvatar: "Usuń awatar",
    avatarUpdated: "Awatar zaktualizowany!",
    avatarRemoved: "Awatar usunięty",
    logout: "Wyloguj się",
    emailLabel: "Powiązany Email",
    noEmail: "Brak",
    syncLabel: "Synchronizacja z Minecraft",
    syncDesc: "Twoje konto i awatar są automatycznie synchronizowane z klientem FameVisuals.",
    friendsStat: "Znajomi",
    onlineStat: "Online łącznie",
    roleUser: "Gracz",
    roleAdmin: "Administrator",
    errNetwork: "Brak połączenia z serwerem",
  },
};

function resizeImageToPngBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 128;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const dataUrl = canvas.toDataURL("image/png");
        const b64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
        resolve(b64);
      };
      img.onerror = () => reject(new Error("Bad image"));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Read error"));
    reader.readAsDataURL(file);
  });
}

export function ProfileTab({
  language,
  settings,
  userRole,
  userAvatar,
  userEmail,
  friendsCount,
  onlineFriendsCount,
  totalOnline,
  showToast,
  onAvatarUpdated,
  onSignOut,
}: ProfileTabProps) {
  const l = TEXTS[language];
  const isAdmin = userRole === "admin" || (settings.globalsLogin || "").toLowerCase() === "txmih";
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const apiBase = getBackendHttpBase();

  const uploadAvatar = async (b64: string, successMsg: string) => {
    setAvatarBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/profile/avatar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.globalsToken || ""}`,
        },
        body: JSON.stringify({ data: b64 }),
      });
      const data = await res.json();
      if (!data.ok) {
        showToast(data.error || l.errNetwork, "error");
        return;
      }
      onAvatarUpdated(data.avatar || "");
      showToast(successMsg, "success");
    } catch {
      showToast(l.errNetwork, "error");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || avatarBusy) return;
    try {
      const b64 = await resizeImageToPngBase64(file);
      await uploadAvatar(b64, l.avatarUpdated);
    } catch {
      showToast(l.errNetwork, "error");
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-[820px] flex-col gap-5 pb-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">{l.title}</h2>
        <p className="mt-0.5 text-xs text-zinc-400">{l.subtitle}</p>
      </div>

      {/* Main Profile Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111217]/90 p-6 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarFile}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarBusy}
              className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-zinc-800/80 text-zinc-400 transition hover:border-white/40"
            >
              {userAvatar ? (
                <img
                  src={`data:image/png;base64,${userAvatar}`}
                  alt={settings.globalsLogin || "Avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-9 w-9" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100">
                {avatarBusy ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </div>
            </button>

            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-bold text-white">{settings.globalsLogin}</span>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-300">
                    <Crown className="h-3 w-3" />
                    {l.roleAdmin}
                  </span>
                ) : (
                  <span className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                    {l.roleUser}
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={avatarBusy}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {l.changeAvatar}
                </button>
                {userAvatar && (
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={() => void uploadAvatar("", l.avatarRemoved)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {l.removeAvatar}
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-zinc-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            {l.logout}
          </button>
        </div>
      </div>

      {/* Account Info & Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.07] bg-[#111217]/90 p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Mail className="h-3.5 w-3.5" />
            <span>{l.emailLabel}</span>
          </div>
          <div className="mt-1.5 truncate text-sm font-semibold text-white">
            {userEmail || l.noEmail}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#111217]/90 p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Users className="h-3.5 w-3.5" />
            <span>{l.friendsStat}</span>
          </div>
          <div className="mt-1.5 text-sm font-semibold text-white">
            {onlineFriendsCount} / {friendsCount}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#111217]/90 p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>{l.onlineStat}</span>
          </div>
          <div className="mt-1.5 text-sm font-semibold text-white">{totalOnline}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-[#111217]/80 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>{l.syncLabel}</span>
        </div>
        <p className="mt-1 text-xs text-zinc-400">{l.syncDesc}</p>
      </div>
    </div>
  );
}
