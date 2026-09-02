import { uid } from './utils.js'

const KEY = 'lessous-v1'

/** true si aucune donnée n'existait au lancement (premier démarrage / données vides) */
export const startedFresh = !localStorage.getItem(KEY)

export function defaultState() {
  const pa = uid(), pc = uid()
  const cat = (name, expenses) => ({ id: uid(), name, expenses })
  const exp = (name, locked = false) => ({ id: uid(), name, locked, incomeLineId: null })
  return {
    settings: {
      people: [
        { id: pa, name: 'Personne 1' },
        { id: pc, name: 'Personne 2' },
      ],
      incomeLines: [
        { id: uid(), name: 'Salaire personne 1', personId: pa },
        { id: uid(), name: 'Salaire personne 2', personId: pc },
        { id: uid(), name: 'Recettes exceptionnelles', personId: null },
      ],
      budgetMode: 'proportional', // 'proportional' | 'equalRemaining'
      monthlyBudget: null,
      monthsToShow: 4,
      startMonth: null, // 'YYYY-MM' — par défaut : mois courant
      tutorialDone: false,
      lockCode: null, // code de masquage d'écran (confidentialité, pas de vraie sécurité)
      categories: [
        cat('Maison', [
          exp('Prêt + assurance', true),
          exp('Électricité + Gaz', true),
          exp('Eau', true),
          exp('Assurance habitation', true),
          exp('Travaux'),
        ]),
        cat('Alimentation', [
          exp('Courses'),
          exp('Restaurant & Café'),
          exp('Autres (goûter, épices…)'),
        ]),
        cat('Abonnements', [
          exp('Internet / Mobile', true),
          exp('Streaming', true),
        ]),
        cat('Transport', [exp('Essence'), exp('Train / Transports en commun')]),
        cat('Loisirs & Sorties', [exp('Activités'), exp('Bars'), exp('Vacances')]),
        cat('Autres', [exp('Cadeaux'), exp('Frais bancaires'), exp('Frais santé')]),
      ],
    },
    // 'YYYY-MM': { incomes: {lineId: n}, real: {personId: n}, expenses: {expId: n} }
    months: {},
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const d = JSON.parse(raw)
      if (d && d.settings && d.months) {
        // migrations légères
        if (d.settings.startMonth === undefined) d.settings.startMonth = null
        if (d.settings.lockCode === undefined) d.settings.lockCode = null
        for (const c of d.settings.categories)
          for (const e of c.expenses) if (e.incomeLineId === undefined) e.incomeLineId = null
        return d
      }
    }
  } catch {}
  return defaultState()
}

export const store = $state(load())

export function save() {
  localStorage.setItem(KEY, JSON.stringify(store))
}

export function replaceAll(data) {
  store.settings = data.settings
  store.months = data.months
}

// ---- Format de sauvegarde : "SOUS1:" + base64(gzip(JSON)) ----
// gzip (CompressionStream natif) = compression réelle (~-80 %), base64 = obfuscation ;
// le tout parfaitement réversible. Fallback sans gzip si l'API n'est pas dispo.

const MAGIC = 'SOUS1:'

function bytesToB64(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}
function b64ToBytes(b64) {
  return Uint8Array.from(atob(b64.trim()), (c) => c.charCodeAt(0))
}
async function pipeBytes(bytes, transform) {
  const stream = new Blob([bytes]).stream().pipeThrough(transform)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}
const gzip = (bytes) => pipeBytes(bytes, new CompressionStream('gzip'))
const gunzip = (bytes) => pipeBytes(bytes, new DecompressionStream('gzip'))
const hasGzip = typeof CompressionStream !== 'undefined'

/** Importe un fichier de sauvegarde (tous formats : gzip+base64, base64 seul, JSON en clair). */
export async function importSaveFile(file) {
  const raw = (await file.text()).trim()
  let json
  if (raw.startsWith('{')) {
    // très ancien format : JSON en clair
    json = raw
  } else {
    const bytes = b64ToBytes(raw.startsWith(MAGIC) ? raw.slice(MAGIC.length) : raw)
    // magic bytes gzip : 0x1f 0x8b
    const packed = bytes[0] === 0x1f && bytes[1] === 0x8b
    json = new TextDecoder().decode(packed ? await gunzip(bytes) : bytes)
  }
  const d = JSON.parse(json)
  if (!d.settings || !d.months) throw new Error('format invalide')
  replaceAll(d)
}

/** Télécharge un fichier de sauvegarde compressé (gzip) et encodé (base64). */
export async function exportSave() {
  const json = JSON.stringify({ settings: store.settings, months: store.months })
  let bytes = new TextEncoder().encode(json)
  if (hasGzip) bytes = await gzip(bytes)
  const blob = new Blob([MAGIC + bytesToB64(bytes)], { type: 'application/octet-stream' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  a.download = `${stamp}.ls`
  a.click()
  URL.revokeObjectURL(a.href)
}
