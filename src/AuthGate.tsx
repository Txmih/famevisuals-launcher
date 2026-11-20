import React, { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  ArrowLeft,
  ArrowDownToLine,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Minus,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import logoImg from "./assets/logo.png";
import { getBackendHttpBase } from "./globalsEndpoint";
import type { Language } from "./types";

type AuthView = "login" | "register" | "register_code" | "recovery_start" | "recovery_confirm";

interface AuthGateProps {
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  onAuthenticated: (payload: {
    login: string;
    token: string;
    role: string;
    avatar: string;
  }) => void;
  showToast: (text: string, type?: "info" | "error" | "success") => void;
  pendingUpdateVersion?: string | null;
  updatingLauncher?: boolean;
  updatePercent?: number;
  onInstallUpdate?: () => void;
}

const TEXTS = {
  ru: {
    subtitle: "Единый аккаунт FameVisuals • Синхронизация с клиентом",
    tabLogin: "Вход",
    tabRegister: "Регистрация",
    loginTitle: "Вход в аккаунт",
    regTitle: "Создание аккаунта",
    codeTitle: "Подтверждение Gmail",
    recStartTitle: "Восстановление пароля",
    recConfirmTitle: "Сброс пароля",
    loginOrEmail: "Логин или Email",
    loginPlaceholder: "Логин (3–20 лат. символов)",
    emailPlaceholder: "Ваш Gmail / Email",
    passwordPlaceholder: "Пароль (мин. 4 символа)",
    newPasswordPlaceholder: "Новый пароль (мин. 4 символа)",
    codePlaceholder: "6-значный код из письма",
    btnLogin: "Войти",
    btnSendCode: "Отправить 6-значный код",
    btnVerify: "Подтвердить и войти",
    btnReset: "Сохранить новый пароль",
    forgotLink: "Забыли пароль?",
    backToLogin: "Назад ко входу",
    codeSentHint: "Мы отправили 6-значный код на почту",
    spamHint: "Проверьте папку «Входящие» или «Спам». Код действует 10 минут.",
    updateAvailable: "Доступно обновление лаунчера",
    updateBtn: "Обновить и перезапустить",
    errBadInput: "Некорректный логин (3–20 лат. символов) или пароль (мин. 4)",
    errBadEmail: "Введите корректный адрес Gmail / Email",
    errTaken: "Этот логин уже занят",
    errEmailTaken: "Этот Email уже зарегистрирован",
    errWrong: "Неверный логин или пароль",
    errBanned: "Аккаунт заблокирован",
    errBadCode: "Неверный 6-значный код",
    errCodeExpired: "Код истёк — запросите новый",
    errRateLimit: "Подождите 60 секунд перед повторной отправкой кода",
    errNoEmail: "К этому аккаунту не привязана почта",
    errNotFound: "Аккаунт не найден",
    errSmtp: "Не удалось отправить письмо — попробуйте через минуту",
    errNetwork: "Нет соединения с сервером авторизации",
  },
  en: {
    subtitle: "Unified FameVisuals Account • Auto-synced with Minecraft",
    tabLogin: "Sign In",
    tabRegister: "Register",
    loginTitle: "Sign In",
    regTitle: "Create Account",
    codeTitle: "Verify Email",
    recStartTitle: "Password Recovery",
    recConfirmTitle: "Set New Password",
    loginOrEmail: "Username or Email",
    loginPlaceholder: "Username (3-20 chars)",
    emailPlaceholder: "Your Gmail / Email",
    passwordPlaceholder: "Password (min 4 chars)",
    newPasswordPlaceholder: "New password (min 4 chars)",
    codePlaceholder: "6-digit code from email",
    btnLogin: "Sign In",
    btnSendCode: "Send 6-digit Code",
    btnVerify: "Verify & Sign In",
    btnReset: "Save New Password",
    forgotLink: "Forgot password?",
    backToLogin: "Back to Sign In",
    codeSentHint: "We sent a 6-digit code to",
    spamHint: "Check Inbox or Spam. Code expires in 10 minutes.",
    updateAvailable: "Launcher update available",
    updateBtn: "Update & Restart",
    errBadInput: "Invalid username (3-20 chars) or password (min 4)",
    errBadEmail: "Enter a valid Gmail / Email address",
    errTaken: "Username is already taken",
    errEmailTaken: "Email is already registered",
    errWrong: "Wrong username or password",
    errBanned: "Account is banned",
    errBadCode: "Invalid 6-digit code",
    errCodeExpired: "Code expired — request a new one",
    errRateLimit: "Please wait 60 seconds before requesting another code",
    errNoEmail: "No email linked to this account",
    errNotFound: "Account not found",
    errSmtp: "Failed to send email — try again shortly",
    errNetwork: "Could not reach authentication server",
  },
  pl: {
    subtitle: "Jedno konto FameVisuals • Synchronizacja z klientem",
    tabLogin: "Logowanie",
    tabRegister: "Rejestracja",
    loginTitle: "Zaloguj się",
    regTitle: "Utwórz konto",
    codeTitle: "Potwierdź Email",
    recStartTitle: "Odzyskiwanie hasła",
    recConfirmTitle: "Nowe hasło",
    loginOrEmail: "Login lub Email",
    loginPlaceholder: "Login (3-20 znaków)",
    emailPlaceholder: "Twój Gmail / Email",
    passwordPlaceholder: "Hasło (min. 4 znaki)",
    newPasswordPlaceholder: "Nowe hasło (min. 4 znaki)",
    codePlaceholder: "6-cyfrowy kod z maila",
    btnLogin: "Zaloguj",
    btnSendCode: "Wyślij 6-cyfrowy kod",
    btnVerify: "Potwierdź i zaloguj",
    btnReset: "Zapisz nowe hasło",
    forgotLink: "Nie pamiętasz hasła?",
    backToLogin: "Powrót do logowania",
    codeSentHint: "Wysłaliśmy 6-cyfrowy kod na",
    spamHint: "Sprawdź skrzynkę lub Spam. Kod jest ważny 10 minut.",
    updateAvailable: "Dostępna aktualizacja launchera",
    updateBtn: "Zaktualizuj i uruchom ponownie",
    errBadInput: "Nieprawidłowy login (3-20 znaków) lub hasło (min. 4)",
    errBadEmail: "Podaj poprawny adres Gmail / Email",
    errTaken: "Ten login jest już zajęty",
    errEmailTaken: "Ten email jest już zajęty",
    errWrong: "Nieprawidłowy login lub hasło",
    errBanned: "Konto zostało zablokowane",
    errBadCode: "Nieprawidłowy 6-cyfrowy kod",
    errCodeExpired: "Kod wygasł — wyślij nowy",
    errRateLimit: "Poczekaj 60 sekund przed ponownym wysłaniem kodu",
    errNoEmail: "Brak adresu email dla tego konta",
    errNotFound: "Nie znaleziono konta",
    errSmtp: "Nie udało się wysłać wiadomości — spróbuj później",
    errNetwork: "Brak połączenia z serwerem logowania",
  },
};

export function AuthGate({
  language,
  onChangeLanguage,
  onAuthenticated,
  showToast,
  pendingUpdateVersion,
  updatingLauncher,
  updatePercent,
  onInstallUpdate,
}: AuthGateProps) {
  const l = TEXTS[language];
  const [view, setView] = useState<AuthView>("login");
  const [loginInput, setLoginInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const apiBase = getBackendHttpBase();

  const mapError = (code?: string) => {
    switch (code) {
      case "bad_input": return l.errBadInput;
      case "bad_email": return l.errBadEmail;
      case "taken": return l.errTaken;
      case "email_taken": return l.errEmailTaken;
      case "wrong": return l.errWrong;
      case "banned": return l.errBanned;
      case "bad_code": return l.errBadCode;
      case "code_expired": return l.errCodeExpired;
      case "rate_limit": return l.errRateLimit;
      case "no_email": return l.errNoEmail;
      case "user_not_found": return l.errNotFound;
      case "smtp_failed": return l.errSmtp;
      default: return code || l.errNetwork;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErrorText(null);
    setBusy(true);
    try {
      if (view === "login") {
        const res = await fetch(`${apiBase}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login: loginInput.trim(), password: passwordInput }),
        });
        const data = await res.json();
        if (!data.ok) {
          setErrorText(mapError(data.error));
          return;
        }
        onAuthenticated({
          login: data.login,
          token: data.token,
          role: data.role || "user",
          avatar: data.avatar || "",
        });
      } else if (view === "register") {
        const res = await fetch(`${apiBase}/api/register/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            login: loginInput.trim(),
            email: emailInput.trim(),
            password: passwordInput,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setErrorText(mapError(data.error));
          return;
        }
        setMaskedEmail(data.email || emailInput.trim());
        setCodeInput("");
        setView("register_code");
        showToast(`${l.codeSentHint} ${data.email || emailInput.trim()}`, "success");
      } else if (view === "register_code") {
        const res = await fetch(`${apiBase}/api/register/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailInput.trim(),
            code: codeInput.trim(),
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setErrorText(mapError(data.error));
          return;
        }
        onAuthenticated({
          login: data.login,
          token: data.token,
          role: data.role || "user",
          avatar: data.avatar || "",
        });
      } else if (view === "recovery_start") {
        const res = await fetch(`${apiBase}/api/recovery/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: loginInput.trim() }),
        });
        const data = await res.json();
        if (!data.ok) {
          setErrorText(mapError(data.error));
          return;
        }
        setMaskedEmail(data.email || "");
        setCodeInput("");
        setPasswordInput("");
        setView("recovery_confirm");
        showToast(`${l.codeSentHint} ${data.email || ""}`, "success");
      } else if (view === "recovery_confirm") {
        const res = await fetch(`${apiBase}/api/recovery/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: loginInput.trim(),
            code: codeInput.trim(),
            new_password: passwordInput,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setErrorText(mapError(data.error));
          return;
        }
        onAuthenticated({
          login: data.login,
          token: data.token,
          role: data.role || "user",
          avatar: data.avatar || "",
        });
      }
    } catch {
      setErrorText(l.errNetwork);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#0a0b0e] text-white select-none">
      {/* Subtle monochrome cosmic radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(640px circle at 50% 18%, rgba(255,255,255,0.06), transparent 65%), radial-gradient(500px circle at 80% 85%, rgba(255,255,255,0.03), transparent 60%)",
        }}
      />

      {/* Custom draggable titlebar */}
      <div
        data-tauri-drag-region
        className="relative z-20 flex h-11 shrink-0 items-center justify-between border-b border-white/[0.06] bg-black/30 px-4 backdrop-blur-md"
      >
        <div className="flex items-center gap-2.5" data-tauri-drag-region>
          <img src={logoImg} alt="FameLauncher" className="h-5 w-5 rounded" />
          <span className="text-[13px] font-semibold tracking-tight text-white">FameLauncher</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Compact Language Switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
            {(["ru", "en", "pl"] as Language[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onChangeLanguage(code)}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase transition ${
                  language === code
                    ? "bg-white text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {code}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void getCurrentWindow().minimize()}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void getCurrentWindow().close()}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-500/20 hover:text-red-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Auto-update banner if a newer version is ready */}
      {pendingUpdateVersion && onInstallUpdate && (
        <div className="relative z-20 mx-auto mt-3 flex w-full max-w-[440px] items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
          <div className="text-xs text-emerald-200">
            <span className="font-semibold">{l.updateAvailable}</span> · v{pendingUpdateVersion}
          </div>
          <button
            type="button"
            disabled={updatingLauncher}
            onClick={onInstallUpdate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {updatingLauncher ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {updatePercent ?? 0}%
              </>
            ) : (
              <>
                <ArrowDownToLine className="h-3.5 w-3.5" />
                {l.updateBtn}
              </>
            )}
          </button>
        </div>
      )}

      {/* Center Auth Card */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[410px] rounded-2xl border border-white/[0.09] bg-[#111217]/95 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04]">
              <img src={logoImg} alt="FameVisuals" className="h-8 w-8 object-contain" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">FameVisuals</h1>
            <p className="mt-1 text-xs text-zinc-400">{l.subtitle}</p>
          </div>

          {(view === "login" || view === "register") && (
            <div className="mb-5 grid grid-cols-2 gap-1.5 rounded-xl border border-white/[0.08] bg-black/40 p-1">
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setErrorText(null);
                }}
                className={`rounded-lg py-2 text-xs font-semibold transition ${
                  view === "login" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                {l.tabLogin}
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("register");
                  setErrorText(null);
                }}
                className={`rounded-lg py-2 text-xs font-semibold transition ${
                  view === "register" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                {l.tabRegister}
              </button>
            </div>
          )}

          {(view === "register_code" || view === "recovery_start" || view === "recovery_confirm") && (
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setErrorText(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 transition hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {l.backToLogin}
              </button>
              <span className="text-xs font-semibold text-white">
                {view === "register_code"
                  ? l.codeTitle
                  : view === "recovery_start"
                    ? l.recStartTitle
                    : l.recConfirmTitle}
              </span>
            </div>
          )}

          {(view === "register_code" || view === "recovery_confirm") && (
            <div className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-xs text-zinc-300">
              <div className="flex items-center gap-2 font-medium text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  {l.codeSentHint} <span className="font-semibold">{maskedEmail}</span>
                </span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">{l.spamHint}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {(view === "login" || view === "register" || view === "recovery_start") && (
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder={view === "register" ? l.loginPlaceholder : l.loginOrEmail}
                  className="w-full rounded-xl border border-white/[0.09] bg-black/50 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-white/30"
                />
              </div>
            )}

            {view === "register" && (
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={l.emailPlaceholder}
                  className="w-full rounded-xl border border-white/[0.09] bg-black/50 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-white/30"
                />
              </div>
            )}

            {(view === "register_code" || view === "recovery_confirm") && (
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder={l.codePlaceholder}
                  className="w-full rounded-xl border border-white/[0.09] bg-black/50 py-2.5 pl-10 pr-3.5 text-center font-mono text-base tracking-[0.4em] text-white placeholder-zinc-500 outline-none transition focus:border-white/30"
                />
              </div>
            )}

            {(view === "login" || view === "register" || view === "recovery_confirm") && (
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  required
                  minLength={4}
                  maxLength={128}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={
                    view === "recovery_confirm" ? l.newPasswordPlaceholder : l.passwordPlaceholder
                  }
                  className="w-full rounded-xl border border-white/[0.09] bg-black/50 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-white/30"
                />
              </div>
            )}

            {errorText && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-2 text-xs text-red-300">
                {errorText}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {view === "login"
                ? l.btnLogin
                : view === "register" || view === "recovery_start"
                  ? l.btnSendCode
                  : view === "register_code"
                    ? l.btnVerify
                    : l.btnReset}
            </button>

            {view === "login" && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setView("recovery_start");
                    setErrorText(null);
                  }}
                  className="text-xs text-zinc-400 transition hover:text-white"
                >
                  {l.forgotLink}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
