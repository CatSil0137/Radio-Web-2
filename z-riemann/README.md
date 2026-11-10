# Z Riemann Visualizer — app Android e Windows

App Android (Capacitor) costruita da `src/zeta-riemann.html`. Funziona
offline: tutto (three.js, immagini, audio) è incorporato nel file HTML.

## Scaricare l'APK

GitHub → *Actions* → **Build Z Riemann Visualizer APK** → ultima esecuzione →
*Artifacts* → `Z-Riemann-Visualizer-apk`.
Con un tag `z-riemann-v1.0.0` l'APK viene allegato anche a una Release.

## Aggiornare l'app

1. Sostituisci `src/zeta-riemann.html` con la nuova versione (stesso nome).
2. Fai commit e push: il workflow ricrea l'APK.
3. Alza `versionCode`/`versionName` in `android/app/build.gradle` se vuoi che
   Android la installi come aggiornamento sopra la precedente con un numero nuovo.

## Cosa aggiunge la versione Android

`src/native-bridge.js` viene iniettato nella pagina e, solo dentro l'app:
- i file esportati (PNG, CSV, PDF, HTML, video) vengono salvati in
  **Documenti/Z Riemann Visualizer**; se non è possibile si apre il menu
  Condividi;
- `navigator.share` (opzione "Salva con Condividi") usa il menu di Android;
- `speechSynthesis` (voci del Tour nelle lingue diverse dall'italiano e
  «Voce del dispositivo») usa la sintesi vocale di Android tramite il plugin
  `@capacitor-community/text-to-speech`. Le voci disponibili sono quelle
  installate in Impostazioni → Sintesi vocale (Google Speech Services);
- i link esterni si aprono nel browser.

`MainActivity.java` abilita il vero schermo intero (vista 3D, lettore video);
il manifest chiede il microfono (commento vocale nelle registrazioni) e la
vibrazione.

## Build in locale

```bash
cd z-riemann
npm install
npm run sync                 # crea www/ e lo copia nel progetto Android
cd android && ./gradlew assembleDebug
```

Icona: `assets/` → `npm run icons` per rigenerarla.

## Versione Windows portabile

`desktop/` contiene la versione Windows (Electron): un solo file
`Z-Riemann-Visualizer-Portable-x.y.z.exe` che si avvia senza installazione.
Si scarica dallo stesso workflow, artifact `Z-Riemann-Visualizer-windows-portable`.

- I file esportati si salvano con la normale finestra "Salva con nome".
- Le voci del Tour usano le voci di Windows (Impostazioni → Ora e lingua →
  Voce / Lingua: aggiungi la lingua con la sintesi vocale).
- F11 = schermo intero.

Build in locale (su Windows): `cd z-riemann/desktop && npm install && npm run dist:win`.
