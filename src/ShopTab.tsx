import React from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Check, Crown, ShieldCheck, Sparkles } from "lucide-react";
import type { Language } from "./types";

interface ShopTabProps {
  language: Language;
  subActive: boolean;
  subUntil: number;
}

function TelegramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

const PLANS = {
  ru: [
    {
      id: "30d",
      name: "30 дней",
      subtitle: "Доступ к клиенту на 1 месяц",
      price: "Custom",
      popular: false,
      features: [
        "Полный доступ к FameVisuals 1.21.11",
        "Все визуалы, косметика и эмоции",
        "Друзья, пати, общие метки и чат",
        "Привязка к вашему HWID",
      ],
    },
    {
      id: "365d",
      name: "1 год",
      subtitle: "Доступ к клиенту на 365 дней",
      price: "Custom",
      popular: false,
      features: [
        "Все функции клиента на целый год",
        "Автоматические обновления клиента",
        "Все новые косметики и эффекты",
        "Приоритетная поддержка в Telegram",
      ],
    },
    {
      id: "lifetime",
      name: "Навсегда",
      subtitle: "Пожизненный доступ без продлений",
      price: "Custom",
      popular: true,
      features: [
        "Вечный доступ к FameVisuals",
        "Все будущие версии и обновления",
        "Эксклюзивная косметика и эмоции",
        "Приоритетный сброс HWID и поддержка",
      ],
    },
  ],
  en: [
    {
      id: "30d",
      name: "30 Days",
      subtitle: "Full client access for 1 month",
      price: "Custom",
      popular: false,
      features: [
        "Full access to FameVisuals 1.21.11",
        "All visuals, 3D cosmetics & emotes",
        "Friends, parties, waypoints & chat",
        "Dedicated HWID binding",
      ],
    },
    {
      id: "365d",
      name: "1 Year",
      subtitle: "Full client access for 365 days",
      price: "Custom",
      popular: false,
      features: [
        "All client features for a full year",
        "Automatic client & launcher updates",
        "All new cosmetics & visual effects",
        "Priority Telegram support",
      ],
    },
    {
      id: "lifetime",
      name: "Lifetime",
      subtitle: "Permanent access with zero renewals",
      price: "Custom",
      popular: true,
      features: [
        "Lifetime FameVisuals client access",
        "All future versions & updates included",
        "All exclusive cosmetics & emotes",
        "Priority HWID resets & support",
      ],
    },
  ],
  pl: [
    {
      id: "30d",
      name: "30 dni",
      subtitle: "Pełny dostęp do klienta na 1 miesiąc",
      price: "Custom",
      popular: false,
      features: [
        "Pełny dostęp do FameVisuals 1.21.11",
        "Wszystkie wizuale, kosmetyki i emotki",
        "Znajomi, party, znaczniki i czat",
        "Przypisanie do Twojego HWID",
      ],
    },
    {
      id: "365d",
      name: "1 rok",
      subtitle: "Pełny dostęp na 365 dni",
      price: "Custom",
      popular: false,
      features: [
        "Wszystkie funkcje przez cały rok",
        "Automatyczne aktualizacje klienta",
        "Wszystkie nowe kosmetyki i efekty",
        "Priorytetowe wsparcie na Telegramie",
      ],
    },
    {
      id: "lifetime",
      name: "Na zawsze",
      subtitle: "Dożywotni dostęp bez odnawiania",
      price: "Custom",
      popular: true,
      features: [
        "Dożywotni dostęp do FameVisuals",
        "Wszystkie przyszłe aktualizacje",
        "Ekskluzywne kosmetyki i emotki",
        "Priorytetowy reset HWID i wsparcie",
      ],
    },
  ],
};

export function ShopTab({ language, subActive, subUntil }: ShopTabProps) {
  const plans = PLANS[language] || PLANS.ru;

  const formatSubBadge = () => {
    if (!subActive) {
      return language === "ru"
        ? "Подписка не активна"
        : language === "pl"
          ? "Brak aktywnej subskrypcji"
          : "No active subscription";
    }
    if (subUntil === -1) {
      return language === "ru"
        ? "Активна: Навсегда"
        : language === "pl"
          ? "Aktywna: Na zawsze"
          : "Active: Lifetime";
    }
    const days = Math.max(1, Math.ceil((subUntil - Date.now()) / 86_400_000));
    return language === "ru"
      ? `Активна: осталось ${days} дн.`
      : language === "pl"
        ? `Aktywna: pozostało ${days} dni`
        : `Active: ${days}d remaining`;
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-[920px] flex-col gap-5 pb-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {language === "ru" ? "Магазин" : language === "pl" ? "Sklep" : "Shop"}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            {language === "ru"
              ? "Выберите тариф подписки FameVisuals и свяжитесь для активации в Telegram"
              : language === "pl"
                ? "Wybierz plan FameVisuals i skontaktuj się na Telegramie w celu aktywacji"
                : "Choose a FameVisuals subscription plan and contact via Telegram to activate"}
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
            subActive
              ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-300"
              : "border-white/10 bg-white/[0.04] text-zinc-400"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>{formatSubBadge()}</span>
        </div>
      </div>

      {/* 3 Plan Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col justify-between rounded-2xl border p-5 backdrop-blur-md transition ${
              plan.popular
                ? "border-sky-400/35 bg-gradient-to-b from-sky-500/[0.10] via-[#12141b]/95 to-[#0f1016]/95 shadow-lg shadow-sky-950/30"
                : "border-white/[0.08] bg-[#111217]/90 hover:border-white/[0.16]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                {plan.popular && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-300">
                    <Crown className="h-3 w-3" />
                    {language === "ru" ? "Топ" : "Best"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-400">{plan.subtitle}</p>

              {/* Price block: Custom + clickable Telegram icon */}
              <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.07] bg-black/35 px-4 py-3">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    {language === "ru" ? "Цена" : language === "pl" ? "Cena" : "Price"}
                  </div>
                  <div className="mt-0.5 text-xl font-extrabold tracking-tight text-white">
                    {plan.price}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void openUrl("https://t.me/txmih")}
                  title="Telegram: @txmih"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/15 text-sky-300 transition hover:scale-105 hover:bg-sky-500/25 hover:text-white"
                >
                  <TelegramIcon className="h-5 w-5" />
                </button>
              </div>

              <ul className="mt-5 space-y-2.5">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-xs text-zinc-300">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => void openUrl("https://t.me/txmih")}
              className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                plan.popular
                  ? "bg-sky-400 text-black hover:bg-sky-300"
                  : "border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12]"
              }`}
            >
              <TelegramIcon className="h-4 w-4" />
              <span>
                {language === "ru"
                  ? "Купить в Telegram (@txmih)"
                  : language === "pl"
                    ? "Kup na Telegramie (@txmih)"
                    : "Buy via Telegram (@txmih)"}
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Info Footer */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#111217]/80 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Sparkles className="h-4 w-4 text-sky-400" />
          <span>
            {language === "ru"
              ? "Моментальная выдача доступа"
              : language === "pl"
                ? "Natychmiastowa aktywacja"
                : "Instant Access Activation"}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          {language === "ru"
            ? "После оплаты сообщите ваш логин аккаунта в Telegram @txmih — подписка активируется мгновенно и отобразится в вашем профиле."
            : language === "pl"
              ? "Po zakupie podaj swój login na Telegramie @txmih — subskrypcja aktywuje się natychmiast i pojawi w profilu."
              : "After purchase, send your account login to @txmih on Telegram — your subscription activates instantly in your Profile."}
        </p>
      </div>
    </div>
  );
}
