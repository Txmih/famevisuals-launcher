# Как выпускать обновления FameVisuals

В этом руководстве описаны два независимых сценария обновлений:
1. **Обновление клиента / модпака (`FameVisuals-1.21.11.jar`)** — пользователи получают его автоматически при нажатии **ИГРАТЬ**.
2. **Обновление самого лаунчера (`FameVisuals Launcher`)** — пользователи получают его через встроенный `tauri-plugin-updater`.

---

## 1. Обновление мода FameVisuals (`manifest.json` + `changelog.json`)

Лаунчер перед запуском игры скачивает свежий `manifest.json` из ветки `main` этого репозитория:
`https://raw.githubusercontent.com/Txmih/famevisuals-launcher/main/manifest.json`

### Пошаговая инструкция:
1. Соберите новый `.jar` клиента:
   ```powershell
   cd C:\Users\SAMSUNG\Desktop\testlayerproj
   .\gradle remapJar # или gradlew remapJar
   ```
   Скопируйте полученный файл `build\libs\famevisuals-1.0.0.jar` под именем `FameVisuals-1.21.11.jar`.

2. Посчитайте **SHA-256** хеш файла (в нижнем регистре) и размер в байтах:
   ```powershell
   (Get-FileHash .\FameVisuals-1.21.11.jar -Algorithm SHA256).Hash.ToLower()
   (Get-Item .\FameVisuals-1.21.11.jar).Length
   ```

3. Загрузите новый `.jar` в новый релиз на GitHub (например, тег `v1.2.1`):
   ```powershell
   gh release create v1.2.1 .\FameVisuals-1.21.11.jar --title "FameVisuals Mod v2.1.1" --notes "Обновление клиента"
   ```

4. Обновите `manifest.json` в корне репозитория `famevisuals-launcher`:
   - Увеличьте `"version"` (например, `"2.1.1"`).
   - Обновите `"url"` на ссылку из нового релиза (`https://github.com/Txmih/famevisuals-launcher/releases/download/v1.2.1/FameVisuals-1.21.11.jar`).
   - Вставьте новый `"sha256"` и `"size"`.
   - Если вы удалили какой-то старый официальный мод из списка `files`, лаунчер автоматически удалит его из папки `mods` игроков (при этом пользовательские моды, скачанные с Modrinth, останутся нетронутыми).

5. Добавьте запись о новой версии в `changelog.json` (не забудьте переставить `"isLatest": true` на новую запись).

6. Отправьте изменения на GitHub:
   ```powershell
   git add manifest.json changelog.json
   git commit -m "chore: update mod manifest to v2.1.1"
   git push origin main
   ```

---

## 2. Обновление самого лаунчера (`tauri-plugin-updater`)

Конфиг автообновления в `src-tauri/tauri.conf.json` проверяет файл:
`https://github.com/Txmih/famevisuals-launcher/releases/latest/download/latest.json`

### Пошаговая инструкция:
1. **Хранение ключа подписи:**
   Публичный ключ прописан в `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`), а приватный ключ хранится **только локально** на вашей машине в `C:\Users\SAMSUNG\.tauri\famevisuals.key` (никогда не добавляйте приватный ключ в Git).

2. Поднимите номер версии лаунчера (например, с `1.2.0` на `1.2.1`) в трёх файлах:
   - `package.json` -> `"version"`
   - `src-tauri/Cargo.toml` -> `version`
   - `src-tauri/tauri.conf.json` -> `"version"`

3. Соберите подписанный релизный установщик (с установленной переменной окружения ключа):
   ```powershell
   $env:TAURI_SIGNING_PRIVATE_KEY = Get-Content C:\Users\SAMSUNG\.tauri\famevisuals.key -Raw
   npm run tauri build
   ```
   Tauri создаст установщик `.exe` / `.msi` и файл подписи `.sig` в `src-tauri/target/release/bundle/`.

4. Обновите `latest.json` (укажите новую `version`, `pub_date`, `url` установщика и содержимое файла `.sig` в поле `"signature"`) и выложите всё в новый релиз на GitHub:
   ```powershell
   gh release create v1.2.1 `
     .\src-tauri\target\release\bundle\nsis\FameVisuals.Launcher_1.2.1_x64-setup.exe `
     .\latest.json `
     .\FameVisuals-1.21.11.jar `
     .\fabric-api-0.141.6+1.21.11.jar `
     --title "FameVisuals v1.2.1" --notes "Launcher update 1.2.1"
   ```
   При следующем запуске лаунчер автоматически предложит пользователям обновиться и перезапустится.
