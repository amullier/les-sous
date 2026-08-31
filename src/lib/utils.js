export const uid = () => Math.random().toString(36).slice(2, 10)

export function fmt(n, dec = 2) {
  if (n == null || isNaN(n)) return ''
  return n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + ' €'
}
export const fmt0 = (n) => fmt(n, 0)

export function pct(n) {
  if (n == null || isNaN(n) || !isFinite(n)) return ''
  return Math.round(n * 100) + ' %'
}

// Accepte "12", "12,5", "1 200", "11,2+50+60", "100-20"…
export function parseAmount(s) {
  s = String(s).replace(/[\s€]/g, '').replace(/,/g, '.')
  if (s === '') return null
  if (!/^[-+]?\d+(\.\d+)?([+-]\d+(\.\d+)?)*$/.test(s)) return undefined
  const parts = s.match(/[-+]?\d+(\.\d+)?/g)
  return Math.round(parts.reduce((a, b) => a + parseFloat(b), 0) * 100) / 100
}

export function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function addMonths(key, n) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

// Tendance vs mois précédent
export function trend(cur, prev) {
  if (cur == null && prev == null) return { s: '–', c: 'flat' }
  if (prev == null) return { s: '→', c: 'flat' }
  if (cur == null) return { s: '–', c: 'flat' }
  const d = cur - prev
  if (Math.abs(d) < 1) return { s: '≈', c: 'flat' }
  const r = d / Math.max(Math.abs(prev), 1)
  if (r >= 0.25) return { s: '↗↗', c: 'up' }
  if (r > 0) return { s: '↗', c: 'up' }
  if (r <= -0.25) return { s: '↘↘', c: 'down' }
  return { s: '↘', c: 'down' }
}
