import React, { useCallback, useEffect, useState } from "react";
import {
  Ban,
  Cpu,
  Crown,
  KeyRound,
  Loader2,
  Megaphone,
  MicOff,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  UserCheck,
  UserX,
  Volume2,
} from "lucide-react";
import { getBackendHttpBase } from "./globalsEndpoint";
import type { AdminUserRecord, Language, LauncherSettings } from "./types";

interface AdminPanelProps {
  language: Language;
  settings: LauncherSettings;
  showToast: (text: string, type?: "info" | "error" | "success") => void;
}

interface AdminStats {
  online: number;
  guests: number;
  total_users: number;
  banned_users: number;
  ip_bans: number;
  uptime_sec: number;
}

export function AdminPanel({ settings, showToast }: AdminPanelProps) {
  const [subView, setSubView] = useState<"players" | "console">("players");
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    online: 0,
    guests: 0,
    total_users: 0,
    banned_users: 0,
    ip_bans: 0,
    uptime_sec: 0,
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "sub" | "banned" | "muted">("all");
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [broadcastText, setBroadcastText] = useState("");

  // Console state
  const [cmdInput, setCmdInput] = useState("");
  const [cmdBusy, setCmdBusy] = useState(false);
  const [cmdLog, setCmdLog] = useState<{ cmd: string; output: string; ts: string }[]>([
    {
      cmd: "help",
      output:
        "Команды: givesub <ник> <30d|365d|lifetime>, takesub <ник>, resethwid <ник>, ban, unban, ipban, mute, unmute, kick, setrole, whois, broadcast.",
      ts: new Date().toLocaleTimeString(),
    },
  ]);

  const apiBase = getBackendHttpBase();

  const fetchUsers = useCallback(async () => {
    if (!settings.globalsToken) return;
    setLoading(true);
    try {
      const url = `${apiBase}/api/admin/users?q=${encodeURIComponent(search.trim())}&filter=${filter}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${settings.globalsToken}` },
      });
      if (!res.ok) {
        showToast("Нет доступа администратора", "error");
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setUsers(data.users || []);
        if (data.stats) setStats(data.stats);
      }
    } catch {
      showToast("Не удалось загрузить список игроков", "error");
    } finally {
      setLoading(false);
    }
  }, [apiBase, filter, search, settings.globalsToken, showToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchUsers();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [fetchUsers]);

  const runCmd = async (command: string, refreshAfter = true) => {
    const clean = command.trim();
    if (!clean) return;
    setBusyKey(clean);
    try {
      const res = await fetch(`${apiBase}/api/admin/command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.globalsToken || ""}`,
        },
        body: JSON.stringify({ command: clean }),
      });
      const data = await res.json();
      const out = data.ok ? String(data.output || "OK") : String(data.detail || data.error || "Ошибка");
      setCmdLog((prev) => [
        ...prev.slice(-40),
        { cmd: clean, output: out, ts: new Date().toLocaleTimeString() },
      ]);
      showToast(out.split("\n")[0], data.ok ? "success" : "error");
      if (refreshAfter) {
        await fetchUsers();
      }
    } catch {
      showToast("Ошибка соединения с сервером", "error");
    } finally {
      setBusyKey(null);
    }
  };

  const formatUptime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}ч ${m}м`;
  };

  const formatSubBadge = (u: AdminUserRecord) => {
    if (!u.sub_active) return null;
    if (u.sub_until === -1) return "SUB: ∞";
    const days = Math.max(1, Math.ceil(((u.sub_until || 0) - Date.now()) / 86_400_000));
    return `SUB: ${days}д`;
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-[960px] flex-col gap-4 pb-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">Управление игроками</h2>
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-300">
              <Crown className="h-3 w-3" />
              ADMIN
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Выдача подписок, сброс HWID, мут/анмут, бан/разбан, IP-бан и объявления
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubView("players")}
            className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
              subView === "players"
                ? "border-white/25 bg-white text-black"
                : "border-white/10 bg-white/[0.04] text-zinc-300 hover:text-white"
            }`}
          >
            Игроки ({stats.total_users})
          </button>
          <button
            type="button"
            onClick={() => setSubView("console")}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
              subView === "console"
                ? "border-amber-400/40 bg-amber-400/20 text-amber-200"
                : "border-white/10 bg-white/[0.04] text-zinc-300 hover:text-white"
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            Консоль
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void fetchUsers()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:bg-white/[0.09] hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Live Stats Bar */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        <div className="rounded-xl border border-white/[0.07] bg-[#111217]/90 px-3.5 py-2.5">
          <div className="text-[11px] text-zinc-400">Онлайн</div>
          <div className="mt-0.5 text-lg font-bold text-emerald-400">{stats.online}</div>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#111217]/90 px-3.5 py-2.5">
          <div className="text-[11px] text-zinc-400">Аккаунтов</div>
          <div className="mt-0.5 text-lg font-bold text-white">{stats.total_users}</div>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#111217]/90 px-3.5 py-2.5">
          <div className="text-[11px] text-zinc-400">В бане</div>
          <div className="mt-0.5 text-lg font-bold text-red-400">{stats.banned_users}</div>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#111217]/90 px-3.5 py-2.5">
          <div className="text-[11px] text-zinc-400">IP-баны</div>
          <div className="mt-0.5 text-lg font-bold text-amber-300">{stats.ip_bans}</div>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#111217]/90 px-3.5 py-2.5">
          <div className="text-[11px] text-zinc-400">Аптайм</div>
          <div className="mt-0.5 text-lg font-bold text-zinc-200">{formatUptime(stats.uptime_sec)}</div>
        </div>
      </div>

      {/* Broadcast quick bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!broadcastText.trim()) return;
          void runCmd(`broadcast ${broadcastText.trim()}`, false);
          setBroadcastText("");
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Megaphone className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-amber-300/80" />
          <input
            type="text"
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
            placeholder="Отправить объявление [ADMIN] всем игрокам онлайн..."
            className="w-full rounded-xl border border-white/[0.08] bg-[#111217]/90 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-400/40"
          />
        </div>
        <button
          type="submit"
          disabled={!broadcastText.trim() || busyKey !== null}
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/15 px-3.5 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/25 disabled:opacity-45"
        >
          <Send className="h-3.5 w-3.5" />
          Отправить всем
        </button>
      </form>

      {subView === "players" ? (
        <div className="flex flex-1 flex-col gap-3">
          {/* Search & Filter Row */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по логину, нику MC, email или IP..."
                className="w-full rounded-xl border border-white/[0.08] bg-[#111217]/90 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-white/25"
              />
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-[#111217]/90 p-1">
              {(
                [
                  ["all", "Все"],
                  ["online", "Онлайн"],
                  ["sub", "С подпиской"],
                  ["muted", "В муте"],
                  ["banned", "В бане"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    filter === key ? "bg-white text-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Players Table */}
          <div className="flex-1 overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#111217]/90 p-3">
            {loading && users.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-xs text-zinc-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Загрузка игроков...
              </div>
            ) : users.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                По вашему запросу игроки не найдены.
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => {
                  const isProtectedSuper = u.is_superadmin || u.role === "superadmin" || u.login.toLowerCase() === "txmih";
                  const isSelf = u.login.toLowerCase() === (settings.globalsLogin || "").toLowerCase();
                  const subBadge = formatSubBadge(u);
                  return (
                    <div
                      key={u.login}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 transition hover:border-white/[0.14]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              u.online ? "bg-emerald-400" : "bg-zinc-600"
                            }`}
                          />
                          <span className="text-sm font-semibold text-white">{u.login}</span>
                          {u.nick && u.nick.toLowerCase() !== u.login.toLowerCase() && (
                            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-zinc-300">
                              MC: {u.nick}
                            </span>
                          )}
                          {isProtectedSuper ? (
                            <span className="rounded border border-amber-400/40 bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">
                              SUPERADMIN
                            </span>
                          ) : u.role === "admin" ? (
                            <span className="rounded border border-amber-400/30 bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                              ADMIN
                            </span>
                          ) : null}
                          {subBadge ? (
                            <span className="rounded border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                              {subBadge}
                            </span>
                          ) : (
                            <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-zinc-500">
                              NO SUB
                            </span>
                          )}
                          {u.muted && (
                            <span className="rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">
                              MUTED
                            </span>
                          )}
                          {u.banned && (
                            <span className="rounded border border-red-500/30 bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold text-red-300">
                              BANNED
                            </span>
                          )}
                          {u.ip_banned && (
                            <span className="rounded border border-red-500/40 bg-red-600/20 px-1.5 py-0.5 text-[9px] font-bold text-red-200">
                              IP-BAN
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                          <span>{u.online ? (u.server || u.source) : "Оффлайн"}</span>
                          {u.hwid && (
                            <span className="font-mono text-[10px] text-sky-300/80">
                              · HWID: {u.hwid}
                            </span>
                          )}
                          {u.email && <span>· {u.email}</span>}
                          {u.last_ip && <span className="font-mono text-zinc-500">· {u.last_ip}</span>}
                        </div>
                      </div>

                      {!isProtectedSuper && !isSelf && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Subscription Controls */}
                          <button
                            type="button"
                            disabled={busyKey !== null}
                            onClick={() => void runCmd(`givesub ${u.login} 30d`)}
                            className="inline-flex items-center gap-1 rounded-lg border border-sky-400/30 bg-sky-500/12 px-2 py-1 text-[10px] font-semibold text-sky-200 transition hover:bg-sky-500/25"
                          >
                            <KeyRound className="h-3 w-3" />
                            +30д
                          </button>
                          <button
                            type="button"
                            disabled={busyKey !== null}
                            onClick={() => void runCmd(`givesub ${u.login} lifetime`)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/12 px-2 py-1 text-[10px] font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
                          >
                            ∞ Саб
                          </button>
                          {u.sub_active && (
                            <button
                              type="button"
                              disabled={busyKey !== null}
                              onClick={() => void runCmd(`takesub ${u.login}`)}
                              className="rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-200 transition hover:bg-red-500/22"
                            >
                              -Саб
                            </button>
                          )}

                          {/* HWID Reset */}
                          {u.hwid && (
                            <button
                              type="button"
                              disabled={busyKey !== null}
                              onClick={() => void runCmd(`resethwid ${u.login}`)}
                              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 text-[10px] font-semibold text-zinc-200 transition hover:bg-white/[0.14]"
                            >
                              <Cpu className="h-3 w-3" />
                              Сброс HWID
                            </button>
                          )}

                          {/* Mute / Unmute */}
                          {u.muted ? (
                            <button
                              type="button"
                              disabled={busyKey !== null}
                              onClick={() => void runCmd(`unmute ${u.login}`)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/12 px-2 py-1 text-[10px] font-semibold text-emerald-300 transition hover:bg-emerald-500/22"
                            >
                              <Volume2 className="h-3 w-3" />
                              Анмут
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyKey !== null}
                              onClick={() => void runCmd(`mute ${u.login} 60m`)}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-200 transition hover:bg-amber-500/20"
                            >
                              <MicOff className="h-3 w-3" />
                              Мут
                            </button>
                          )}

                          {/* Ban / Unban */}
                          {u.banned ? (
                            <button
                              type="button"
                              disabled={busyKey !== null}
                              onClick={() => void runCmd(`unban ${u.login}`)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/12 px-2 py-1 text-[10px] font-semibold text-emerald-300 transition hover:bg-emerald-500/22"
                            >
                              <UserCheck className="h-3 w-3" />
                              Разбан
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyKey !== null}
                              onClick={() => void runCmd(`ban ${u.login} perm`)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/12 px-2 py-1 text-[10px] font-semibold text-red-300 transition hover:bg-red-500/22"
                            >
                              <Ban className="h-3 w-3" />
                              Бан
                            </button>
                          )}

                          {/* IP Ban / Unban */}
                          {u.last_ip &&
                            (u.ip_banned ? (
                              <button
                                type="button"
                                disabled={busyKey !== null}
                                onClick={() => void runCmd(`unipban ${u.last_ip}`)}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                              >
                                <ShieldCheck className="h-3 w-3" />
                                Снять IP
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={busyKey !== null}
                                onClick={() => void runCmd(`ipban ${u.login} perm`)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-200 transition hover:bg-red-500/20"
                              >
                                <ShieldAlert className="h-3 w-3" />
                                IP-бан
                              </button>
                            ))}

                          {u.online && (
                            <button
                              type="button"
                              disabled={busyKey !== null}
                              onClick={() => void runCmd(`kick ${u.login}`)}
                              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-medium text-zinc-200 transition hover:bg-white/[0.12]"
                            >
                              <UserX className="h-3 w-3" />
                              Кик
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Manual Admin Console */
        <div className="flex flex-1 flex-col gap-3 rounded-2xl border border-amber-400/20 bg-[#0d0e12]/95 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-amber-200">Ручная админ-консоль</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {["help", "stats", "users", "ipbans"].map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={cmdBusy}
                  onClick={() => void runCmd(q, false)}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-zinc-300 hover:text-white"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[250px] overflow-y-auto rounded-xl border border-white/[0.06] bg-black/60 p-3 font-mono text-xs leading-relaxed">
            {cmdLog.map((entry, idx) => (
              <div key={idx} className="mb-3 last:mb-0">
                <div className="flex items-center gap-2 text-amber-300">
                  <span className="text-zinc-500">[{entry.ts}]</span>
                  <span>$ {entry.cmd}</span>
                </div>
                <pre className="mt-1 whitespace-pre-wrap break-words text-zinc-200">
                  {entry.output}
                </pre>
              </div>
            ))}
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!cmdInput.trim() || cmdBusy) return;
              setCmdBusy(true);
              const c = cmdInput.trim();
              setCmdInput("");
              await runCmd(c, true);
              setCmdBusy(false);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={cmdInput}
              onChange={(e) => setCmdInput(e.target.value)}
              placeholder="givesub <ник> 30d | takesub <ник> | resethwid <ник> | ban <ник> | setrole <ник> admin..."
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
