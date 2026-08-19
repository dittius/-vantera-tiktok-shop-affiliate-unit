# Vantera — TikTok Shop Affiliate Unit

Una business unit di 6 agenti AI che cercano, creano, pubblicano e ottimizzano
contenuti affiliate per TikTok Shop **in autonomia, nel cloud** — rappresentata
come un vero ufficio virtuale in pixel art isometrica (ispirato a Habbo Hotel,
asset originali). PWA mobile-first installabile su iPhone. Costo operativo: **0 €**.

> ⚠️ **Stato reale**: nessuna integrazione TikTok Shop è ancora collegata
> (nessuna API key fornita, nessun endpoint inventato). Finché non colleghi
> TikTok Shop, ogni dato commerciale è onestamente **0** o **"Not connected"**
> — vedi "Cosa è reale e cosa è Demo Mode" più sotto.

## Come funziona, in una frase

Un **worker autonomo gira su GitHub Actions** (non sul tuo computer) ogni ~20
minuti, fa lavorare i 6 agenti su dati reali e scrive lo stato in
`server/data/*.json`, che GitHub stesso versiona (= database gratuito e
verificabile). La **PWA** (deployata su GitHub Pages) legge quello stato in
tempo reale e lo mostra nell'ufficio — non lo simula più. Se chiudi l'app o
spegni il telefono, il worker continua comunque a girare.

## Architettura

```
┌─────────────────────┐        legge server/data/*.json        ┌──────────────────────────┐
│   PWA (frontend)     │ ───────────────────────────────────►  │  GitHub repo (main)      │
│   React + Vite       │        (raw.githubusercontent.com)     │  = database versionato    │
│   deploy: GitHub      │                                         │  server/data/*.json       │
│   Pages               │ ◄───── scrive control.json (PAT) ─────  │  server/media (release)   │
└─────────────────────┘        via api.github.com                └──────────────────────────┘
                                                                            ▲
                                                                            │ commit ogni ciclo
                                                                    ┌───────┴────────┐
                                                                    │ GitHub Actions  │
                                                                    │ unit-cycle.yml  │
                                                                    │ (cron ogni 20') │
                                                                    │ 6 agent workers │
                                                                    │ ffmpeg + TTS    │
                                                                    └────────────────┘
```

Zero server always-on, zero database a pagamento, zero credit card. GitHub è
sia lo scheduler (Actions), sia il database (JSON versionato in git), sia lo
storage media (Release assets) — tutto free-tier.

## Stack

- **Frontend**: Vite + React 19 + TypeScript + Tailwind v4, Zustand per stato UI locale (non più fonte di verità del lavoro). PWA via `vite-plugin-pwa`. Deploy: GitHub Pages.
- **Backend/worker**: Node 22 + TypeScript, eseguito da GitHub Actions (`vantera-tiktok-shop-affiliate-unit/server`). Database: file JSON versionati in git (`server/data/`) — durevole, gratuito, auditabile via `git log`.
- **Video**: ffmpeg (preinstallato sui runner GitHub) + `espeak-ng` (voiceover TTS reale, gratuito, offline). Output: MP4 reali, caricati come asset di una GitHub Release (storage media gratuito).
- **TikTok Shop**: adapter astratto (`server/src/integrations/tiktok/`), credenziali solo lato server (GitHub Actions Secrets), mai nel frontend.

Nessuna dipendenza a pagamento. Nessuna chiave API hardcoded.

## Avvio in locale (frontend)

```bash
cd vantera-tiktok-shop-affiliate-unit
npm install
npm run dev
```

## Avvio in locale (un ciclo del worker, per debug)

```bash
cd vantera-tiktok-shop-affiliate-unit/server
npm install
npm run cycle   # scrive/aggiorna server/data/*.json
```

Senza credenziali TikTok, il ciclo gira comunque: Alessia risulterà
onestamente `BLOCKED` con il motivo esatto. Nessun crash, nessun dato finto.

## Build di produzione

```bash
npm run build   # tsc -b && vite build → genera dist/
npm run preview # serve dist/ in locale
```

## Deployment — cosa è già pronto

- **`.github/workflows/unit-cycle.yml`**: il worker autonomo. Cron ogni 20
  minuti + trigger manuale. Installa `espeak-ng`, esegue un ciclo reale,
  committa `server/data/*.json` se cambiato. **Gira solo sul branch
  `main`** (limite di GitHub Actions per gli schedule) — va quindi mergiato.
- **`.github/workflows/deploy-pages.yml`**: build del frontend e deploy su
  GitHub Pages a ogni push su `main`.
- **`netlify.toml` / `vercel.json`**: alternative per il frontend se preferisci
  Netlify/Vercel invece di Pages (il worker su Actions resta identico).

### Cosa manca perché sia pubblicamente online — azioni richieste a te

1. **Rendere il repository pubblico** (Settings → General → Danger Zone →
   Change visibility). GitHub Pages gratuito richiede un repo pubblico su
   piano free, e la PWA legge `server/data/*.json` da
   `raw.githubusercontent.com`, che serve solo repo pubblici senza token.
   Nessun segreto verrebbe esposto: le credenziali TikTok vivono solo in
   GitHub Actions Secrets, mai nel codice.
2. **Abilitare GitHub Pages** (Settings → Pages → Source: **GitHub Actions**)
   — un solo click, poi `deploy-pages.yml` fa il resto a ogni push su `main`.
3. **Mergiare questo branch su `main`** — gli schedule di GitHub Actions
   partono solo dal branch di default.

Una volta fatto questo, l'unit inizia a girare da sola ogni 20 minuti
(risultato onesto: agenti `BLOCKED` finché non colleghi TikTok — vedi sotto),
e la PWA è raggiungibile su `https://<tuo-utente>.github.io/-vantera-tiktok-shop-affiliate-unit/`.

## Installazione come PWA su iPhone

1. Apri l'URL dell'app in **Safari** su iPhone.
2. Tocca l'icona di condivisione → **"Aggiungi a Home"**.
3. L'app si apre standalone, con icona e splash dedicati, safe-area corretta
   per notch/Dynamic Island, portrait e landscape.

## Onboarding — le uniche due cose da fare, una volta sola

Al primo avvio l'app mostra una guida con due passaggi reali (niente
configurazioni tecniche superflue, nessuna API key da incollare in un file):

1. **Connetti GitHub** (da **CONTROL**): crea un **Personal Access Token
   fine-grained** su GitHub → Settings → Developer settings → Fine-grained
   tokens → scoped **solo a questo repository**, permessi *Contents:
   Read & write* + *Actions: Read & write*. Incollalo in CONTROL — resta
   salvato solo nel tuo browser, non viene mai inviato altrove che a
   `api.github.com`. Serve per far funzionare i pulsanti START/PAUSE/EMERGENCY
   STOP da telefono (la PWA è statica: non ha un server suo per scrivere lo
   stato, quindi scrive direttamente su GitHub con il tuo token).
2. **Connetti TikTok Shop** (quando vuoi — non blocca il resto): registra
   un'app su [partner.tiktokshop.com](https://partner.tiktokshop.com)
   (Affiliate API, accesso sviluppatore gratuito, richiede review TikTok),
   completa l'autorizzazione OAuth per il tuo account seller/affiliate, poi
   aggiungi `TIKTOK_APP_KEY`, `TIKTOK_APP_SECRET`, `TIKTOK_ACCESS_TOKEN`,
   `TIKTOK_REFRESH_TOKEN`, `TIKTOK_SHOP_CIPHER` come GitHub Actions Secrets
   (Settings → Secrets and variables → Actions). Finché non lo fai, Alessia
   resta onestamente `BLOCKED` con questo identico messaggio, visibile nel
   suo pannello.

Poi premi **START UNIT** in Control. Da quel momento il worker gira da solo
ogni ~20 minuti, telefono e computer spenti inclusi.

## Come si usa

La schermata principale è **l'ufficio virtuale isometrico** — non una
dashboard. Trascina per muoverti, pizzica per zoomare. In basso: **MAIL**,
**EARNINGS**, **CONTROL**. Tocca un personaggio per il suo pannello di stato
(task corrente, progress, statistiche di oggi, ultimi output, cronologia,
errori) — **con Demo Mode OFF, tutto qui viene letto dal backend reale**:
se Alessia sta davvero analizzando prodotti, la vedi al lavoro con quel task;
se Elena è bloccata perché manca un'autorizzazione, la vedi bloccata con
quel motivo esatto ("ACTION REQUIRED" in arancione).

## I 6 agenti (nessun manager — riportano direttamente a Diego)

| Agente | Ruolo | Zona | Cosa fa davvero |
|---|---|---|---|
| Alessia Riva | Product Scout | Product Research | Cerca prodotti reali via TikTok Shop Affiliate API, li valuta con uno score spiegabile, salva fonte e timestamp |
| Tommaso Greco | Trend Researcher | Trend Research | Analizza segnali reali (via una search API collegabile) per hook/pain point/format, mai inventati |
| Marta Bellini | Content Writer | Content Desk | Genera concept/script/storyboard/caption reali dal brief di Tommaso (regole deterministiche, nessuna dipendenza esterna) |
| Riccardo Sala | Video Maker | Video Studio | Renderizza un vero MP4 (ffmpeg + voiceover TTS reale), lo carica come asset pubblico |
| Elena Moretti | Publisher | Publishing Desk | Prepara caption/hashtag/disclosure AI/metadata reali; TikTok non permette auto-publish pubblico a terze parti non audit, quindi crea un singolo handoff umano minimo |
| Federico Conti | Performance Analyst | Analytics Room | Analizza solo metriche reali (TikTok API o inserite da te), decide SCALE/ITERATE/RETEST/PAUSE/KILL, genera nuovi task |

Federico può generare nuovi task per Alessia, Tommaso, Marta o Riccardo in
base alle performance reali — vedi `server/src/agents/federico.ts`.

## TikTok Shop — cosa è verificato e cosa manca

Verificato via ricerca (i domini TikTok sono bloccati dalla rete di questo
ambiente di sviluppo, quindi la documentazione esatta non è stata letta
direttamente — nessun endpoint è stato inventato):

- Esiste un programma **Affiliate API** aperto agli sviluppatori dal 2024,
  con accesso base gratuito, tramite registrazione app + review su
  [partner.tiktokshop.com](https://partner.tiktokshop.com).
- Esiste una **Finance API** per settlement/payout/commissioni.
- Il **Content Posting API** di TikTok (prodotto separato, non TikTok Shop)
  permette upload video via API, ma per app non audit il post arriva come
  bozza privata sull'account del creator collegato — **non pubblica
  pubblicamente per conto terzi**. Per questo Elena prepara tutto e lascia
  un solo passaggio umano finale, invece di fingere un auto-publish che
  TikTok non permette.

`server/src/integrations/tiktok/RealTikTokShopProvider.ts` implementa la
firma delle richieste (HMAC-SHA256, come da convenzione TikTok Shop Open
API) e la gestione delle credenziali, ma lascia i **path esatti degli
endpoint** come variabili d'ambiente da compilare (`TIKTOK_API_BASE_URL`,
`TIKTOK_API_PRODUCTS_SEARCH_PATH`, ...) una volta che hai accesso reale a
Partner Center e puoi confermarli — non tenta di indovinarli.

## Cosa è reale e cosa è Demo Mode

**Reale (sempre, con Demo Mode OFF — il default):**
- Worker autonomo su GitHub Actions, database versionato in git, storage video su GitHub Releases.
- I 6 agenti con logica reale: ricerca prodotti (se TikTok connesso), script generati da brief reali, video renderizzati per davvero con ffmpeg, publishing con handoff umano reale, performance solo da dati reali.
- Retry, timeout (45 min), idempotenza (idempotencyKey per task), heartbeat, recovery dopo crash (ogni ciclo riparte da dove si trovava lo stato committato).
- MAIL, EARNINGS, CONTROL letti dal backend reale — 0/NOT CONNECTED finché non c'è un dato reale dietro.
- Nessun token/secret nel frontend: le credenziali TikTok stanno solo in GitHub Actions Secrets; il PAT GitHub che tu incolli resta solo nel tuo browser.

**Solo in Demo Mode (sempre etichettato `DEMO`, mai attivo di default):**
- La pipeline simulata originale (`src/sim/`), identica a prima: utile per showcase/test dell'interfaccia senza aspettare dati reali.

## Sicurezza

- Le credenziali TikTok esistono solo come GitHub Actions Secrets, mai committate, mai nel bundle frontend.
- Il PAT GitHub che l'utente collega da Control resta in `localStorage` del suo browser, usato solo per chiamare `api.github.com` direttamente (nessun server intermedio che potrebbe intercettarlo).
- `EMERGENCY STOP` ferma immediatamente il worker (scrive `emergencyStop: true`, controllato a inizio di ogni ciclo prima di eseguire qualunque agente).
- Ogni azione degli agenti è loggata in `activityLog` con timestamp, agente, esito.

## Struttura del progetto

```
vantera-tiktok-shop-affiliate-unit/
  src/                          frontend PWA
    types/                      entità dominio (shape UI) + real.ts (shape backend)
    integrations/github/        client per leggere/scrivere lo stato reale via GitHub API
    store/useRealStore.ts       stato reale (fetch da server/data/*.json)
    store/useAppStore.ts        stato Demo Mode (motore di simulazione originale, invariato)
    store/useOfficeAgents.ts    seleziona reale vs demo per l'ufficio
    components/office/          ufficio isometrico (pixel art, invariato)
    components/onboarding/      guida al primo avvio
  server/                       backend/worker (NON deployato come server — eseguito da Actions)
    src/db/                     store JSON file-based (repo.ts, store.ts)
    src/agents/                 alessia.ts ... federico.ts — logica reale di ciascun agente
    src/integrations/tiktok/    RealTikTokShopProvider (server-side, HMAC signing)
    src/video/                  render.ts (ffmpeg), tts.ts (espeak-ng)
    src/media/                  upload video su GitHub Release
    src/run-cycle.ts            entrypoint eseguito da unit-cycle.yml
    data/                       "database" — JSON versionati in git (creati al primo run)
.github/workflows/
  unit-cycle.yml                worker autonomo (cron ogni 20 min)
  deploy-pages.yml               deploy frontend su GitHub Pages
```

## Test eseguiti

- `npx tsc -b` (frontend e server) — nessun errore di tipo.
- `npx oxlint src` — nessun warning/errore.
- `npm run build` (frontend, con e senza `VITE_BASE_PATH`) — build di produzione completata.
- **Worker**: ciclo reale eseguito in locale più volte di seguito — idempotente, heartbeat e contatori corretti, Alessia onestamente `BLOCKED` senza credenziali TikTok, nessun crash.
- **Rendering video**: renderizzato un vero MP4 (1080×1920, H.264 + AAC, voiceover `espeak-ng` reale, caption bruciate, durata verificata con `ffprobe`) da un content-strategy di test.
- **Frontend end-to-end** (Chromium, viewport iPhone 14 Pro): onboarding, ufficio con agenti onestamente `IDLE`/`BLOCKED` senza backend connesso, Control con flusso di connessione GitHub, Earnings/Mail correttamente a zero/vuoti senza dati reali, e — in Demo Mode — l'intera pipeline simulata originale ancora funzionante senza regressioni.
