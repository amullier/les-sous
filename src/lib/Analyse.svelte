<script>
  import { store } from './store.svelte.js'
  import { fmt, fmt0, pct, addMonths, todayKey, monthLabel } from './utils.js'

  const S = $derived(store.settings)
  const startMonth = $derived(S.startMonth || todayKey())

  // ---- période analysée ----
  let range = $state('12') // '6' | '12' | '24' | 'tout'
  let selectedCat = $state('all')

  const months = $derived.by(() => {
    const end = todayKey()
    const list = []
    let k = startMonth
    while (k <= end && list.length < 240) {
      list.push(k)
      k = addMonths(k, 1)
    }
    return range === 'tout' ? list : list.slice(-Number(range))
  })

  const EMPTY = { expenses: {} }
  const md = (k) => store.months[k] ?? EMPTY
  function catTotal(k, cat) {
    let t = null
    for (const e of cat.expenses) {
      const v = md(k).expenses[e.id]
      if (v != null) t = (t ?? 0) + v
    }
    return t
  }

  const COLORS = ['#22d3ee', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#facc15', '#60a5fa', '#f87171']
  const color = (i) => COLORS[i % COLORS.length]
  const shortLabel = (k) => `${k.slice(5)}/${k.slice(2, 4)}`

  // ---- répartition par catégorie sur la période ----
  const catSums = $derived(
    S.categories.map((cat, i) => ({
      cat,
      color: color(i),
      sum: months.reduce((a, k) => a + (catTotal(k, cat) ?? 0), 0),
    }))
  )
  const grand = $derived(catSums.reduce((a, x) => a + x.sum, 0))

  function arcPath(cx, cy, r, a0, a1) {
    const pt = (a) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`
    const large = a1 - a0 > Math.PI ? 1 : 0
    return `M ${pt(a0)} A ${r} ${r} 0 ${large} 1 ${pt(a1)}`
  }
  const donut = $derived.by(() => {
    if (grand <= 0) return []
    const segs = []
    let a = -Math.PI / 2
    for (const s of catSums) {
      if (s.sum <= 0) continue
      const a1 = a + (s.sum / grand) * 2 * Math.PI
      segs.push({ ...s, frac: s.sum / grand, d: arcPath(90, 90, 68, a + 0.012, Math.max(a + 0.02, a1 - 0.012)) })
      a = a1
    }
    return segs
  })

  // ---- évolution dans le temps ----
  const series = $derived(
    S.categories
      .map((cat, i) => ({ cat, color: color(i), pts: months.map((k) => catTotal(k, cat)) }))
      .filter((s) => selectedCat === 'all' || s.cat.id === selectedCat)
  )

  function niceMax(m) {
    const p = 10 ** Math.floor(Math.log10(m))
    const f = m / p
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
  }
  const maxY = $derived(
    niceMax(Math.max(10, ...series.flatMap((s) => s.pts.filter((v) => v != null))))
  )

  const W = 860, H = 300, PL = 62, PR = 16, PT = 16, PB = 36
  const x = (i) => PL + (i * (W - PL - PR)) / Math.max(1, months.length - 1)
  const y = (v) => PT + (1 - v / maxY) * (H - PT - PB)

  // chemin par série, coupé aux mois sans donnée
  function linePath(pts) {
    let d = '', pen = false
    pts.forEach((v, i) => {
      if (v == null) { pen = false; return }
      d += `${pen ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)} `
      pen = true
    })
    return d
  }
  const gridVals = $derived([0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY))
  const labelStep = $derived(Math.max(1, Math.ceil(months.length / 10)))

  // ---- détail d'un point du graphe (catégorie × mois) ----
  let detail = $state(null) // { catId, k }
  function togglePoint(catId, k) {
    detail = detail && detail.catId === catId && detail.k === k ? null : { catId, k }
  }
  const detailData = $derived.by(() => {
    if (!detail) return null
    const i = S.categories.findIndex((c) => c.id === detail.catId)
    if (i < 0) return null
    const cat = S.categories[i]
    const rows = cat.expenses
      .map((e) => ({ e, v: md(detail.k).expenses[e.id] }))
      .filter((r) => r.v != null)
    return { cat, k: detail.k, color: color(i), rows, total: catTotal(detail.k, cat) }
  })
</script>

<div class="analyse">
  <div class="toolbar">
    <label>
      Période
      <select bind:value={range}>
        <option value="6">6 derniers mois</option>
        <option value="12">12 derniers mois</option>
        <option value="24">24 derniers mois</option>
        <option value="tout">tout l'historique</option>
      </select>
    </label>
  </div>

  <section>
    <h2>Répartition des dépenses par catégorie</h2>
    {#if grand > 0}
      <div class="repart">
        <svg viewBox="0 0 180 180" class="donutsvg">
          {#each donut as seg (seg.cat.id)}
            <path d={seg.d} stroke={seg.color} stroke-width="26" fill="none" stroke-linecap="butt">
              <title>{seg.cat.name} : {fmt(seg.sum)} ({pct(seg.frac)})</title>
            </path>
          {/each}
          <text x="90" y="86" class="donuttotal">{fmt0(grand)}</text>
          <text x="90" y="103" class="donutsub">sur {months.length} mois</text>
        </svg>
        <ul class="legend">
          {#each [...catSums].sort((a, b) => b.sum - a.sum) as s (s.cat.id)}
            <li>
              <span class="swatch" style="background:{s.color}; box-shadow:0 0 8px {s.color}"></span>
              <span class="lname">{s.cat.name}</span>
              <span class="lval">{fmt(s.sum)}</span>
              <span class="lpct">{grand > 0 ? pct(s.sum / grand) : ''}</span>
              <span class="lavg" title="moyenne mensuelle sur la période">{fmt0(s.sum / months.length)}/mois</span>
            </li>
          {/each}
        </ul>
      </div>
    {:else}
      <p class="empty">Aucune dépense saisie sur la période.</p>
    {/if}
  </section>

  <section>
    <h2>Évolution des dépenses par catégorie</h2>
    <div class="chartbar">
      <select bind:value={selectedCat}>
        <option value="all">Toutes les catégories</option>
        {#each S.categories as c (c.id)}
          <option value={c.id}>{c.name}</option>
        {/each}
      </select>
      <div class="chips">
        {#each S.categories as c, i (c.id)}
          <button
            class="chip"
            class:on={selectedCat === 'all' || selectedCat === c.id}
            style="--c:{color(i)}"
            onclick={() => (selectedCat = selectedCat === c.id ? 'all' : c.id)}
            title="Cliquer pour isoler cette catégorie"
          >{c.name}</button>
        {/each}
      </div>
    </div>
    <svg viewBox="0 0 {W} {H}" class="chart">
      {#each gridVals as gv (gv)}
        <line x1={PL} y1={y(gv)} x2={W - PR} y2={y(gv)} class="grid" />
        <text x={PL - 8} y={y(gv) + 4} class="ylab">{fmt0(gv)}</text>
      {/each}
      {#each months as k, i (k)}
        {#if i % labelStep === 0}
          <text x={x(i)} y={H - 10} class="xlab">{shortLabel(k)}</text>
        {/if}
      {/each}
      {#each series as s (s.cat.id)}
        <path d={linePath(s.pts)} stroke={s.color} style="color:{s.color}" class="line" />
        {#each s.pts as v, i (i)}
          {#if v != null}
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <circle
              cx={x(i)}
              cy={y(v)}
              r={detail && detail.catId === s.cat.id && detail.k === months[i] ? 5 : 3.4}
              fill={s.color}
              class="pt"
              role="button"
              tabindex="0"
              onclick={() => togglePoint(s.cat.id, months[i])}
              onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && togglePoint(s.cat.id, months[i])}>
              <title>{s.cat.name} — {shortLabel(months[i])} : {fmt(v)} (cliquer pour le détail)</title>
            </circle>
          {/if}
        {/each}
      {/each}
    </svg>
    {#if detailData}
      <div class="detail" style="--c:{detailData.color}">
        <div class="dhead">
          <span class="swatch" style="background:{detailData.color}; box-shadow:0 0 8px {detailData.color}"></span>
          <b>{detailData.cat.name}</b>
          <span class="dmonth">— {monthLabel(detailData.k)}</span>
          <span class="dtotal">{fmt(detailData.total)}</span>
          <button class="close" title="Fermer" onclick={() => (detail = null)}>✕</button>
        </div>
        {#if detailData.rows.length}
          <ul>
            {#each detailData.rows as r (r.e.id)}
              <li>
                <span class="dname">{r.e.name}</span>
                <span class="dval" class:zeroval={r.v === 0}>{fmt(r.v)}</span>
                <span class="dpct">{detailData.total > 0 ? pct(r.v / detailData.total) : ''}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="empty">Aucune dépense saisie ce mois-ci.</p>
        {/if}
      </div>
    {/if}
  </section>
</div>

<style>
  .analyse { max-width: 1100px; width: 100%; margin: 0 auto; display: grid; gap: 20px; }
  section {
    border: 1px solid var(--border);
    border-radius: 18px;
    background: var(--panel);
    backdrop-filter: blur(16px) saturate(1.3);
    -webkit-backdrop-filter: blur(16px) saturate(1.3);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06);
    padding: 20px 24px;
  }
  h2 {
    margin: 0 0 16px;
    font-size: 15px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--cyan);
    text-shadow: 0 0 16px rgba(34, 211, 238, 0.5);
  }
  .toolbar { display: flex; align-items: center; gap: 10px; }
  .toolbar label { display: inline-flex; align-items: center; gap: 10px; color: var(--muted); font-size: 13px; }

  select {
    font: inherit;
    color: var(--txt);
    padding: 7px 30px 7px 12px;
    background: rgba(6, 10, 22, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 10px;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238b93ad' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 11px center;
    cursor: pointer;
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.4);
    transition: border-color 0.18s, box-shadow 0.18s;
  }
  select:focus {
    outline: none;
    border-color: rgba(167, 139, 250, 0.75);
    box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.16), 0 0 18px rgba(167, 139, 250, 0.3);
  }

  /* --- répartition --- */
  .repart { display: flex; align-items: center; gap: 34px; flex-wrap: wrap; }
  .donutsvg { width: 220px; height: 220px; flex: none; }
  .donuttotal { fill: var(--txt); font-size: 17px; font-weight: 700; text-anchor: middle; }
  .donutsub { fill: var(--muted); font-size: 9.5px; text-anchor: middle; }
  .legend { list-style: none; margin: 0; padding: 0; flex: 1; min-width: 320px; display: grid; gap: 7px; }
  .legend li {
    display: grid;
    grid-template-columns: 14px 1fr auto 52px 90px;
    align-items: center;
    gap: 10px;
    font-size: 13.5px;
  }
  .swatch { width: 11px; height: 11px; border-radius: 3px; }
  .lname { color: #c7cde0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lval { font-variant-numeric: tabular-nums; text-align: right; }
  .lpct { color: var(--muted); font-size: 12px; text-align: right; }
  .lavg { color: #5d6684; font-size: 11.5px; text-align: right; font-variant-numeric: tabular-nums; }
  .empty { color: var(--muted); font-size: 13.5px; }

  /* --- évolution --- */
  .chartbar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip {
    font: inherit;
    font-size: 12px;
    padding: 3px 11px;
    border-radius: 999px;
    border: 1px solid var(--c);
    color: var(--c);
    background: none;
    opacity: 0.35;
    cursor: pointer;
    transition: all 0.18s;
  }
  .chip.on { opacity: 1; box-shadow: 0 0 10px color-mix(in srgb, var(--c) 45%, transparent); }
  .chip:hover { opacity: 1; }
  .chart { width: 100%; height: auto; }
  .grid { stroke: rgba(255, 255, 255, 0.07); }
  .ylab { fill: var(--muted); font-size: 10.5px; text-anchor: end; font-variant-numeric: tabular-nums; }
  .xlab { fill: var(--muted); font-size: 10.5px; text-anchor: middle; }
  .line {
    fill: none;
    stroke-width: 2.2;
    stroke-linejoin: round;
    stroke-linecap: round;
    filter: drop-shadow(0 0 5px currentColor);
  }
  .pt { cursor: pointer; transition: r 0.15s; }
  .pt:hover { r: 5; }
  .pt:focus { outline: none; }

  /* --- détail d'un point --- */
  .detail {
    margin-top: 14px;
    border: 1px solid color-mix(in srgb, var(--c) 45%, transparent);
    border-radius: 12px;
    padding: 12px 16px;
    background: color-mix(in srgb, var(--c) 6%, transparent);
    box-shadow: 0 0 18px color-mix(in srgb, var(--c) 15%, transparent);
    max-width: 480px;
  }
  .dhead { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .dhead b { color: var(--txt); }
  .dmonth { color: var(--muted); font-size: 13px; }
  .dtotal { margin-left: auto; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--c); }
  .close {
    font: inherit;
    font-size: 12px;
    border: none;
    background: none;
    color: var(--muted);
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 6px;
    transition: color 0.15s;
  }
  .close:hover { color: var(--txt); }
  .detail ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 5px; }
  .detail li {
    display: grid;
    grid-template-columns: 1fr auto 48px;
    gap: 10px;
    font-size: 13px;
    align-items: center;
  }
  .dname { color: #c7cde0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dval { font-variant-numeric: tabular-nums; text-align: right; }
  .dval.zeroval { color: var(--muted); }
  .dpct { color: var(--muted); font-size: 11.5px; text-align: right; }
</style>
