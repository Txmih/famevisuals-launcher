import type { Language } from "./types";

export interface TranslationDictionary {
  appName: string;
  navHome: string;
  navFriends: string;
  navMods: string;
  navChangelog: string;
  navSettings: string;
  statusOnline: string;
  checkUpdatesBtn: string;
  checkingUpdates: string;
  upToDateToast: string;
  heroTitle: string;
  heroSubtitle: string;
  statMods: string;
  statRam: string;
  statLoader: string;
  profileTitle: string;
  profileOfflineBadge: string;
  profileMicrosoftBadge: string;
  accountTypeOffline: string;
  accountTypeMicrosoft: string;
  msLoginBtn: string;
  msLoggingIn: string;
  msLogoutBtn: string;
  msLoginSuccess: string;
  msNotSignedInHint: string;
  msLicensedLabel: string;
  splashInitCore: string;
  splashLoadingProfile: string;
  splashReady: string;
  nicknameLabel: string;
  nicknamePlaceholder: string;
  socialLinksLabel: string;
  versionProfileLabel: string;
  versionProfileValue: string;
  playButton: string;
  launchingButton: string;
  gameRunningStatus: string;
  stageCheckingUpdates: string;
  stageSyncingMods: string;
  stageVerifyingJava: string;
  stageDownloadingMinecraft: string;
  stageLaunching: string;
  stageReady: string;
  stageError: string;
  modsTitle: string;
  modsSubtitle: string;
  modsTabInstalled: string;
  modsTabModrinth: string;
  modsRefresh: string;
  modsOpenFolder: string;
  modsOfficialBadge: string;
  modsCustomBadge: string;
  modsDisabledBadge: string;
  modsEmptyInstalled: string;
  modsEmptyInstalledHint: string;
  modsDeleteTitle: string;
  modsDeleteConfirm: string;
  modsCancel: string;
  modsDelete: string;
  modrinthSearchPlaceholder: string;
  modrinthPopularHeading: string;
  modrinthInstall: string;
  modrinthInstalling: string;
  modrinthInstalled: string;
  modrinthNoResults: string;
  modrinthNoCompatible: string;
  modrinthDownloads: string;
  changelogTitle: string;
  changelogSubtitle: string;
  changelogLatestBadge: string;
  changelogOfflineNote: string;
  changelogRefresh: string;
  changelogCatNew: string;
  changelogCatFix: string;
  changelogCatImproved: string;
  settingsTitle: string;
  settingsSubtitle: string;
  settingsGameDirTitle: string;
  settingsGameDirDesc: string;
  settingsChangeDir: string;
  settingsOpenDir: string;
  settingsRamTitle: string;
  settingsRamDesc: string;
  settingsRamRecommended: string;
  settingsRamMaxPc: string;
  settingsLanguageTitle: string;
  settingsLanguageDesc: string;
  settingsWallpaperTitle: string;
  settingsWallpaperDesc: string;
  settingsWallpaperPick: string;
  settingsWallpaperReset: string;
  updaterModalTitle: string;
  updaterNewVersion: string;
  updaterInstallNow: string;
  updaterDownloading: string;
  updaterRestarting: string;
  updaterLater: string;
}

export const TRANSLATIONS: Record<Language, TranslationDictionary> = {
  en: {
    appName: "FameLauncher",
    navHome: "Home",
    navFriends: "Friends",
    navMods: "Mods",
    navChangelog: "Changelog",
    navSettings: "Settings",
    statusOnline: "Ready • 1.21.11 Fabric",
    checkUpdatesBtn: "Check Updates",
    checkingUpdates: "Checking...",
    upToDateToast: "Launcher is up to date",
    heroTitle: "Welcome to FameLauncher",
    heroSubtitle: "Minecraft 1.21.11 • Fabric • FameVisuals Client",
    statMods: "Active Mods",
    statRam: "Allocated RAM",
    statLoader: "Loader",
    profileTitle: "Player Profile",
    profileOfflineBadge: "Offline Account",
    profileMicrosoftBadge: "Microsoft Account",
    accountTypeOffline: "Offline",
    accountTypeMicrosoft: "Microsoft",
    msLoginBtn: "Sign in with Microsoft",
    msLoggingIn: "Signing in...",
    msLogoutBtn: "Sign out",
    msLoginSuccess: "Signed in as",
    msNotSignedInHint: "Sign in with your licensed Microsoft / Xbox account to join online-mode servers.",
    msLicensedLabel: "Licensed Java Edition",
    splashInitCore: "Initializing FameLauncher core...",
    splashLoadingProfile: "Loading profile & modpack state...",
    splashReady: "Ready for PvP",
    nicknameLabel: "In-Game Nickname",
    nicknamePlaceholder: "Enter nickname...",
    socialLinksLabel: "Community",
    versionProfileLabel: "Active Profile",
    versionProfileValue: "Fabric 1.21.11 • FameVisuals PvP",
    playButton: "PLAY",
    launchingButton: "PREPARING...",
    gameRunningStatus: "Minecraft launched!",
    stageCheckingUpdates: "Checking for updates...",
    stageSyncingMods: "Syncing mods...",
    stageVerifyingJava: "Verifying Java 21 runtime...",
    stageDownloadingMinecraft: "Downloading Fabric 1.21.11...",
    stageLaunching: "Launching game...",
    stageReady: "Game started!",
    stageError: "Launch failed",
    modsTitle: "Mods Manager",
    modsSubtitle: "Manage official client modules and download Fabric 1.21.11 mods from Modrinth",
    modsTabInstalled: "Installed",
    modsTabModrinth: "Download from Modrinth",
    modsRefresh: "Refresh",
    modsOpenFolder: "Open Mods Folder",
    modsOfficialBadge: "Official",
    modsCustomBadge: "Custom",
    modsDisabledBadge: "Disabled",
    modsEmptyInstalled: "No mods installed yet",
    modsEmptyInstalledHint: "Click PLAY once to sync official FameVisuals mods or install from Modrinth.",
    modsDeleteTitle: "Delete Mod?",
    modsDeleteConfirm: "Are you sure you want to permanently delete",
    modsCancel: "Cancel",
    modsDelete: "Delete",
    modrinthSearchPlaceholder: "Search Fabric 1.21.11 mods on Modrinth...",
    modrinthPopularHeading: "Popular Optimization & PvP Mods (1.21.11)",
    modrinthInstall: "Install",
    modrinthInstalling: "Installing...",
    modrinthInstalled: "Installed",
    modrinthNoResults: "No Fabric 1.21.11 mods found for this query",
    modrinthNoCompatible: "No compatible 1.21.11 Fabric jar found",
    modrinthDownloads: "downloads",
    changelogTitle: "Changelog",
    changelogSubtitle: "Latest client updates, fixes and PvP improvements from GitHub",
    changelogLatestBadge: "Latest",
    changelogOfflineNote: "Offline cache active",
    changelogRefresh: "Refresh",
    changelogCatNew: "NEW",
    changelogCatFix: "FIX",
    changelogCatImproved: "IMPROVED",
    settingsTitle: "Launcher Settings",
    settingsSubtitle: "Configure game directory, JVM memory allocation, language and appearance",
    settingsGameDirTitle: "Game Directory",
    settingsGameDirDesc: "Versions, libraries, assets and mods are stored strictly inside this folder.",
    settingsChangeDir: "Change Folder",
    settingsOpenDir: "Open Folder in Explorer",
    settingsRamTitle: "RAM Allocation (JVM Memory)",
    settingsRamDesc: "Allocate memory in 512 MB steps for smooth rendering and high FPS.",
    settingsRamRecommended: "Recommended: 4.0 GB",
    settingsRamMaxPc: "PC Total:",
    settingsLanguageTitle: "Interface Language",
    settingsLanguageDesc: "Switch language instantly without restarting the launcher.",
    settingsWallpaperTitle: "Custom Background (wallpaper.jpg)",
    settingsWallpaperDesc: "Choose a custom background image rendered behind glassmorphism cards.",
    settingsWallpaperPick: "Select Image",
    settingsWallpaperReset: "Default Theme",
    updaterModalTitle: "Launcher Update Available",
    updaterNewVersion: "New version is ready to install:",
    updaterInstallNow: "Update & Restart",
    updaterDownloading: "Downloading update...",
    updaterRestarting: "Restarting launcher...",
    updaterLater: "Later",
  },
  ru: {
    appName: "FameLauncher",
    navHome: "Главная",
    navFriends: "Друзья",
    navMods: "Моды",
    navChangelog: "Изменения",
    navSettings: "Настройки",
    statusOnline: "Готов • 1.21.11 Fabric",
    checkUpdatesBtn: "Обновления",
    checkingUpdates: "Проверка...",
    upToDateToast: "Установлена актуальная версия лаунчера",
    heroTitle: "Добро пожаловать в FameLauncher",
    heroSubtitle: "Minecraft 1.21.11 • Fabric • FameVisuals Client",
    statMods: "Активных модов",
    statRam: "Выделено ОЗУ",
    statLoader: "Загрузчик",
    profileTitle: "Профиль игрока",
    profileOfflineBadge: "Офлайн-аккаунт",
    profileMicrosoftBadge: "Лицензия Microsoft",
    accountTypeOffline: "Офлайн",
    accountTypeMicrosoft: "Microsoft",
    msLoginBtn: "Войти через Microsoft",
    msLoggingIn: "Авторизация...",
    msLogoutBtn: "Выйти",
    msLoginSuccess: "Вход выполнен:",
    msNotSignedInHint: "Войдите через лицензионный аккаунт Microsoft для игры на серверах с проверкой лицензии.",
    msLicensedLabel: "Лицензионный профиль Java Edition",
    splashInitCore: "Инициализация ядра FameLauncher...",
    splashLoadingProfile: "Загрузка профиля и конфигурации модов...",
    splashReady: "Готов к запуску",
    nicknameLabel: "Игровой никнейм",
    nicknamePlaceholder: "Введите ник...",
    socialLinksLabel: "Сообщество",
    versionProfileLabel: "Выбранный профиль",
    versionProfileValue: "Fabric 1.21.11 • FameVisuals PvP",
    playButton: "ИГРАТЬ",
    launchingButton: "ЗАПУСК...",
    gameRunningStatus: "Игра запущена!",
    stageCheckingUpdates: "Проверка обновлений...",
    stageSyncingMods: "Синхронизация модов...",
    stageVerifyingJava: "Проверка Java 21...",
    stageDownloadingMinecraft: "Загрузка Fabric 1.21.11...",
    stageLaunching: "Запуск игры...",
    stageReady: "Игра запущена!",
    stageError: "Ошибка запуска",
    modsTitle: "Менеджер модов",
    modsSubtitle: "Управляйте официальными модами клиента и скачивайте аддоны с Modrinth для 1.21.11",
    modsTabInstalled: "Установленные",
    modsTabModrinth: "Скачать с Modrinth",
    modsRefresh: "Обновить",
    modsOpenFolder: "Открыть папку модов",
    modsOfficialBadge: "Официальный",
    modsCustomBadge: "Свой",
    modsDisabledBadge: "Отключён",
    modsEmptyInstalled: "Моды пока не установлены",
    modsEmptyInstalledHint: "Нажмите ИГРАТЬ для загрузки официального модпака или установите моды из Modrinth.",
    modsDeleteTitle: "Удалить мод?",
    modsDeleteConfirm: "Вы уверены, что хотите навсегда удалить",
    modsCancel: "Отмена",
    modsDelete: "Удалить",
    modrinthSearchPlaceholder: "Поиск модов Fabric 1.21.11 на Modrinth...",
    modrinthPopularHeading: "Популярные PvP и FPS-моды (1.21.11)",
    modrinthInstall: "Установить",
    modrinthInstalling: "Установка...",
    modrinthInstalled: "Установлен",
    modrinthNoResults: "Моды для Fabric 1.21.11 по этому запросу не найдены",
    modrinthNoCompatible: "Не найден совместимый .jar для 1.21.11 Fabric",
    modrinthDownloads: "скачиваний",
    changelogTitle: "Список изменений",
    changelogSubtitle: "Актуальные обновления клиента, фиксы и PvP-улучшения из GitHub",
    changelogLatestBadge: "Последняя",
    changelogOfflineNote: "Используется локальный кэш",
    changelogRefresh: "Обновить",
    changelogCatNew: "НОВОЕ",
    changelogCatFix: "ИСПРАВЛЕНО",
    changelogCatImproved: "УЛУЧШЕНО",
    settingsTitle: "Настройки лаунчера",
    settingsSubtitle: "Папка игры, выделение оперативной памяти, язык интерфейса и кастомный фон",
    settingsGameDirTitle: "Папка игры",
    settingsGameDirDesc: "Версии, библиотеки, ассеты и моды хранятся и запускаются строго из этой директории.",
    settingsChangeDir: "Изменить папку",
    settingsOpenDir: "Открыть папку в проводнике",
    settingsRamTitle: "Выделение ОЗУ (RAM)",
    settingsRamDesc: "Настройка памяти с шагом 512 МБ для стабильного FPS в PvP.",
    settingsRamRecommended: "Рекомендуется: 4.0 GB",
    settingsRamMaxPc: "Всего на ПК:",
    settingsLanguageTitle: "Язык интерфейса",
    settingsLanguageDesc: "Мгновенное переключение языка без перезапуска лаунчера.",
    settingsWallpaperTitle: "Кастомный фон (wallpaper.jpg)",
    settingsWallpaperDesc: "Выберите своё фоновое изображение с мягким затемнением и glassmorphism.",
    settingsWallpaperPick: "Выбрать картинку",
    settingsWallpaperReset: "Стандартный фон",
    updaterModalTitle: "Доступно обновление лаунчера",
    updaterNewVersion: "Готова к установке новая версия:",
    updaterInstallNow: "Обновить и перезапустить",
    updaterDownloading: "Загрузка обновления...",
    updaterRestarting: "Перезапуск лаунчера...",
    updaterLater: "Позже",
  },
  pl: {
    appName: "FameLauncher",
    navHome: "Główna",
    navFriends: "Znajomi",
    navMods: "Mody",
    navChangelog: "Zmiany",
    navSettings: "Ustawienia",
    statusOnline: "Gotowy • 1.21.11 Fabric",
    checkUpdatesBtn: "Aktualizacje",
    checkingUpdates: "Sprawdzanie...",
    upToDateToast: "Masz najnowszą wersję launchera",
    heroTitle: "Witamy w FameLauncher",
    heroSubtitle: "Minecraft 1.21.11 • Fabric • FameVisuals Client",
    statMods: "Aktywne mody",
    statRam: "Przydzielony RAM",
    statLoader: "Loader",
    profileTitle: "Profil gracza",
    profileOfflineBadge: "Konto offline",
    profileMicrosoftBadge: "Konto Microsoft",
    accountTypeOffline: "Offline",
    accountTypeMicrosoft: "Microsoft",
    msLoginBtn: "Zaloguj przez Microsoft",
    msLoggingIn: "Logowanie...",
    msLogoutBtn: "Wyloguj",
    msLoginSuccess: "Zalogowano jako:",
    msNotSignedInHint: "Zaloguj się przez licencjonowane konto Microsoft, aby grać na serwerach premium.",
    msLicensedLabel: "Licencjonowany profil Java Edition",
    splashInitCore: "Inicjalizacja rdzenia FameLauncher...",
    splashLoadingProfile: "Ładowanie profilu i konfiguracji modów...",
    splashReady: "Gotowy do gry",
    nicknameLabel: "Nick w grze",
    nicknamePlaceholder: "Wpisz nick...",
    socialLinksLabel: "Społeczność",
    versionProfileLabel: "Aktywny profil",
    versionProfileValue: "Fabric 1.21.11 • FameVisuals PvP",
    playButton: "GRAJ",
    launchingButton: "URUCHAMIANIE...",
    gameRunningStatus: "Gra uruchomiona!",
    stageCheckingUpdates: "Sprawdzanie aktualizacji...",
    stageSyncingMods: "Synchronizacja modów...",
    stageVerifyingJava: "Weryfikacja Java 21...",
    stageDownloadingMinecraft: "Pobieranie Fabric 1.21.11...",
    stageLaunching: "Uruchamianie gry...",
    stageReady: "Gra została uruchomiona!",
    stageError: "Błąd uruchamiania",
    modsTitle: "Menedżer modów",
    modsSubtitle: "Zarządzaj oficjalnymi modami klienta i pobieraj dodatki z Modrinth dla 1.21.11",
    modsTabInstalled: "Zainstalowane",
    modsTabModrinth: "Pobierz z Modrinth",
    modsRefresh: "Odśwież",
    modsOpenFolder: "Otwórz folder modów",
    modsOfficialBadge: "Oficjalny",
    modsCustomBadge: "Własny",
    modsDisabledBadge: "Wyłączony",
    modsEmptyInstalled: "Brak zainstalowanych modów",
    modsEmptyInstalledHint: "Kliknij GRAJ, aby pobrać oficjalną paczkę lub zainstaluj mody z Modrinth.",
    modsDeleteTitle: "Usunąć mod?",
    modsDeleteConfirm: "Czy na pewno chcesz trwale usunąć",
    modsCancel: "Anuluj",
    modsDelete: "Usuń",
    modrinthSearchPlaceholder: "Szukaj modów Fabric 1.21.11 na Modrinth...",
    modrinthPopularHeading: "Popularne mody PvP i FPS (1.21.11)",
    modrinthInstall: "Zainstaluj",
    modrinthInstalling: "Instalowanie...",
    modrinthInstalled: "Zainstalowano",
    modrinthNoResults: "Nie znaleziono modów Fabric 1.21.11 dla tego zapytania",
    modrinthNoCompatible: "Nie znaleziono kompatybilnego pliku .jar dla 1.21.11 Fabric",
    modrinthDownloads: "pobrań",
    changelogTitle: "Lista zmian",
    changelogSubtitle: "Najnowsze aktualizacje klienta, poprawki i ulepszenia PvP z GitHub",
    changelogLatestBadge: "Najnowsza",
    changelogOfflineNote: "Używana pamięć podręczna offline",
    changelogRefresh: "Odśwież",
    changelogCatNew: "NOWOŚĆ",
    changelogCatFix: "POPRAWKA",
    changelogCatImproved: "ULEPSZONO",
    settingsTitle: "Ustawienia launchera",
    settingsSubtitle: "Skonfiguruj folder gry, pamięć RAM, język interfejsu i własne tło",
    settingsGameDirTitle: "Folder gry",
    settingsGameDirDesc: "Wersje, biblioteki, zasoby i mody są przechowywane wyłącznie w tym katalogu.",
    settingsChangeDir: "Zmień folder",
    settingsOpenDir: "Otwórz w Eksploratorze",
    settingsRamTitle: "Przydział pamięci RAM",
    settingsRamDesc: "Regulacja pamięci co 512 MB dla płynnej rozgrywki i wysokiego FPS.",
    settingsRamRecommended: "Zalecane: 4.0 GB",
    settingsRamMaxPc: "Pamięć PC:",
    settingsLanguageTitle: "Język interfejsu",
    settingsLanguageDesc: "Natychmiastowa zmiana języka bez restartu launchera.",
    settingsWallpaperTitle: "Własne tło (wallpaper.jpg)",
    settingsWallpaperDesc: "Wybierz własny obraz tła z przyciemnieniem i efektem glassmorphism.",
    settingsWallpaperPick: "Wybierz obraz",
    settingsWallpaperReset: "Domyślny motyw",
    updaterModalTitle: "Dostępna aktualizacja launchera",
    updaterNewVersion: "Nowa wersja jest gotowa do instalacji:",
    updaterInstallNow: "Aktualizuj i uruchom ponownie",
    updaterDownloading: "Pobieranie aktualizacji...",
    updaterRestarting: "Ponowne uruchamianie...",
    updaterLater: "Później",
  },
};
