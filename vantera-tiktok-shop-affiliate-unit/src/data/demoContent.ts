// Flavor content pools used ONLY by the demo simulation to make the office
// feel alive. Nothing here is a real product, a real order, or real money —
// every record produced from this file is tagged isDemo: true.

export const DEMO_PRODUCT_NAMES = [
  'Mini massaggiatore collo',
  'Organizer da viaggio pieghevole',
  'Set pennelli make-up 12pz',
  'Lampada LED da scrivania',
  'Borraccia termica 750ml',
  'Supporto telefono auto magnetico',
  'Cuscino cervicale memory foam',
  'Kit pulizia scarpe portatile',
  'Diffusore aromi USB',
  'Spazzola districante anti-nodo',
  'Porta cavi da scrivania',
  'Specchio LED da trucco',
  'Zaino antifurto porta laptop',
  'Set contenitori sottovuoto',
  'Mini stiro a vapore portatile',
]

export const DEMO_CATEGORIES = ['Beauty', 'Casa', 'Tech accessori', 'Wellness', 'Viaggio', 'Moda']

export const DEMO_HOOK_TEMPLATES = [
  'Non comprarlo finché non vedi questo',
  'Il motivo per cui tutti lo stanno ricomprando',
  '3 secondi per capire se ti serve davvero',
  'L\'ho testato per 7 giorni, ecco cosa è successo',
  'Perché è ovunque su TikTok in questo momento',
]

export const DEMO_CTA_PATTERNS = [
  'Link in vetrina',
  'Scorri per il prezzo di oggi',
  'Disponibile nello shop qui sotto',
  'Ultimi pezzi al prezzo mostrato',
]

export const DEMO_FORMAT_INSIGHTS = [
  'Hook nei primi 1.5s, prodotto in mano subito',
  'Formato POV con testo on-screen sincronizzato',
  'Confronto prima/dopo nei primi 5s',
  'Voce fuoricampo diretta, zero musica nei primi secondi',
]

export const DEMO_COMPETITOR_SIGNALS = [
  'Struttura a 3 atti: problema → prodotto → risultato',
  'Ritmo di taglio molto rapido (<1.2s per clip)',
  'CTA ripetuta 2 volte, a metà e in chiusura',
  'Molti video usano lo stesso hook testuale, poi variano il B-roll',
]

const seeds = ['a', 'b', 'c', 'd', 'e', 'f']
export function pick<T>(arr: T[], salt = 0): T {
  const i = Math.floor(Math.random() * arr.length + salt) % arr.length
  return arr[Math.max(0, i)]
}
export function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  const out: T[] = []
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length)
    out.push(copy.splice(idx, 1)[0])
  }
  return out
}
export function randomSeedTag(): string {
  return seeds[Math.floor(Math.random() * seeds.length)]
}
