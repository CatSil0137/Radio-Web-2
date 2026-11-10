# Here are your Instructions

# 📻 Radio Web — App Android (APK) e Windows (EXE)

L'app funziona ora in modo autonomo: interroga direttamente l'API pubblica
[Radio Browser](https://www.radio-browser.info/) e salva i preferiti sul
dispositivo, quindi non serve il backend per le versioni installabili.

## Scaricare APK ed EXE già pronti

Ogni push esegue il workflow **Build Android APK & Windows EXE**
(`.github/workflows/build-apps.yml`). Da GitHub → *Actions* → ultima
esecuzione → sezione *Artifacts*:

- `RadioWeb-android-apk` → `RadioWeb.apk` (installabile su Android 7+;
  abilita "Installa app sconosciute")
- `RadioWeb-windows-exe` → `RadioWeb-Setup-x.y.z.exe` (installer) e
  `RadioWeb-Portable-x.y.z.exe` (non richiede installazione)

Creando un tag `v1.0.0` (`git tag v1.0.0 && git push --tags`) i file vengono
allegati anche a una *Release* GitHub.

## Build in locale

Android (richiede Android Studio / Android SDK e JDK 21):

```bash
cd frontend
yarn install
yarn android:sync          # build React + copia nel progetto Android
cd android && ./gradlew assembleDebug
# APK: frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

Windows (da eseguire su Windows):

```bash
cd frontend && yarn install && yarn build
cd ../desktop && npm install
npm start                  # prova l'app
npm run dist:win           # crea gli .exe in desktop/release
```

L'icona dell'app è in `frontend/assets/icon-only.png`; dopo averla cambiata
esegui `yarn android:icons` in `frontend` e copiala in `desktop/build/icon.png`.
