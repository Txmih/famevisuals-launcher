import React, { useRef, useState } from "react";
import {
  Camera,
  Check,
  Crown,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Send,
  Server,
  Terminal,
  Trash2,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { getBackendHttpBase } from "./globalsEndpoint";
import type { GlobalsFriend, Language, LauncherSettings } from "./types";

interface ProfileTabProps {
  language: Language;
  settings: LauncherSettings;
  userRole: string;
  userAvatar: string;
  userEmail: string;
  connected: boolean;
  totalOnline: number;
  friends: GlobalsFriend[];
  requests: string[];
  showToast: (text: string, type?: "info" | "error" | "success") => void;
  onRefresh: () => Promise<void>;
  onAvatarUpdated: (newB64: string) => void;
  onSignOut: () => void;
}

const TEXTS = {
  ru: {
    title: "Профиль",
    subtitle: "Ваш аккаунт, аватарка, список друзей и управление",
    connected: "В сети",
    disconnected: "Переподключение...",
    onlineTotal: "Всего онлайн",
    changeAvatar: "Сменить аватарку",
    avatarUpdated: "Аватарка обновлена!",
    logout: "Выйти",
    tabFriends: "Друзья",
    tabConsole: "Админ-консоль",
    addPlaceholder: "Логин или игровой ник Minecraft...",
    addBtn: "Добавить",
    incomingTitle: "Входящие заявки",
    friendsTitle: "Список друзей",
    noFriends: "Список друзей пока пуст",
    noFriendsHint: "Введите логин друга или его игровой ник Minecraft выше.",
    online: "В сети",
    offline: "Не в сети",
    inLauncher: "В лаунчере",
    mainMenu: "Главное меню",
    singleplayer: "Одиночная игра",
    accept: "Принять",
    reject: "Отклонить",
    remove: "Удалить",
    consoleHint: "Доступно только администраторам. Введите help для списка всех команд.",
    consolePlaceholder: "Введите команду (например: stats, users, ban <ник> 60, ipban <ник>, broadcast <текст>)...",
    errNotFound: "Игрок не найден",
    errSelf: "Нельзя добавить самого себя",
    errAlready: "Уже в списке друзей",
    errNetwork: "Нет соединения с сервером",
    reqSent: "Заявка отправлена",
    reqAccepted: "Заявка принята!",
    friendRemoved: "Удалён из друзей",
  },
  en: {
    title: "Profile",
    subtitle: "Your account, custom avatar, friends list & controls",
    connected: "Connected",
    disconnected: "Reconnecting...",
    onlineTotal: "Total Online",
    changeAvatar: "Change Avatar",
    avatarUpdated: "Avatar updated!",
    logout: "Sign Out",
    tabFriends: "Friends",
    tabConsole: "Admin Console",
    addPlaceholder: "Account login or Minecraft nickname...",
    addBtn: "Add",
    incomingTitle: "Incoming Requests",
    friendsTitle: "Friends",
    noFriends: "No friends yet",
    noFriendsHint: "Enter a friend's login or Minecraft nickname above.",
    online: "Online",
    offline: "Offline",
    inLauncher: "In Launcher",
    mainMenu: "Main Menu",
    singleplayer: "Singleplayer",
    accept: "Accept",
    reject: "Reject",
    remove: "Remove",
    consoleHint: "Administrators only. Type help to see all available commands.",
    consolePlaceholder: "Enter command (e.g. stats, users, ban <user> 60, ipban <user>, broadcast <msg>)...",
    errNotFound: "Player not found",
    errSelf: "You cannot add yourself",
    errAlready: "Already in your friends list",
    errNetwork: "Could not reach server",
    reqSent: "Friend request sent",
    reqAccepted: "Friend added!",
    friendRemoved: "Friend removed",
  },
  pl: {
    title: "Profil",
    subtitle: "Twoje konto, awatar, lista znajomych i zarządzanie",
    connected: "Połączono",
    disconnected: "Łączenie...",
    onlineTotal: "Online łącznie",
    changeAvatar: "Zmień awatar",
    avatarUpdated: "Awatar zaktualizowany!",
    logout: "Wyloguj",
    tabFriends: "Znajomi",
    tabConsole: "Konsola Admina",
    addPlaceholder: "Login konta lub nick Minecraft...",
    addBtn: "Dodaj",
    incomingTitle: "Zaproszenia",
    friendsTitle: "Lista znajomych",
    noFriends: "Brak znajomych",
    noFriendsHint: "Wpisz login znajomego lub jego nick Minecraft powyżej.",
    online: "Online",
    offline: "Offline",
    inLauncher: "W launcherze",
    mainMenu: "Menu główne",
    singleplayer: "Gra jednoosobowa",
    accept: "Akceptuj",
    reject: "Odrzuć",
    remove: "Usuń",
    consoleHint: "Tylko dla administratorów. Wpisz help aby zobaczyć komendy.",
    consolePlaceholder: "Wpisz komendę (np. stats, users, ban <gracz> 60, ipban <gracz>, broadcast <tekst>)...",
    errNotFound: "Nie znaleziono gracza",
    errSelf: "Nie możesz dodać siebie",
    errAlready: "Już na liście znajomych",
    errNetwork: "Brak połączenia z serwerem",
    reqSent: "Wysłano zaproszenie",
    reqAccepted: "Dodano znajomego!",
    friendRemoved: "Usunięto ze znajomych",
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
  connected,
  totalOnline,
  friends,
  requests,
  showToast,
  onRefresh,
  onAvatarUpdated,
  onSignOut,
}: ProfileTabProps) {
  const l = TEXTS[language];
  const isAdmin = userRole === "admin" || (settings.globalsLogin || "").toLowerCase() === "txmih";
  const [subTab, setSubTab] = useState<"friends" | "console">("friends");
  const [addInput, setAddInput] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  // Admin Console state
  const [cmdInput, setCmdInput] = useState("");
  const [cmdBusy, setCmdBusy] = useState(false);
  const [cmdLog, setCmdLog] = useState<{ cmd: string; output: string; ts: string }[]>([
    {
      cmd: "help",
      output: l.consoleHint,
      ts: new Date().toLocaleTimeString(),
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const apiBase = getBackendHttpBase();

  const apiPost = async (path: string, body: Record<string, unknown>) => {
    const res = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.globalsToken || ""}`,
      },
      body: JSON.stringify(body),
    });
    return await res.json();
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || avatarBusy) return;
    setAvatarBusy(true);
    try {
      const b64 = await resizeImageToPngBase64(file);
      const data = await apiPost("/api/profile/avatar", { data: b64 });
      if (!data.ok) {
        showToast(data.error || l.errNetwork, "error");
        return;
      }
      onAvatarUpdated(data.avatar || b64);
      showToast(l.avatarUpdated, "success");
    } catch {
      showToast(l.errNetwork, "error");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = addInput.trim();
    if (!clean || actionBusy) return;
    setActionBusy(true);
    try {
      const data = await apiPost("/api/friends/request", { name: clean });
      if (!data.ok) {
        const msg =
          data.error === "user_not_found"
            ? l.errNotFound
            : data.error === "cannot_add_self"
              ? l.errSelf
              : data.error === "already_friends"
                ? l.errAlready
                : data.error || l.errNetwork;
        showToast(msg, "error");
      } else {
        setAddInput("");
        showToast(data.status === "accepted" ? l.reqAccepted : `${l.reqSent}: ${clean}`, "success");
        await onRefresh();
      }
    } catch {
      showToast(l.errNetwork, "error");
    } finally {
      setActionBusy(false);
    }
  };

  const handleFriendAction = async (endpoint: string, name: string, toastMsg?: string) => {
    setActionBusy(true);
    try {
      await apiPost(endpoint, { name });
      if (toastMsg) showToast(toastMsg, "success");
      await onRefresh();
    } catch {
      showToast(l.errNetwork, "error");
    } finally {
      setActionBusy(false);
    }
  };

  const runAdminCommand = async (rawCommand: string) => {
    const command = rawCommand.trim();
    if (!command || cmdBusy) return;
    setCmdBusy(true);
    setCmdInput("");
    try {
      const data = await apiPost("/api/admin/command", { command });
      const out = data.ok ? String(data.output || "OK") : `Error: ${data.detail || data.error || "Forbidden"}`;
      setCmdLog((prev) => [
        ...prev.slice(-40),
        { cmd: command, output: out, ts: new Date().toLocaleTimeString() },
      ]);
    } catch {
      setCmdLog((prev) => [
        ...prev.slice(-40),
        { cmd: command, output: l.errNetwork, ts: new Date().toLocaleTimeString() },
      ]);
    } finally {
      setCmdBusy(false);
    }
  };

  const formatServerLabel = (f: GlobalsFriend) => {
    if (!f.online) return l.offline;
    if (f.server === "Launcher" || f.activity === "#launcher") return l.inLauncher;
    if (f.server === "Main Menu" || f.activity === "#menu") return l.mainMenu;
    if (f.server === "Singleplayer" || f.activity === "#sp") return l.singleplayer;
    return f.server || l.online;
  };

  const onlineFriendsCount = friends.filter((f) => f.online).length;

  return (
    <div className="mx-auto flex h-full w-full max-w-[920px] flex-col gap-5 pb-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">{l.title}</h2>
          <p className="mt-0.5 text-xs text-zinc-400">{l.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${
              connected
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 bg-white/[0.04] text-zinc-400"
            }`}
          >
            {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span>{connected ? l.connected : l.disconnected}</span>
            {totalOnline > 0 && (
              <span className="ml-1 border-l border-white/15 pl-1.5 text-zinc-300">
                {l.onlineTotal}: {totalOnline}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              await onRefresh();
              setRefreshing(false);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:bg-white/[0.09] hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Profile Identity Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#111217]/90 p-5 backdrop-blur-md">
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
            title={l.changeAvatar}
            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] transition hover:border-white/35"
          >
            {userAvatar ? (
              <img
                src={`data:image/png;base64,${userAvatar}`}
                alt={settings.globalsLogin || "Avatar"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-bold text-white">
                {(settings.globalsLogin || "F")[0].toUpperCase()}
              </div>
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
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">{settings.globalsLogin}</span>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-300">
                  <Crown className="h-3 w-3" />
                  ADMIN
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              {userEmail && <span>{userEmail}</span>}
              <span>·</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-zinc-300 underline-offset-2 transition hover:text-white hover:underline"
              >
                {l.changeAvatar}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-3.5 w-3.5" />
          {l.logout}
        </button>
      </div>

      {/* Sub-Tabs (Friends + Admin Console for Admins only) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSubTab("friends")}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition ${
            subTab === "friends"
              ? "border-white/25 bg-white text-black"
              : "border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07] hover:text-white"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          {l.tabFriends}
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] ${
              subTab === "friends" ? "bg-black/15 text-black" : "bg-white/10 text-zinc-300"
            }`}
          >
            {onlineFriendsCount}/{friends.length}
          </span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setSubTab("console")}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition ${
              subTab === "console"
                ? "border-amber-400/40 bg-amber-400/20 text-amber-200"
                : "border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            {l.tabConsole}
          </button>
        )}
      </div>

      {/* Sub-Tab 1: Friends */}
      {subTab === "friends" && (
        <div className="flex flex-col gap-4">
          {/* Add Friend Form */}
          <form onSubmit={handleAddFriend} className="flex items-center gap-2">
            <div className="relative flex-1">
              <UserPlus className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={addInput}
                onChange={(e) => setAddInput(e.target.value)}
                placeholder={l.addPlaceholder}
                className="w-full rounded-xl border border-white/[0.08] bg-[#111217]/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-white/25"
              />
            </div>
            <button
              type="submit"
              disabled={actionBusy || !addInput.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-45"
            >
              <Plus className="h-4 w-4" />
              {l.addBtn}
            </button>
          </form>

          {/* Incoming Friend Requests */}
          {requests.length > 0 && (
            <div className="rounded-2xl border border-white/[0.09] bg-[#111217]/90 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {l.incomingTitle} ({requests.length})
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {requests.map((req) => (
                  <div
                    key={req}
                    className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white">
                        {req[0]?.toUpperCase() || "?"}
                      </div>
                      <span className="text-sm font-semibold text-white">{req}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => handleFriendAction("/api/friends/accept", req, l.reqAccepted)}
                        title={l.accept}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 transition hover:bg-emerald-500/25"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => handleFriendAction("/api/friends/reject", req)}
                        title={l.reject}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/25 bg-red-500/10 text-red-300 transition hover:bg-red-500/20"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends List */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#111217]/90 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {l.friendsTitle} ({friends.length})
              </span>
            </div>

            {friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Users className="mb-2.5 h-8 w-8 text-zinc-600" />
                <div className="text-sm font-medium text-zinc-300">{l.noFriends}</div>
                <p className="mt-1 max-w-sm text-xs text-zinc-500">{l.noFriendsHint}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {friends.map((f) => {
                  const statusLabel = formatServerLabel(f);
                  return (
                    <div
                      key={f.name}
                      className="group flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 transition hover:border-white/[0.15] hover:bg-white/[0.045]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0">
                          {f.avatar ? (
                            <img
                              src={`data:image/png;base64,${f.avatar}`}
                              alt={f.name}
                              className="h-10 w-10 rounded-xl border border-white/10 object-cover"
                            />
                          ) : (
                            <img
                              src={`https://minotar.net/helm/${encodeURIComponent(f.nick || f.name)}/40.png`}
                              onError={(ev) => {
                                (ev.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                              alt={f.name}
                              className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.06] object-cover"
                            />
                          )}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#111217] ${
                              f.online ? "bg-emerald-400" : "bg-zinc-600"
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-white">{f.name}</span>
                            {f.nick && f.nick.toLowerCase() !== f.name.toLowerCase() && (
                              <span className="truncate rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-zinc-400">
                                {f.nick}
                              </span>
                            )}
                          </div>
                          <div
                            className={`mt-0.5 flex items-center gap-1 truncate text-xs ${
                              f.online ? "text-emerald-300/90" : "text-zinc-500"
                            }`}
                          >
                            {f.online && <Server className="h-3 w-3 shrink-0 opacity-75" />}
                            <span className="truncate">{statusLabel}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => handleFriendAction("/api/friends/remove", f.name, l.friendRemoved)}
                        title={l.remove}
                        className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 opacity-70 transition hover:bg-red-500/15 hover:text-red-300 hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Admin Console (Admins Only!) */}
      {subTab === "console" && isAdmin && (
        <div className="flex flex-1 flex-col gap-3 rounded-2xl border border-amber-400/20 bg-[#0d0e12]/95 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
              <Terminal className="h-4 w-4" />
              <span>FameVisuals Server Admin Console</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {["help", "stats", "users", "ipbans"].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  disabled={cmdBusy}
                  onClick={() => void runAdminCommand(quick)}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-zinc-300 transition hover:border-amber-400/35 hover:text-white"
                >
                  {quick}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[260px] overflow-y-auto rounded-xl border border-white/[0.06] bg-black/60 p-3 font-mono text-xs leading-relaxed">
            {cmdLog.map((entry, idx) => (
              <div key={idx} className="mb-3 last:mb-0">
                <div className="flex items-center gap-2 text-amber-300">
                  <span className="text-zinc-500">[{entry.ts}]</span>
                  <span>$ {entry.cmd}</span>
                </div>
                <pre className="mt-1 whitespace-pre-wrap break-words text-zinc-200">{entry.output}</pre>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runAdminCommand(cmdInput);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={cmdInput}
              onChange={(e) => setCmdInput(e.target.value)}
              placeholder={l.consolePlaceholder}
              className="flex-1 rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 font-mono text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-400/40"
            />
            <button
              type="submit"
              disabled={cmdBusy || !cmdInput.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-amber-300 disabled:opacity-45"
            >
              {cmdBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Run
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
