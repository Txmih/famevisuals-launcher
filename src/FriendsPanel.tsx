import React, { useState } from "react";
import {
  Check,
  Plus,
  RefreshCw,
  Server,
  Trash2,
  User,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { getBackendHttpBase } from "./globalsEndpoint";
import type { GlobalsFriend, Language, LauncherSettings } from "./types";

interface FriendsPanelProps {
  language: Language;
  settings: LauncherSettings;
  connected: boolean;
  totalOnline: number;
  friends: GlobalsFriend[];
  requests: string[];
  showToast: (text: string, type?: "info" | "error" | "success") => void;
  onRefresh: () => Promise<void>;
}

const TEXTS = {
  ru: {
    title: "Друзья",
    subtitle: "Отслеживайте онлайн друзей, их текущий сервер и добавляйте по логину или нику Minecraft",
    connected: "В сети",
    disconnected: "Переподключение...",
    onlineTotal: "Всего онлайн",
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
    errNotFound: "Игрок не найден",
    errSelf: "Нельзя добавить самого себя",
    errAlready: "Уже в списке друзей",
    errNetwork: "Нет соединения с сервером",
    reqSent: "Заявка отправлена",
    reqAccepted: "Заявка принята!",
    friendRemoved: "Удалён из друзей",
  },
  en: {
    title: "Friends",
    subtitle: "Track friends online, see their active server & add by account login or Minecraft nick",
    connected: "Connected",
    disconnected: "Reconnecting...",
    onlineTotal: "Total Online",
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
    errNotFound: "Player not found",
    errSelf: "You cannot add yourself",
    errAlready: "Already in your friends list",
    errNetwork: "Could not reach server",
    reqSent: "Friend request sent",
    reqAccepted: "Friend added!",
    friendRemoved: "Friend removed",
  },
  pl: {
    title: "Znajomi",
    subtitle: "Sprawdzaj status znajomych, aktywny serwer i dodawaj po loginie lub nicku Minecraft",
    connected: "Połączono",
    disconnected: "Łączenie...",
    onlineTotal: "Online łącznie",
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
    errNotFound: "Nie znaleziono gracza",
    errSelf: "Nie możesz dodać siebie",
    errAlready: "Już na liście znajomych",
    errNetwork: "Brak połączenia z serwerem",
    reqSent: "Wysłano zaproszenie",
    reqAccepted: "Dodano znajomego!",
    friendRemoved: "Usunięto ze znajomych",
  },
};

export function FriendsPanel({
  language,
  settings,
  connected,
  totalOnline,
  friends,
  requests,
  showToast,
  onRefresh,
}: FriendsPanelProps) {
  const l = TEXTS[language];
  const [addInput, setAddInput] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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

  const formatServerLabel = (f: GlobalsFriend) => {
    if (!f.online) return l.offline;
    if (f.server === "Launcher" || f.activity === "#launcher") return l.inLauncher;
    if (f.server === "Main Menu" || f.activity === "#menu") return l.mainMenu;
    if (f.server === "Singleplayer" || f.activity === "#sp") return l.singleplayer;
    return f.server || l.online;
  };

  const onlineCount = friends.filter((f) => f.online).length;

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
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {l.incomingTitle} ({requests.length})
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {requests.map((req) => (
              <div
                key={req}
                className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-zinc-300">
                    <User className="h-4 w-4" />
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
            {l.friendsTitle} ({onlineCount}/{friends.length})
          </span>
        </div>

        {friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
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
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-800/80 text-zinc-400">
                      {f.avatar ? (
                        <img
                          src={`data:image/png;base64,${f.avatar}`}
                          alt={f.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5" />
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
  );
}
