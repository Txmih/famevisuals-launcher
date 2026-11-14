# FameVisuals Launcher

Modern desktop launcher for **Minecraft 1.21.11 (Fabric)** built with **Tauri v2** (Rust backend + React 18, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion).

## Features
- **Frameless Dark PvP UI:** Custom titlebar, obsidian glassmorphism cards, animated gradients, and custom `wallpaper.jpg` background support.
- **One-Click Launch & Modpack Sync:** Automatically fetches `manifest.json`, verifies SHA-256 integrity of official FameVisuals mods, downloads Java 21 (Adoptium Temurin) if missing, and launches Minecraft 1.21.11 with Fabric Loader `0.19.3`.
- **Mods Manager + Modrinth Browser:** Inspect installed `.jar` mods (`Official` vs `Custom`), toggle enable/disable, delete with confirmation, and search/install compatible Fabric `1.21.11` mods directly from Modrinth.
- **Live GitHub Changelog & Self-Updater:** Pulls `changelog.json` from GitHub with offline caching and checks for launcher updates via `tauri-plugin-updater`.
- **Multi-Language Support:** Instant switching between **English (EN)**, **Русский (RU)**, and **Polski (PL)**.

See [HOW_TO_UPDATE.md](./HOW_TO_UPDATE.md) for instructions on releasing modpack and launcher updates.
