# Vantera — TikTok Shop Affiliate Unit

Una business unit interamente composta da 6 agenti AI dedicati alla creazione e
gestione di contenuti affiliate per TikTok Shop, rappresentata come un vero
ufficio virtuale in pixel art isometrica (ispirato a Habbo Hotel, asset
originali). Web app mobile-first, installabile come PWA su iPhone, pensata per
funzionare a **costo zero** su servizi free-tier.

> ⚠️ **Stato reale**: nessuna integrazione TikTok Shop reale è presente in
> questa versione (nessuna API key, nessun endpoint inventato). Finché non
> vengono fornite credenziali reali, ogni dato commerciale è **0** o
> **"Not connected"**. Tutto ciò che vedete muoversi/lavorare nell'ufficio con
> **Demo Mode ON** è simulato ed è sempre etichettato `DEMO`.

## Stack

- **Vite + React 19 + TypeScript** — SPA statica, deployabile su qualunque hosting free-tier.
- **Tailwind CSS v4** — styling.
- **Zustand** (+ `immer`, `persist`) — stato applicativo e motore di simulazione, persistito in `localStorage` (nessun backend richiesto per la V1).
- **vite-plugin-pwa** — manifest + service worker, installabile su iPhone/Android.
- **SVG pixel-art proceduale** — l'intero ufficio, i personaggi e gli arredi sono disegnati a runtime con SVG (nessun asset proprietario, nessuna immagine esterna).

Nessuna dipendenza a pagamento. Nessuna chiave API hardcoded.

## Avvio in locale

```bash
cd vantera-tiktok-shop-affiliate-unit
npm install
npm run dev
```

Apri l'URL stampato in console (es. `http://localhost:5173`) — su desktop
usa gli strumenti di sviluppo del browser in modalità responsive/iPhone per
la resa mobile corretta, oppure apri lo stesso URL da Safari su iPhone (sulla
stessa rete, sostituendo `localhost` con l'IP del computer).

## Build di produzione

```bash
npm run build   # tsc -b && vite build → genera dist/
npm run preview # serve dist/ in locale per un test finale
```

## Deployment gratuito

L'app è **statica** (solo `dist/`), quindi va bene qualunque hosting free-tier:

- **Netlify**: è già presente `netlify.toml` (`npm run build`, publish `dist`, redirect SPA). Basta collegare il repo o fare `netlify deploy`.
- **Vercel**: è già presente `vercel.json` con build command e rewrite SPA. `vercel --prod` oppure import da dashboard.
- **GitHub Pages / Cloudflare Pages**: funzionano allo stesso modo, build command `npm run build`, output `dist`.

Nessuna variabile d'ambiente è obbligatoria per il deploy (vedi `.env.example`).

## Installazione come PWA su iPhone

1. Apri l'URL dell'app in **Safari** su iPhone.
2. Tocca l'icona di condivisione → **"Aggiungi a Home"**.
3. L'app si apre standalone (senza barra Safari), con icona e splash dedicati, safe-area corretta per notch/Dynamic Island, e supporto sia portrait che landscape.

## Come si usa

La schermata principale è **l'ufficio virtuale isometrico** — non una dashboard.
Occupa quasi tutto lo schermo; puoi trascinare con il dito per spostarti e
pizzicare per zoomare. In basso ci sono solo 3 pulsanti: **MAIL**,
**EARNINGS**, **CONTROL**. Tocca un personaggio per aprire il suo pannello di
stato (task corrente, progress, statistiche di oggi, ultimi output,
cronologia, errori).

Per vedere l'unit "viva":

1. Vai su **CONTROL**.
2. Attiva **DEMO MODE** (etichetta arancione, sempre visibile quando attivo).
3. Premi **START UNIT**.
4. Torna all'ufficio: Alessia inizia a "scoutare" prodotti, seleziona un
   candidato, cammina verso Tommaso passandogli il lavoro, e così via lungo
   la pipeline `Alessia → Tommaso → Marta → Riccardo → Elena → Federico`. A
   fine ciclo, ogni agente invia un Daily Report interno (visibile in
   **MAIL**), e Federico può generare nuovi task per gli altri in base alla
   performance simulata (replica hook vincenti, sostituzione prodotti in
   calo, ecc.).

Con **Demo Mode OFF**, l'ufficio resta vivo (i personaggi camminano, si
siedono nell'area relax) ma **nessun task viene finto**: nessuna bolla di
lavoro appare finché non esiste un task reale nello stato interno dell'app.

## I 6 agenti (nessun manager — riportano direttamente a Diego)

| Agente | Ruolo | Zona |
|---|---|---|
| Alessia Riva | Product Scout | Product Research |
| Tommaso Greco | Trend Researcher | Trend Research |
| Marta Bellini | Content Writer | Content Desk |
| Riccardo Sala | Video Maker | Video Studio |
| Elena Moretti | Publisher | Publishing Desk |
| Federico Conti | Performance Analyst | Analytics Room |

## Architettura per collegare i veri agenti in futuro

Ogni agente (`src/types/index.ts` → `Agent`) espone già lo shape minimo
richiesto: `id, name, role, status, currentTask, currentLocation, activity,
progress, lastUpdate`. Le entità `agents, tasks, products, creativeResearch,
scripts, assets, videos, publications, performance, earnings, internalMail,
activityLog` sono tutte tipizzate in `src/types/index.ts` e vivono nello
store Zustand (`src/store/useAppStore.ts`), oggi persistite in
`localStorage` dietro un'unica chiamata (`persist` middleware) — sostituibile
con un vero backend (es. Supabase/Postgres free-tier) senza toccare la UI,
basta cambiare lo storage adapter.

Il motore di simulazione (`src/sim/`, azionato da `tick()` nello store) è
isolato dalla UI: oggi guida solo dati Demo, ma la stessa pipeline di stage
(`src/sim/stages.ts`) è pensata per essere sostituita, stage per stage, da
chiamate reali a modelli/agenti AI.

## Integrazione TikTok Shop (adapter pattern)

`src/integrations/tiktokShop/`:

- `TikTokShopProvider.ts` — interfaccia astratta con `searchProducts,
  getAffiliateProducts, getProductDetails, getAffiliateOrders,
  getPerformance, publishVideo, getEarnings`.
- `MockTikTokShopProvider.ts` — implementazione demo, **funziona solo se
  Demo Mode è attivo** (altrimenti si comporta come "not connected").
- `RealTikTokShopProvider.ts` — skeleton pronto per l'integrazione reale.
  Legge solo variabili d'ambiente (`VITE_TIKTOK_APP_KEY`,
  `VITE_TIKTOK_ACCESS_TOKEN`, `VITE_TIKTOK_SHOP_ID`, ...), **nessun endpoint
  o credenziale è inventato**: finché mancano le credenziali, ogni metodo
  ritorna dati vuoti / stato `NOT_CONNECTED`.

### Cosa manca per il collegamento reale

1. Accesso da sviluppatore TikTok Shop Partner / Affiliate Open API
   (richiede approvazione TikTok — non disponibile pubblicamente al momento
   della scrittura).
2. Credenziali OAuth (app key/secret, access token, shop id) da inserire
   come variabili d'ambiente (`.env`, vedi `.env.example`) — **mai
   hardcoded**.
3. Implementare i metodi in `RealTikTokShopProvider.ts` contro gli endpoint
   reali (oggi sono stub che lanciano `not implemented yet`).
4. Collegare `publishVideo` al flusso di pubblicazione reale (oggi Elena
   "pubblica" solo in Demo Mode, con dati etichettati `DEMO`).

## Cosa è reale e cosa è Demo Mode

**Reale (funziona sempre, anche con Demo Mode OFF):**
- Interfaccia completa (ufficio, pannelli agente, Mail, Earnings, Control).
- Stato agenti persistito, log attività, toggle Start/Pause Unit.
- Ambient life dell'ufficio (idle, cammino verso l'area relax, sedute) — **senza** simulare task inesistenti.
- Adapter TikTok Shop astratto, pronto per credenziali reali.
- PWA installabile, offline-capable (service worker).

**Solo in Demo Mode (sempre etichettato `DEMO` in UI):**
- Pipeline di task simulata tra i 6 agenti, con movimento reale nell'ufficio legato allo stato interno (non animazioni casuali).
- Daily Report generati in Mail a fine di ogni ciclo pipeline.
- Numeri in Earnings (commissioni, ordini, conversioni).
- `MockTikTokShopProvider`.

## Struttura del progetto

```
src/
  types/            entità di dominio (Agent, Task, Product, ...)
  data/              definizione dei 6 agenti + contenuti demo
  integrations/tiktokShop/  adapter TikTok Shop (Provider/Mock/Real)
  store/            zustand store + selettori (earnings)
  sim/              motore di simulazione (stage pipeline, tick loop)
  components/
    office/         ufficio isometrico: iso projection, layout zone, arredi, personaggi, pan/zoom
    panels/         AgentPanel, MailScreen, EarningsScreen, ControlScreen
    nav/            bottom nav (MAIL / EARNINGS / CONTROL)
    ui/             ScreenShell condiviso
scripts/
  generate-icons.mjs  genera le icone PWA (pixel-art originali, PNG codificato a mano, zero dipendenze immagine)
```

## Test eseguiti

- `npx tsc -b` — nessun errore di tipo.
- `npx oxlint src` — nessun warning/errore.
- `npm run build` — build di produzione completata (PWA + service worker generati).
- Test funzionali end-to-end con Chromium in viewport iPhone 14 Pro: apertura app, pan/zoom ufficio, tap su personaggio → pannello, avvio Demo Mode, ciclo pipeline completo (Alessia → Federico) con movimento corretto e ritorno alla propria postazione, generazione Daily Report in Mail, calcolo Earnings da dati demo, toggle Control.
