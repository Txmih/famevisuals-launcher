import React, { useState } from "react";
import {
  Check,
  Globe,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Server,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import type { GlobalsFriend, GlobalsOnlinePlayer, Language, LauncherSettings } from "./types";

export const DEFAULT_GLOBALS_SERVER = "162.35.56.235:5555";

interface FriendsTabProps {
  language: Language;
  settings: LauncherSettings;
  updateSettings: (patch: Partial<LauncherSettings>, debounceMs?: number) => void;
  showToast: (text: string, type?: "info" | "error" | "success") => void;
  connected: boolean;
  totalOnline: number;
  friends: GlobalsFriend[];
  requests: string[];
  onlinePlayers: GlobalsOnlinePlayer[];
  onRefresh: () => Promise<void>;
  onAuthChanged: (login: string | null, token: string | null) => void;
}

const TEXTS = {
  ru: {
    title: "Друзья Globals",
    subtitle: "Живой статус друзей, сервер игры и быстрое добавление по логину или нику Minecraft",
    connected: "Подключено",
    disconnected: "Нет соединения",
    serverPlaceholder: "162.35.56.235:5555",
    signIn: "Вход",
    register: "Регистрация",
    loginPlaceholder: "Логин (3–20 символов)",
    passwordPlaceholder: "Пароль (мин. 4 символа)",
    submitLogin: "Войти в Globals",
    submitRegister: "Создать аккаунт",
    authHint: "Единый аккаунт Globals — синхронизируется с модом FameVisuals.",
    logout: "Выйти",
    addPlaceholder: "Логин Globals или ник Minecraft...",
    addBtn: "Добавить",
    incomingTitle: "Входящие заявки",
    friendsTitle: "Список друзей",
    discoverTitle: "Игроки с FameVisuals онлайн",
    sameServerTag: "На одном сервере",
    noFriends: "Список друзей пока пуст",
    noFriendsHint: "Введите логин Globals или игровой ник Minecraft выше, либо добавьте игрока из списка ниже.",
    online: "В сети",
    offline: "Не в сети",
    inLauncher: "В лаунчере",
    mainMenu: "Главное меню",
    singleplayer: "Одиночная игра",
    accept: "Принять",
    reject: "Отклонить",
    remove: "Удалить",
    errBadInput: "Некорректный логин (3–20 лат. символов) или пароль (мин. 4)",
    errTaken: "Этот логин уже занят",
    errWrong: "Неверный логин или пароль",
    errBanned: "Аккаунт заблокирован",
    errNotFound: "Игрок с таким логином или ником не найден",
    errSelf: "Нельзя добавить самого себя",
    errAlready: "Этот игрок уже у вас в друзьях",
    errNetwork: "Не удалось подключиться к серверу Globals",
    reqSent: "Заявка отправлена",
    reqAccepted: "Заявка принята!",
    friendRemoved: "Удалён из друзей",
  },
  en: {
    title: "Globals Friends",
    subtitle: "Real-time friend status, current server & quick add by Globals login or Minecraft nick",
    connected: "Connected",
    disconnected: "Disconnected",
    serverPlaceholder: "162.35.56.235:5555",
    signIn: "Sign In",
    register: "Register",
    loginPlaceholder: "Username (3-20 chars)",
    passwordPlaceholder: "Password (min 4 chars)",
    submitLogin: "Sign In to Globals",
    submitRegister: "Create Account",
    authHint: "Shared Globals account synced with your FameVisuals Minecraft client.",
    logout: "Sign out",
    addPlaceholder: "Globals login or Minecraft nick...",
    addBtn: "Add",
    incomingTitle: "Incoming Requests",
    friendsTitle: "Friends",
    discoverTitle: "FameVisuals Players Online",
    sameServerTag: "Same Server",
    noFriends: "No friends yet",
    noFriendsHint: "Enter a Globals login or Minecraft nickname above, or quick-add from online players below.",
    online: "Online",
    offline: "Offline",
    inLauncher: "In Launcher",
    mainMenu: "Main Menu",
    singleplayer: "Singleplayer",
    accept: "Accept",
    reject: "Reject",
    remove: "Remove",
    errBadInput: "Invalid username (3-20 chars) or password (min 4)",
    errTaken: "Username is already taken",
    errWrong: "Wrong username or password",
    errBanned: "Account is banned",
    errNotFound: "Player with this login or nickname not found",
    errSelf: "You cannot add yourself",
    errAlready: "Already in your friends list",
    errNetwork: "Could not reach Globals server",
    reqSent: "Friend request sent",
    reqAccepted: "Friend added!",
    friendRemoved: "Friend removed",
  },
  pl: {
    title: "Znajomi Globals",
    subtitle: "Status znajomych na żywo, serwer gry i dodawanie po loginie lub nicku Minecraft",
    connected: "Połączono",
    disconnected: "Rozłączono",
    serverPlaceholder: "162.35.56.235:5555",
    signIn: "Logowanie",
    register: "Rejestracja",
    loginPlaceholder: "Login (3-20 znaków)",
    passwordPlaceholder: "Hasło (min. 4 znaki)",
    submitLogin: "Zaloguj do Globals",
    submitRegister: "Utwórz konto",
    authHint: "Jedno konto Globals zsynchronizowane z klientem FameVisuals.",
    logout: "Wyloguj",
    addPlaceholder: "Login Globals lub nick Minecraft...",
    addBtn: "Dodaj",
    incomingTitle: "Zaproszenia",
    friendsTitle: "Lista znajomych",
    discoverTitle: "Gracze FameVisuals online",
    sameServerTag: "Ten sam serwer",
    noFriends: "Brak znajomych",
    noFriendsHint: "Wpisz login Globals lub nick Minecraft powyżej, albo dodaj gracza z listy poniżej.",
    online: "Online",
    offline: "Offline",
    inLauncher: "W launcherze",
    mainMenu: "Menu główne",
    singleplayer: "Gra jednoosobowa",
    accept: "Akceptuj",
    reject: "Odrzuć",
    remove: "Usuń",
    errBadInput: "Nieprawidłowy login (3-20 znaków) lub hasło (min. 4)",
    errTaken: "Ten login jest już zajęty",
    errWrong: "Nieprawidłowy login lub hasło",
    errBanned: "Konto zostało zablokowane",
    errNotFound: "Nie znaleziono gracza o takim loginie lub nicku",
    errSelf: "Nie możesz dodać siebie",
    errAlready: "Ten gracz jest już znajomym",
    errNetwork: "Nie można połączyć z serwerem Globals",
    reqSent: "Wysłano zaproszenie",
    reqAccepted: "Dodano znajomego!",
    friendRemoved: "Usunięto ze znajomych",
  },
};

export function resolveGlobalsServer(raw?: string | null): string {
  const trimmed = (raw || "").trim();
  if (!trimmed || trimmed.startsWith("YOUR_VPS_IP") || trimmed === "127.0.0.1:5555") {
    return DEFAULT_GLOBALS_SERVER;
  }
  return trimmed;
}

export function normalizeGlobalsHttpBase(raw?: string | null): string {
  const trimmed = resolveGlobalsServer(raw).replace(/\/+$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `http://${trimmed}`;
}

export function normalizeGlobalsWsUrl(raw?: string | null): string {
  const httpBase = normalizeGlobalsHttpBase(raw);
  if (httpBase.startsWith("https://")) {
    return httpBase.replace(/^https:\/\//, "wss://") + "/ws";
  }
  return httpBase.replace(/^http:\/\//, "ws://") + "/ws";
}

export function FriendsTab({
  language,
  settings,
  updateSettings,
  showToast,
  connected,
  totalOnline,
  friends,
  requests,
  onlinePlayers,
  onRefresh,
  onAuthChanged,
}: FriendsTabProps) {
  const l = TEXTS[language];
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginInput, setLoginInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const [addInput, setAddInput] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isSignedIn = Boolean(settings.globalsLogin && settings.globalsToken);
  const serverAddr = resolveGlobalsServer(settings.globalsServer);
  const apiBase = normalizeGlobalsHttpBase(serverAddr);

  const mapError = (code?: string) => {
    switch (code) {
      case "bad_input":
        return l.errBadInput;
      case "taken":
        return l.errTaken;
      case "wrong":
        return l.errWrong;
      case "banned":
        return l.errBanned;
      case "user_not_found":
        return l.errNotFound;
      case "cannot_add_self":
        return l.errSelf;
      case "already_friends":
        return l.errAlready;
      default:
        return code || l.errNetwork;
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authBusy) return;
    setAuthBusy(true);
    try {
      const endpoint = authMode === "register" ? "/api/register" : "/api/login";
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: loginInput.trim(),
          password: passwordInput,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        showToast(mapError(data.error), "error");
        return;
      }
      onAuthChanged(data.login, data.token);
      setPasswordInput("");
      showToast(`${data.login} — ${l.connected}`, "success");
    } catch {
      showToast(l.errNetwork, "error");
    } finally {
      setAuthBusy(false);
    }
  };

  const apiPostAuthed = async (path: string, body: Record<string, unknown>) => {
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

  const sendFriendRequestByName = async (target: string) => {
    const clean = target.trim();
    if (!clean || actionBusy) return;
    setActionBusy(true);
    try {
      const data = await apiPostAuthed("/api/friends/request", { name: clean });
      if (!data.ok) {
        showToast(mapError(data.error), "error");
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

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendFriendRequestByName(addInput);
  };

  const handleAccept = async (name: string) => {
    setActionBusy(true);
    try {
      await apiPostAuthed("/api/friends/accept", { name });
      showToast(l.reqAccepted, "success");
      await onRefresh();
    } catch {
      showToast(l.errNetwork, "error");
    } finally {
      setActionBusy(false);
    }
  };

  const handleReject = async (name: string) => {
    setActionBusy(true);
    try {
      await apiPostAuthed("/api/friends/reject", { name });
      await onRefresh();
    } catch {
      showToast(l.errNetwork, "error");
    } finally {
      setActionBusy(false);
    }
  };

  const handleRemove = async (name: string) => {
    setActionBusy(true);
    try {
      await apiPostAuthed("/api/friends/remove", { name });
      showToast(l.friendRemoved, "info");
      await onRefresh();
    } catch {
      showToast(l.errNetwork, "error");
    } finally {
      setActionBusy(false);
    }
  };

  const formatServerStatus = (online: boolean, server: string, activity: string, anarchy?: string) => {
    if (!online) return l.offline;
    if (server === "Singleplayer" || activity === "#sp") return l.singleplayer;
    if (server === "Main Menu" || activity === "#menu") return l.mainMenu;
    if (server === "Launcher" || activity === "#launcher") return l.inLauncher;
    if (server) return anarchy ? `${server} (${anarchy})` : server;
    return l.online;
  };

  const onlineFriendsCount = friends.filter((f) => f.online).length;

  return (
    <div key="friends" className="tab-fade space-y-4">
      {/* Header matching Launcher monochrome glass aesthetic */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">{l.title}</h2>
          <p className="text-xs text-zinc-400">{l.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#12141c] px-3 py-1.5 text-[11px]">
            {connected ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-zinc-500" />
            )}
            <span className={connected ? "font-medium text-emerald-300" : "text-zinc-400"}>
              {connected ? `${l.connected} · ${totalOnline}` : l.disconnected}
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#0e1017] px-2.5 py-1.5">
            <Globe className="h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={serverAddr}
              onChange={(e) => updateSettings({ globalsServer: e.target.value }, 400)}
              placeholder={l.serverPlaceholder}
              className="w-36 bg-transparent font-mono text-[11px] text-zinc-200 outline-none placeholder:text-zinc-600"
            />
          </div>

          {isSignedIn && (
            <>
              <button
                type="button"
                onClick={async () => {
                  setRefreshing(true);
                  await onRefresh();
                  setRefreshing(false);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#12141c] px-2.5 py-1.5 text-xs text-zinc-200 transition hover:bg-white/[0.08]"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => onAuthChanged(null, null)}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.09] bg-[#141720] px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-rose-500/35 hover:bg-rose-500/15 hover:text-rose-200"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{l.logout}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Login / Register Card */}
      {!isSignedIn ? (
        <div className="fame-surface mx-auto max-w-md space-y-4 rounded-2xl p-6">
          <div className="flex rounded-xl border border-white/[0.07] bg-[#0a0b0f] p-1">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                authMode === "login"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {l.signIn}
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("register")}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                authMode === "register"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {l.register}
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3">
            <input
              type="text"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              placeholder={l.loginPlaceholder}
              required
              minLength={3}
              maxLength={20}
              className="w-full rounded-xl border border-white/[0.08] bg-[#0a0b0f] px-3.5 py-2.5 text-xs text-white outline-none transition focus:border-white/30"
            />
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder={l.passwordPlaceholder}
              required
              minLength={4}
              className="w-full rounded-xl border border-white/[0.08] bg-[#0a0b0f] px-3.5 py-2.5 text-xs text-white outline-none transition focus:border-white/30"
            />
            <button
              type="submit"
              disabled={authBusy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-60"
            >
              {authBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{authMode === "register" ? l.submitRegister : l.submitLogin}</span>
            </button>
          </form>

          <p className="text-center text-[11px] text-zinc-500">{l.authHint}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Account & Add Friend (by Globals login OR MC nickname) */}
          <div className="fame-surface flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.06] text-sm font-bold text-white">
                {(settings.globalsLogin || "?").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{settings.globalsLogin}</span>
                  <span className="rounded-full border border-emerald-500/25 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    {onlineFriendsCount}/{friends.length} {l.online}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-zinc-500">{serverAddr}</span>
              </div>
            </div>

            <form onSubmit={handleAddFriend} className="flex items-center gap-2">
              <input
                type="text"
                value={addInput}
                onChange={(e) => setAddInput(e.target.value)}
                placeholder={l.addPlaceholder}
                className="w-56 rounded-xl border border-white/[0.08] bg-[#0a0b0f] px-3 py-2 text-xs text-white outline-none transition focus:border-white/30"
              />
              <button
                type="submit"
                disabled={actionBusy || !addInput.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>{l.addBtn}</span>
              </button>
            </form>
          </div>

          {/* Incoming Friend Requests */}
          {requests.length > 0 && (
            <div className="fame-surface space-y-2.5 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-100">
                <UserPlus className="h-4 w-4 text-amber-300" />
                <span>
                  {l.incomingTitle} ({requests.length})
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {requests.map((req) => (
                  <div
                    key={req}
                    className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-[#0a0b0f] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.06] text-xs font-bold text-white">
                        {req.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-white">{req}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => void handleAccept(req)}
                        title={l.accept}
                        className="flex h-7 items-center gap-1 rounded-lg bg-white px-2.5 text-[11px] font-semibold text-zinc-950 transition hover:bg-zinc-200"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>{l.accept}</span>
                      </button>
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => void handleReject(req)}
                        title={l.reject}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-300 transition hover:bg-rose-500/20 hover:text-rose-200"
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
          <div className="fame-surface space-y-3 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Users className="h-4 w-4 text-zinc-400" />
              <span>
                {l.friendsTitle} ({friends.length})
              </span>
            </div>

            {friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="mb-2 h-7 w-7 text-zinc-600" />
                <p className="text-sm font-semibold text-zinc-300">{l.noFriends}</p>
                <p className="mt-1 max-w-md text-xs text-zinc-500">{l.noFriendsHint}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {friends.map((friend) => {
                  const statusLabel = formatServerStatus(
                    friend.online,
                    friend.server,
                    friend.activity,
                    friend.anarchy
                  );
                  const avatarKey = friend.nick || friend.name;
                  return (
                    <div
                      key={friend.name}
                      className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-[#0a0b0f] p-3 transition hover:border-white/[0.15]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative h-9 w-9 shrink-0">
                          <img
                            src={`https://mc-heads.net/avatar/${encodeURIComponent(avatarKey)}/48`}
                            alt={friend.name}
                            className="h-9 w-9 rounded-lg border border-white/10 bg-[#141722] object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a0b0f] ${
                              friend.online ? "bg-emerald-400" : "bg-zinc-600"
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-bold text-white">
                              {friend.name}
                            </span>
                            {friend.nick &&
                              friend.nick.toLowerCase() !== friend.name.toLowerCase() && (
                                <span className="truncate rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                                  {friend.nick}
                                </span>
                              )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 text-[11px]">
                            {friend.online ? (
                              <>
                                <Server className="h-3 w-3 shrink-0 text-emerald-400" />
                                <span className="truncate font-medium text-emerald-300">
                                  {statusLabel}
                                </span>
                              </>
                            ) : (
                              <span className="text-zinc-500">{l.offline}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => void handleRemove(friend.name)}
                        title={l.remove}
                        className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-rose-500/15 hover:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick-Add Online FameVisuals Players (1-click +) */}
          {onlinePlayers.length > 0 && (
            <div className="fame-surface space-y-3 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <Sparkles className="h-4 w-4 text-zinc-400" />
                <span>
                  {l.discoverTitle} ({onlinePlayers.length})
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {onlinePlayers.map((p) => {
                  const statusLabel = formatServerStatus(true, p.server, p.activity);
                  const avatarKey = p.nick || p.login;
                  return (
                    <div
                      key={p.login}
                      className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-[#0a0b0f] px-3 py-2.5 transition hover:border-white/[0.15]"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="relative h-8 w-8 shrink-0">
                          <img
                            src={`https://mc-heads.net/avatar/${encodeURIComponent(avatarKey)}/48`}
                            alt={p.login}
                            className="h-8 w-8 rounded-lg border border-white/10 bg-[#141722] object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a0b0f] bg-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-semibold text-white">
                              {p.login}
                            </span>
                            {p.nick && p.nick.toLowerCase() !== p.login.toLowerCase() && (
                              <span className="truncate rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                                {p.nick}
                              </span>
                            )}
                            {p.same_server && (
                              <span className="rounded bg-white/[0.1] px-1.5 py-0.5 text-[9px] font-semibold text-zinc-100">
                                {l.sameServerTag}
                              </span>
                            )}
                          </div>
                          <span className="block truncate text-[11px] text-zinc-400">
                            {statusLabel}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => void sendFriendRequestByName(p.login)}
                        title={l.addBtn}
                        className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
