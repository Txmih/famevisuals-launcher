import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Crown,
  LogOut,
  MapPin,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
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
import type {
  GlobalsFriend,
  Language,
  LauncherSettings,
  PartyInvite,
  PartyState,
} from "./types";

interface FriendsPanelProps {
  language: Language;
  settings: LauncherSettings;
  connected: boolean;
  totalOnline: number;
  friends: GlobalsFriend[];
  requests: string[];
  party: PartyState | null;
  partyInvites: PartyInvite[];
  showToast: (text: string, type?: "info" | "error" | "success") => void;
  onRefresh: () => Promise<void>;
  onPartyUpdated: (party: PartyState | null, invites: PartyInvite[]) => void;
}

const TEXTS = {
  ru: {
    title: "Друзья и Пати",
    subtitle: "Отслеживайте онлайн друзей, собирайте пати и общайтесь в Пати-чате с координатами",
    tabFriends: "Друзья",
    tabParty: "Пати-чат",
    connected: "В сети",
    disconnected: "Переподключение...",
    onlineTotal: "Всего онлайн",
    addPlaceholder: "Логин или игровой ник Minecraft...",
    addBtn: "Добавить",
    partyInvitePlaceholder: "Пригласить в пати (логин или ник MC)...",
    partyInviteBtn: "В пати",
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
    title: "Friends & Party",
    subtitle: "Track friends online, form a party & chat in real-time Party Chat with coordinates",
    tabFriends: "Friends",
    tabParty: "Party Chat",
    connected: "Connected",
    disconnected: "Reconnecting...",
    onlineTotal: "Total Online",
    addPlaceholder: "Account login or Minecraft nickname...",
    addBtn: "Add",
    partyInvitePlaceholder: "Invite to party (login or MC nick)...",
    partyInviteBtn: "Invite",
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
    title: "Znajomi i Party",
    subtitle: "Sprawdzaj znajomych online, twórz party i rozmawiaj na czacie party",
    tabFriends: "Znajomi",
    tabParty: "Czat Party",
    connected: "Połączono",
    disconnected: "Łączenie...",
    onlineTotal: "Online łącznie",
    addPlaceholder: "Login konta lub nick Minecraft...",
    addBtn: "Dodaj",
    partyInvitePlaceholder: "Zaproś do party (login lub nick MC)...",
    partyInviteBtn: "Zaproś",
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
  party,
  partyInvites,
  showToast,
  onRefresh,
  onPartyUpdated,
}: FriendsPanelProps) {
  const l = TEXTS[language];
  const [subTab, setSubTab] = useState<"friends" | "party">("friends");
  const [addInput, setAddInput] = useState("");
  const [partyInviteInput, setPartyInviteInput] = useState("");
  const [partyChatInput, setPartyChatInput] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const apiBase = getBackendHttpBase();

  useEffect(() => {
    if (subTab === "party") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [party?.messages?.length, subTab]);

  const apiPost = async (path: string, body: Record<string, unknown> = {}) => {
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

  const handleInviteToParty = async (target: string) => {
    const clean = target.trim();
    if (!clean || actionBusy) return;
    setActionBusy(true);
    try {
      const data = await apiPost("/api/party/invite", { name: clean });
      if (!data.ok) {
        const msg =
          data.error === "user_not_found"
            ? l.errNotFound
            : data.error === "not_leader"
              ? "Только лидер пати может приглашать"
              : data.error === "already_in_party"
                ? "Игрок уже в пати"
                : data.error || l.errNetwork;
        showToast(msg, "error");
      } else {
        setPartyInviteInput("");
        onPartyUpdated(data.party || null, data.invites || []);
        showToast(`Приглашение в пати отправлено: ${data.target || clean}`, "success");
      }
    } catch {
      showToast(l.errNetwork, "error");
    } finally {
      setActionBusy(false);
    }
  };

  const handlePartyAction = async (endpoint: string, body: Record<string, unknown> = {}) => {
    setActionBusy(true);
    try {
      const data = await apiPost(endpoint, body);
      onPartyUpdated(data.party ?? null, data.invites ?? []);
      if (!data.ok && data.error) {
        showToast(String(data.error), "error");
      }
    } catch {
      showToast(l.errNetwork, "error");
    } finally {
      setActionBusy(false);
    }
  };

  const handleSendPartyChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = partyChatInput.trim();
    if (!clean || actionBusy) return;
    setPartyChatInput("");
    try {
      const data = await apiPost("/api/party/chat", { text: clean });
      if (!data.ok && data.error) {
        showToast(String(data.error), "error");
      }
    } catch {
      showToast(l.errNetwork, "error");
    }
  };

  const formatServerLabel = (f: GlobalsFriend) => {
    if (!f.online) return l.offline;
    if (f.server === "Hidden") return "Инкогнито";
    if (f.server === "Launcher" || f.activity === "#launcher") return l.inLauncher;
    if (f.server === "Main Menu" || f.activity === "#menu") return l.mainMenu;
    if (f.server === "Singleplayer" || f.activity === "#sp") return l.singleplayer;
    return f.server || l.online;
  };

  const onlineCount = friends.filter((f) => f.online).length;
  const iAmPartyLeader =
    Boolean(party) &&
    party!.leader.toLowerCase() === (settings.globalsLogin || "").toLowerCase();

  return (
    <div className="mx-auto flex h-full w-full max-w-[940px] flex-col gap-4 pb-6">
      {/* Header + Sub-Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">{l.title}</h2>
          <p className="mt-0.5 text-xs text-zinc-400">{l.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-[#111217]/90 p-1">
            <button
              type="button"
              onClick={() => setSubTab("friends")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                subTab === "friends"
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              {l.tabFriends}
            </button>
            <button
              type="button"
              onClick={() => setSubTab("party")}
              className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                subTab === "party"
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {l.tabParty}
              {(party || partyInvites.length > 0) && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    subTab === "party"
                      ? "bg-black/15 text-black"
                      : partyInvites.length > 0
                        ? "bg-amber-400 text-black"
                        : "bg-emerald-500/25 text-emerald-300"
                  }`}
                >
                  {partyInvites.length > 0 ? partyInvites.length : party?.members.length}
                </span>
              )}
            </button>
          </div>

          <div
            className={`hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium sm:inline-flex ${
              connected
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 bg-white/[0.04] text-zinc-400"
            }`}
          >
            {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span>{totalOnline > 0 ? `${l.onlineTotal}: ${totalOnline}` : connected ? l.connected : l.disconnected}</span>
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

      {/* Pending Party Invites Banner (always visible across both sub-tabs!) */}
      {partyInvites.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-400/30 bg-sky-500/[0.08] px-4 py-2.5">
          <div className="text-xs font-medium text-white">
            Приглашение в пати от{" "}
            <span className="font-bold text-sky-300">
              {partyInvites[0].from}
              {partyInvites[0].from_nick ? ` (${partyInvites[0].from_nick})` : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => {
                void handlePartyAction("/api/party/accept", {
                  party_id: partyInvites[0].party_id,
                });
                setSubTab("party");
              }}
              className="rounded-lg bg-emerald-400 px-3 py-1 text-xs font-bold text-black hover:bg-emerald-300"
            >
              {l.accept}
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() =>
                void handlePartyAction("/api/party/decline", {
                  party_id: partyInvites[0].party_id,
                })
              }
              className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-medium text-zinc-300 hover:text-white"
            >
              {l.reject}
            </button>
          </div>
        </div>
      )}

      {subTab === "friends" ? (
        <>
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
                            <span className="truncate text-sm font-semibold text-white">
                              {f.name}
                            </span>
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

                      <div className="ml-2 flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => void handleInviteToParty(f.name)}
                          title="Пригласить в пати"
                          className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                        >
                          +Пати
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() =>
                            handleFriendAction("/api/friends/remove", f.name, l.friendRemoved)
                          }
                          title={l.remove}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 opacity-70 transition hover:bg-red-500/15 hover:text-red-300 hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Party & Party Chat View */
        <div className="flex flex-1 flex-col gap-3">
          {/* Invite anyone to party */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleInviteToParty(partyInviteInput);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <UserPlus className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={partyInviteInput}
                onChange={(e) => setPartyInviteInput(e.target.value)}
                placeholder={l.partyInvitePlaceholder}
                className="w-full rounded-xl border border-white/[0.08] bg-[#111217]/90 py-2 pl-10 pr-4 text-xs text-white placeholder-zinc-500 outline-none focus:border-white/25"
              />
            </div>
            <button
              type="submit"
              disabled={actionBusy || !partyInviteInput.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-45"
            >
              <Plus className="h-3.5 w-3.5" />
              {l.partyInviteBtn}
            </button>
          </form>

          {!party ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#111217]/90 py-14 text-center">
              <Users className="mb-3 h-9 w-9 text-zinc-600" />
              <div className="text-sm font-semibold text-zinc-200">Вы пока не в пати</div>
              <p className="mt-1 max-w-md text-xs text-zinc-500">
                Пригласите друга или любого игрока по логину / нику Minecraft выше — откроется
                общий Пати-чат (с поддержкой /coords в игре) и общие метки.
              </p>
            </div>
          ) : (
            <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
              {/* Party Members Column */}
              <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#111217]/90 p-3.5">
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Участники ({party.members.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {party.members.map((m) => (
                      <div
                        key={m.login}
                        className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-800 text-zinc-400">
                            {m.avatar ? (
                              <img
                                src={`data:image/png;base64,${m.avatar}`}
                                alt={m.login}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#111217] ${
                                m.online ? "bg-emerald-400" : "bg-zinc-600"
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 text-xs font-semibold text-white">
                              <span className="truncate">{m.login}</span>
                              {m.is_leader && <Crown className="h-3 w-3 shrink-0 text-amber-300" />}
                            </div>
                            <div className="truncate text-[10px] text-zinc-400">
                              {m.nick ? `MC: ${m.nick}` : m.online ? m.server || "Online" : "Offline"}
                            </div>
                          </div>
                        </div>

                        {iAmPartyLeader && !m.is_leader && (
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() =>
                              void handlePartyAction("/api/party/kick", { name: m.login })
                            }
                            title="Исключить"
                            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-red-500/15 hover:text-red-300"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handlePartyAction("/api/party/leave")}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/10 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Выйти из пати
                </button>
              </div>

              {/* Party Chat Column */}
              <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#111217]/90 p-3.5 md:col-span-2">
                <div className="mb-2 flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-xs font-semibold text-white">Пати-чат</span>
                  <span className="text-[10px] text-zinc-500">
                    В Minecraft: введите /coords чтобы поделиться координатами
                  </span>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto pr-1" style={{ maxHeight: 280 }}>
                  {party.messages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-zinc-500">
                      Сообщений пока нет. Напишите что-нибудь участникам пати!
                    </div>
                  ) : (
                    party.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={
                          msg.system
                            ? "py-0.5 text-center text-[11px] text-zinc-500"
                            : "rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-2"
                        }
                      >
                        {msg.system ? (
                          <span>{msg.text}</span>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-sky-300">
                                {msg.author}
                                {msg.nick && msg.nick.toLowerCase() !== msg.author.toLowerCase()
                                  ? ` (${msg.nick})`
                                  : ""}
                              </span>
                            </div>
                            {msg.coords ? (
                              <div className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-500/15 px-2.5 py-1 font-mono text-xs font-semibold text-sky-200">
                                <MapPin className="h-3.5 w-3.5 text-sky-300" />
                                <span>
                                  X: {msg.coords.x}, Y: {msg.coords.y}, Z: {msg.coords.z}
                                  {msg.coords.dim ? ` · ${msg.coords.dim}` : ""}
                                </span>
                              </div>
                            ) : (
                              <div className="mt-0.5 break-words text-xs text-zinc-200">
                                {msg.text}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendPartyChat} className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={partyChatInput}
                    onChange={(e) => setPartyChatInput(e.target.value)}
                    placeholder="Написать в пати-чат..."
                    className="flex-1 rounded-xl border border-white/[0.08] bg-black/45 px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-white/25"
                  />
                  <button
                    type="submit"
                    disabled={!partyChatInput.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-45"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Отпр.
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
