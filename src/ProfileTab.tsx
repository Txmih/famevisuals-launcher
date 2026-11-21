import React, { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Camera,
  Check,
  Copy,
  Cpu,
  Crown,
  Edit3,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  ShieldCheck,
  ShoppingBag,
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
  hasEmail: boolean;
  userHwid: string;
  subActive: boolean;
  subUntil: number;
  friendsCount: number;
  onlineFriendsCount: number;
  totalOnline: number;
  showToast: (text: string, type?: "info" | "error" | "success") => void;
  onAvatarUpdated: (newB64: string) => void;
  onEmailUpdated: (maskedEmail: string) => void;
  onOpenShop: () => void;
  onSignOut: () => void;
}

const TEXTS = {
  ru: {
    title: "Профиль",
    subtitle: "Управление аккаунтом FameVisuals, почтой, HWID и статусом подписки",
    changeAvatar: "Загрузить аватарку",
    removeAvatar: "Удалить аватарку",
    avatarUpdated: "Аватарка обновлена!",
    avatarRemoved: "Аватарка удалена",
    logout: "Выйти из аккаунта",
    emailLabel: "Привязанная почта (Gmail)",
    noEmail: "Не привязана",
    addEmail: "Добавить Gmail",
    changeEmail: "Изменить",
    sendCode: "Отправить код",
    confirmCode: "Подтвердить",
    emailPlaceholder: "yourname@gmail.com",
    codePlaceholder: "6-значный код с почты",
    codeSent: "Код отправлен на почту!",
    emailSaved: "Почта успешно привязана!",
    hwidLabel: "Ваш HWID (привязка ПК)",
    hwidCopied: "HWID скопирован!",
    hwidUnbound: "Привяжется при запуске",
    subLabel: "Статус подписки",
    subLifetime: "Навсегда (Lifetime)",
    subNone: "Нет активной подписки",
    buySub: "Купить подписку",
    syncLabel: "Синхронизация с Minecraft",
    syncDesc: "Ваш аккаунт, подписка и аватарка автоматически синхронизируются с клиентом FameVisuals.",
    friendsStat: "Друзья",
    onlineStat: "Всего онлайн",
    roleUser: "Игрок",
    roleAdmin: "Администратор",
    roleSuperAdmin: "Главный Админ",
    errNetwork: "Нет соединения с сервером",
  },
  en: {
    title: "Profile",
    subtitle: "Manage your FameVisuals account, email, HWID binding and subscription",
    changeAvatar: "Upload Avatar",
    removeAvatar: "Remove Avatar",
    avatarUpdated: "Avatar updated!",
    avatarRemoved: "Avatar removed",
    logout: "Sign Out",
    emailLabel: "Linked Email (Gmail)",
    noEmail: "Not linked",
    addEmail: "Add Gmail",
    changeEmail: "Change",
    sendCode: "Send Code",
    confirmCode: "Verify",
    emailPlaceholder: "yourname@gmail.com",
    codePlaceholder: "6-digit email code",
    codeSent: "Verification code sent!",
    emailSaved: "Email linked successfully!",
    hwidLabel: "Your HWID (PC Lock)",
    hwidCopied: "HWID copied!",
    hwidUnbound: "Binds on first launch",
    subLabel: "Subscription",
    subLifetime: "Lifetime",
    subNone: "No active subscription",
    buySub: "Get Subscription",
    syncLabel: "Minecraft Auto-Sync",
    syncDesc: "Your account, subscription and avatar automatically sync with the FameVisuals client.",
    friendsStat: "Friends",
    onlineStat: "Total Online",
    roleUser: "Player",
    roleAdmin: "Administrator",
    roleSuperAdmin: "Super Admin",
    errNetwork: "Could not reach server",
  },
  pl: {
    title: "Profil",
    subtitle: "Zarządzaj kontem FameVisuals, pocztą, HWID i subskrypcją",
    changeAvatar: "Wgraj awatar",
    removeAvatar: "Usuń awatar",
    avatarUpdated: "Awatar zaktualizowany!",
    avatarRemoved: "Awatar usunięty",
    logout: "Wyloguj się",
    emailLabel: "Powiązany Gmail",
    noEmail: "Nie powiązano",
    addEmail: "Dodaj Gmail",
    changeEmail: "Zmień",
    sendCode: "Wyślij kod",
    confirmCode: "Potwierdź",
    emailPlaceholder: "twoj@gmail.com",
    codePlaceholder: "6-cyfrowy kod z emaila",
    codeSent: "Kod wysłany!",
    emailSaved: "Email zapisany!",
    hwidLabel: "Twój HWID",
    hwidCopied: "Skopiowano HWID!",
    hwidUnbound: "Przypisze się przy starcie",
    subLabel: "Subskrypcja",
    subLifetime: "Na zawsze",
    subNone: "Brak subskrypcji",
    buySub: "Kup dostęp",
    syncLabel: "Synchronizacja z Minecraft",
    syncDesc: "Twoje konto, subskrypcja i awatar są automatycznie synchronizowane z klientem.",
    friendsStat: "Znajomi",
    onlineStat: "Online łącznie",
    roleUser: "Gracz",
    roleAdmin: "Administrator",
    roleSuperAdmin: "Główny Admin",
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
  hasEmail,
  userHwid,
  subActive,
  subUntil,
  friendsCount,
  onlineFriendsCount,
  totalOnline,
  showToast,
  onAvatarUpdated,
  onEmailUpdated,
  onOpenShop,
  onSignOut,
}: ProfileTabProps) {
  const l = TEXTS[language];
  const isSuperAdmin =
    userRole === "superadmin" || (settings.globalsLogin || "").toLowerCase() === "txmih";
  const isAdmin = isSuperAdmin || userRole === "admin";
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [localHwid, setLocalHwid] = useState("");
  const [copiedHwid, setCopiedHwid] = useState(false);

  // Add / Change Email state
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const apiBase = getBackendHttpBase();

  useEffect(() => {
    void invoke<string>("get_hwid")
      .then((h) => setLocalHwid(h))
      .catch(() => {});
  }, []);

  const displayHwid = userHwid || localHwid || l.hwidUnbound;

  const formatSubText = () => {
    if (!subActive) return l.subNone;
    if (subUntil === -1) return l.subLifetime;
    const days = Math.max(1, Math.ceil((subUntil - Date.now()) / 86_400_000));
    const dateStr = new Date(subUntil).toLocaleDateString();
    return language === "ru"
      ? `Осталось ${days} дн. (до ${dateStr})`
      : `${days}d left (until ${dateStr})`;
  };

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

  const handleSendEmailCode = async () => {
    const clean = newEmail.trim();
    if (!clean || emailBusy) return;
    setEmailBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/profile/email/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.globalsToken || ""}`,
        },
        body: JSON.stringify({ email: clean }),
      });
      const data = await res.json();
      if (!data.ok) {
        const msg =
          data.error === "bad_email"
            ? "Введите корректный адрес Gmail"
            : data.error === "email_taken"
              ? "Эта почта уже привязана к другому аккаунту"
              : data.error === "rate_limit"
                ? `Подождите ${data.wait || 60} сек.`
                : data.error || l.errNetwork;
        showToast(msg, "error");
        return;
      }
      setEmailCodeSent(true);
      showToast(l.codeSent, "success");
    } catch {
      showToast(l.errNetwork, "error");
    } finally {
      setEmailBusy(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    const clean = newEmail.trim();
    const code = emailCode.trim();
    if (!clean || !code || emailBusy) return;
    setEmailBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/profile/email/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.globalsToken || ""}`,
        },
        body: JSON.stringify({ email: clean, code }),
      });
      const data = await res.json();
      if (!data.ok) {
        const msg =
          data.error === "bad_code"
            ? "Неверный 6-значный код"
            : data.error === "code_expired"
              ? "Код истёк, запросите новый"
              : data.error || l.errNetwork;
        showToast(msg, "error");
        return;
      }
      onEmailUpdated(data.email || clean);
      setEditingEmail(false);
      setEmailCodeSent(false);
      setNewEmail("");
      setEmailCode("");
      showToast(l.emailSaved, "success");
    } catch {
      showToast(l.errNetwork, "error");
    } finally {
      setEmailBusy(false);
    }
  };

  const handleCopyHwid = () => {
    if (!displayHwid || displayHwid === l.hwidUnbound) return;
    void navigator.clipboard.writeText(displayHwid);
    setCopiedHwid(true);
    showToast(l.hwidCopied, "success");
    window.setTimeout(() => setCopiedHwid(false), 1600);
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-[840px] flex-col gap-4 pb-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">{l.title}</h2>
        <p className="mt-0.5 text-xs text-zinc-400">{l.subtitle}</p>
      </div>

      {/* Main Profile Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111217]/90 p-5 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
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
              className="group relative flex h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-zinc-800/80 text-zinc-400 transition hover:border-white/40"
            >
              {userAvatar ? (
                <img
                  src={`data:image/png;base64,${userAvatar}`}
                  alt={settings.globalsLogin || "Avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-8 w-8" />
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
                {isSuperAdmin ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-300">
                    <Crown className="h-3 w-3" />
                    {l.roleSuperAdmin}
                  </span>
                ) : isAdmin ? (
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

      {/* Subscription + HWID Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div
          className={`rounded-2xl border p-4 ${
            subActive
              ? "border-emerald-500/25 bg-emerald-500/[0.06]"
              : "border-white/[0.08] bg-[#111217]/90"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <KeyRound className={`h-3.5 w-3.5 ${subActive ? "text-emerald-400" : "text-zinc-400"}`} />
              <span>{l.subLabel}</span>
            </div>
            {!subActive && (
              <button
                type="button"
                onClick={onOpenShop}
                className="inline-flex items-center gap-1 rounded-lg bg-sky-400 px-2.5 py-1 text-[11px] font-bold text-black transition hover:bg-sky-300"
              >
                <ShoppingBag className="h-3 w-3" />
                {l.buySub}
              </button>
            )}
          </div>
          <div
            className={`mt-1.5 text-sm font-bold ${
              subActive ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {formatSubText()}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#111217]/90 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Cpu className="h-3.5 w-3.5 text-sky-400" />
              <span>{l.hwidLabel}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyHwid}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold text-zinc-300 transition hover:bg-white/[0.12] hover:text-white"
            >
              {copiedHwid ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copiedHwid ? "OK" : "Copy"}
            </button>
          </div>
          <div className="mt-1.5 font-mono text-sm font-semibold tracking-wider text-white">
            {displayHwid}
          </div>
        </div>
      </div>

      {/* Email Management + Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.07] bg-[#111217]/90 p-4 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Mail className="h-3.5 w-3.5" />
              <span>{l.emailLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingEmail((v) => !v);
                setEmailCodeSent(false);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-zinc-200 transition hover:bg-white/[0.12]"
            >
              <Edit3 className="h-3 w-3" />
              {hasEmail || userEmail ? l.changeEmail : l.addEmail}
            </button>
          </div>
          <div className="mt-1.5 truncate text-sm font-semibold text-white">
            {userEmail || l.noEmail}
          </div>

          {editingEmail && (
            <div className="mt-3 space-y-2 border-t border-white/[0.07] pt-3">
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={l.emailPlaceholder}
                  disabled={emailBusy}
                  className="flex-1 rounded-xl border border-white/10 bg-black/45 px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-white/30"
                />
                <button
                  type="button"
                  disabled={emailBusy || !newEmail.trim()}
                  onClick={() => void handleSendEmailCode()}
                  className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-45"
                >
                  {emailBusy && !emailCodeSent ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    l.sendCode
                  )}
                </button>
              </div>
              {emailCodeSent && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder={l.codePlaceholder}
                    className="flex-1 rounded-xl border border-white/10 bg-black/45 px-3 py-1.5 font-mono text-xs tracking-widest text-white placeholder-zinc-500 outline-none focus:border-emerald-400/50"
                  />
                  <button
                    type="button"
                    disabled={emailBusy || emailCode.length !== 6}
                    onClick={() => void handleVerifyEmailCode()}
                    className="rounded-xl bg-emerald-400 px-3.5 py-1.5 text-xs font-bold text-black transition hover:bg-emerald-300 disabled:opacity-45"
                  >
                    {l.confirmCode}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-2 rounded-2xl border border-white/[0.07] bg-[#111217]/90 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Users className="h-3.5 w-3.5" />
              {l.friendsStat}
            </span>
            <span className="font-semibold text-white">
              {onlineFriendsCount} / {friendsCount}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              {l.onlineStat}
            </span>
            <span className="font-semibold text-white">{totalOnline}</span>
          </div>
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
