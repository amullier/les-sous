<script>
  import { store } from './store.svelte.js'
  import { fmt, fmt0, addMonths, todayKey, monthLabel } from './utils.js'
  import AmountInput from './AmountInput.svelte'
  import Icon from './Icon.svelte'

  const S = $derived(store.settings)
  const startMonth = $derived(S.startMonth || todayKey())

  // ---- sélection : une personne ou tout le foyer ----
  let who = $state('all') // 'all' | personId

  // ---- accès aux données : sv(k)[pid] = montant AJOUTÉ à l'épargne ce mois-ci ----
  const sv = (k) => store.months[k]?.savings ?? {}
  function ensure(k) {
    if (!store.months[k]) store.months[k] = { incomes: {}, real: {}, expenses: {}, savings: {} }
    if (!store.months[k].savings) store.months[k].savings = {}
    return store.months[k].savings
  }
  function setSaving(k, pid, v) {
    const s = ensure(k)
    if (v == null) delete s[pid]
    else s[pid] = v
  }

  // liste des mois : du début du suivi au mois courant + 12 mois à venir (planification)
  const FUTURE_MONTHS = 12
  const pastMonths = $derived.by(() => {
    const end = todayKey()
    const list = []
    let k = startMonth
    while (k <= end && list.length < 240) {
      list.push(k)
      k = addMonths(k, 1)
    }
    return list
  })
  const months = $derived.by(() => {
    const list = [...pastMonths]
    let k = list[list.length - 1]
    for (let i = 0; i < FUTURE_MONTHS; i++) {
      k = addMonths(k, 1)
      list.push(k)
    }
    return list
  })
  const todayIdx = $derived(pastMonths.length - 1)
  const isFuture = (k) => k > todayKey()

  const COLORS = ['#22d3ee', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#facc15']
  const personColor = (pid) => COLORS[Math.max(0, S.people.findIndex((p) => p.id === pid)) % COLORS.length]

  // ---- séries : solde cumulé = épargne de départ + versements ----
  const initOf = (pid) => S.savingsInit?.[pid] ?? null
  function setInit(pid, v) {
    if (!S.savingsInit) S.savingsInit = {}
    if (v == null) delete S.savingsInit[pid]
    else S.savingsInit[pid] = v
  }

  // pts[i] = solde à la fin de months[i] (null avant la 1re donnée)
  // Mois futurs : versement saisi s'il existe, sinon rythme moyen.
  function buildSeries(pid) {
    const init = initOf(pid)
    const pts = []
    let bal = init
    let contribs = 0
    let firstContribIdx = -1

    // 1) passé : solde réel + rythme moyen
    for (let i = 0; i <= todayIdx; i++) {
      const c = sv(months[i])[pid]
      if (c != null && firstContribIdx < 0) firstContribIdx = i
      if (c != null || bal != null) bal = (bal ?? 0) + (c ?? 0)
      if (firstContribIdx >= 0) contribs += c ?? 0
      pts.push(bal)
    }
    const span = firstContribIdx >= 0 ? todayIdx - firstContribIdx + 1 : 0
    const rate = span > 0 ? contribs / span : null // versement moyen / mois
    const atToday = bal

    // 2) futur : versement prévu saisi, sinon rythme moyen
    for (let i = todayIdx + 1; i < months.length; i++) {
      const c = sv(months[i])[pid]
      if (c != null || bal != null) bal = (bal ?? 0) + (c ?? rate ?? 0)
      pts.push(bal)
    }
    return { pid, pts, current: atToday, end: bal, rate }
  }

  const allSeries = $derived(S.people.map((p) => ({ ...buildSeries(p.id), name: p.name, color: personColor(p.id) })))
  const visible = $derived(who === 'all' ? allSeries : allSeries.filter((s) => s.pid === who))

  // ---- indicateurs (cumul de la sélection) ----
  const withData = $derived(visible.filter((s) => s.current != null))
  const current = $derived(withData.length ? withData.reduce((a, s) => a + s.current, 0) : null)
  const monthlyRate = $derived.by(() => {
    const rs = visible.filter((s) => s.rate != null)
    return rs.length ? rs.reduce((a, s) => a + s.rate, 0) : null
  })
  const proj1 = $derived.by(() => {
    const vs = visible.map((s) => valueAt(s, todayIdx + 12)).filter((v) => v != null)
    return vs.length ? vs.reduce((a, v) => a + v, 0) : null
  })
  const proj5 = $derived.by(() => {
    const vs = visible.map((s) => valueAt(s, todayIdx + 60)).filter((v) => v != null)
    return vs.length ? vs.reduce((a, v) => a + v, 0) : null
  })
  const hasData = $derived(withData.length > 0)

  // ---- graphique : historique + 12 mois planifiés + projection jusqu'à 5 ans ----
  const PROJ_MONTHS = 48 // après les 12 mois planifiés → horizon 5 ans
  const chartMonths = $derived.by(() => {
    const list = [...months]
    let k = months[months.length - 1]
    for (let i = 0; i < PROJ_MONTHS; i++) {
      k = addMonths(k, 1)
      list.push(k)
    }
    return list
  })
  const projStartIdx = $derived(months.length - 1)

  /** valeur d'une série à l'index i du graphe (historique, planifié ou projeté) */
  function valueAt(s, i) {
    if (i <= projStartIdx) return s.pts[i]
    if (s.end == null || s.rate == null) return null
    return s.end + s.rate * (i - projStartIdx)
  }

  function niceMax(m) {
    const p = 10 ** Math.floor(Math.log10(m))
    const f = m / p
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
  }
  const maxY = $derived.by(() => {
    let m = 100
    for (const s of visible) {
      for (const v of s.pts) if (v != null && v > m) m = v
      const end = valueAt(s, chartMonths.length - 1)
      if (end != null && end > m) m = end
    }
    return niceMax(m)
  })

  const W = 860, H = 300, PL = 70, PR = 16, PT = 16, PB = 36
  const x = $derived((i) => PL + (i * (W - PL - PR)) / Math.max(1, chartMonths.length - 1))
  const y = $derived((v) => PT + (1 - Math.max(0, v) / maxY) * (H - PT - PB))

  function pathBetween(s, from, to) {
    let d = '', pen = false
    for (let i = from; i <= to; i++) {
      const v = s.pts[i]
      if (v == null) { pen = false; continue }
      d += `${pen ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)} `
      pen = true
    }
    return d
  }
  const histPath = (s) => pathBetween(s, 0, todayIdx)
  const plannedPath = (s) => pathBetween(s, todayIdx, projStartIdx)
  function projPath(s) {
    if (s.end == null || s.rate == null) return ''
    let d = `M ${x(projStartIdx).toFixed(1)} ${y(s.end).toFixed(1)} `
    for (let i = 1; i <= PROJ_MONTHS; i++)
      d += `L ${x(projStartIdx + i).toFixed(1)} ${y(valueAt(s, projStartIdx + i)).toFixed(1)} `
    return d
  }

  const gridVals = $derived([0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY))
  const labelStep = $derived(Math.max(1, Math.ceil(chartMonths.length / 12)))
  const shortLabel = (k) => `${k.slice(5)}/${k.slice(2, 4)}`

  // repères aujourd'hui / 1 an / 5 ans
  const mark1 = $derived(todayIdx + 12)
  const mark5 = $derived(todayIdx + 60)

  // ---- crosshair "trader" : pointillés vers les axes au survol ----
  let svgEl = $state(null)
  let hover = $state(null) // index dans chartMonths
  function onmove(e) {
    if (!svgEl) return
    const r = svgEl.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const i = Math.round(((px - PL) / (W - PL - PR)) * (chartMonths.length - 1))
    hover = i >= 0 && i < chartMonths.length ? i : null
  }
  const hoverData = $derived.by(() => {
    if (hover == null) return null
    const vals = visible
      .map((s) => ({ s, v: valueAt(s, hover) }))
      .filter((d) => d.v != null)
    if (!vals.length) return null
    return { i: hover, k: chartMonths[hover], proj: hover > todayIdx, vals }
  })

  // ---- tableau de saisie : mois du plus récent au plus ancien ----
  const rows = $derived([...months].reverse())
</script>

<div class="epargne">
  <div class="toolbar">
    <div class="chips">
      <button class="chip" class:on={who === 'all'} onclick={() => (who = 'all')}>
        <Icon name="wallet" size={13} /> Foyer
      </button>
      {#each S.people as p (p.id)}
        <button class="chip" class:on={who === p.id} style="--c:{personColor(p.id)}" onclick={() => (who = p.id)}>{p.name}</button>
      {/each}
    </div>
  </div>

  <section class="cards">
    <div class="card">
      <span class="clabel">Épargne cumulée</span>
      <span class="cval">{current != null ? fmt(current) : '—'}</span>
      <span class="csub">{who === 'all' ? 'foyer' : (S.people.find((p) => p.id === who)?.name ?? '')}</span>
    </div>
    <div class="card">
      <span class="clabel">Versement moyen</span>
      <span class="cval" class:neg={monthlyRate != null && monthlyRate < 0}>
        {monthlyRate != null ? (monthlyRate >= 0 ? '+' : '') + fmt0(monthlyRate) : '—'}
      </span>
      <span class="csub">par mois</span>
    </div>
    <div class="card proj">
      <span class="clabel">Projection à 1 an</span>
      <span class="cval">{proj1 != null ? fmt0(proj1) : '—'}</span>
      <span class="csub">versements prévus, sinon rythme moyen</span>
    </div>
    <div class="card proj">
      <span class="clabel">Projection à 5 ans</span>
      <span class="cval">{proj5 != null ? fmt0(proj5) : '—'}</span>
      <span class="csub">au rythme moyen</span>
    </div>
  </section>

  <section>
    <h2>Évolution &amp; projection</h2>
    {#if hasData}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <svg
        viewBox="0 0 {W} {H}"
        class="chart"
        role="img"
        bind:this={svgEl}
        onpointermove={onmove}
        onpointerleave={() => (hover = null)}
      >
        {#each gridVals as gv (gv)}
          <line x1={PL} y1={y(gv)} x2={W - PR} y2={y(gv)} class="grid" />
          <text x={PL - 8} y={y(gv) + 4} class="ylab">{fmt0(gv)}</text>
        {/each}
        {#each chartMonths as k, i (k)}
          {#if i % labelStep === 0}
            <text x={x(i)} y={H - 10} class="xlab">{shortLabel(k)}</text>
          {/if}
        {/each}
        <line x1={x(todayIdx)} y1={PT} x2={x(todayIdx)} y2={H - PB} class="marknow" />
        <text x={x(todayIdx)} y={PT + 10} class="marklabnow">aujourd'hui</text>
        <line x1={x(mark1)} y1={PT} x2={x(mark1)} y2={H - PB} class="mark" />
        <text x={x(mark1)} y={PT + 10} class="marklab">1 an</text>
        <line x1={x(mark5)} y1={PT} x2={x(mark5)} y2={H - PB} class="mark" />
        <text x={x(mark5)} y={PT + 10} class="marklab">5 ans</text>

        {#each visible as s (s.pid)}
          <path d={projPath(s)} class="line projline" style="stroke:{s.color}" />
          <path d={plannedPath(s)} class="line plannedline" style="stroke:{s.color}" />
          <path d={histPath(s)} class="line histline" style="stroke:{s.color}; color:{s.color}" />
          {#each s.pts as v, i (i)}
            {#if v != null && sv(months[i])[s.pid] != null}
              <circle cx={x(i)} cy={y(v)} r="3.2" fill={s.color} class="pt">
                <title>{s.name} — {monthLabel(months[i])} : solde {fmt(v)} (versé {fmt(sv(months[i])[s.pid])})</title>
              </circle>
            {/if}
          {/each}
        {/each}

        {#if hoverData}
          <!-- verticale vers l'axe des abscisses -->
          <line x1={x(hoverData.i)} y1={PT} x2={x(hoverData.i)} y2={H - PB} class="cross" />
          <rect x={x(hoverData.i) - 26} y={H - PB + 4} width="52" height="16" rx="4" class="tagbox" />
          <text x={x(hoverData.i)} y={H - PB + 15.5} class="tagx">{shortLabel(hoverData.k)}</text>
          {#each hoverData.vals as d (d.s.pid)}
            <!-- horizontale vers l'axe des ordonnées -->
            <line x1={PL} y1={y(d.v)} x2={x(hoverData.i)} y2={y(d.v)} class="cross" style="stroke:{d.s.color}" />
            <rect x={2} y={y(d.v) - 8.5} width={PL - 6} height="17" rx="4" class="tagbox" style="stroke:{d.s.color}" />
            <text x={PL - 10} y={y(d.v) + 3.5} class="tagy" style="fill:{d.s.color}">{fmt0(d.v)}</text>
            <circle cx={x(hoverData.i)} cy={y(d.v)} r="4.4" class="crossdot" style="fill:{d.s.color}" />
          {/each}
        {/if}
      </svg>

      {#if hoverData}
        <div class="tooltipbar">
          <b>{monthLabel(hoverData.k)}</b>
          {#if hoverData.proj}<span class="projtag">projection</span>{/if}
          {#each hoverData.vals as d (d.s.pid)}
            <span class="tval" style="--c:{d.s.color}"><span class="lswatch solid" style="border-color:{d.s.color}"></span>{d.s.name} : <b>{fmt0(d.v)}</b></span>
          {/each}
          {#if who === 'all' && hoverData.vals.length > 1}
            <span class="tval total">Foyer : <b>{fmt0(hoverData.vals.reduce((a, d) => a + d.v, 0))}</b></span>
          {/if}
        </div>
      {:else}
        <div class="legendline">
          {#each visible as s (s.pid)}
            <span><span class="lswatch solid" style="border-color:{s.color}"></span> {s.name}</span>
          {/each}
          <span><span class="lswatch planned"></span> 12 prochains mois (versements prévus, sinon rythme moyen)</span>
          <span><span class="lswatch dashed"></span> projection au rythme moyen</span>
        </div>
      {/if}
    {:else}
      <p class="empty">Aucun versement saisi. Renseignez ce que vous avez mis de côté chaque mois dans le tableau ci-dessous.</p>
    {/if}
  </section>

  <section>
    <h2>Versements mensuels</h2>
    <p class="hint">Saisissez le <b>montant ajouté à l'épargne</b> chaque mois par chaque personne (négatif si vous avez puisé dedans). Les 12 prochains mois sont ouverts à la saisie pour planifier vos versements à venir.</p>
    <table>
      <thead>
        <tr>
          <th class="mcol">Mois</th>
          {#each S.people as p (p.id)}
            <th class:dim={who !== 'all' && who !== p.id} style="color:{personColor(p.id)}">{p.name}</th>
          {/each}
          <th class="tcol">Foyer</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as k (k)}
          <tr class:future={isFuture(k)}>
            <td class="mcol">{monthLabel(k)}</td>
            {#each S.people as p (p.id)}
              <td class:dim={who !== 'all' && who !== p.id}>
                <AmountInput value={sv(k)[p.id] ?? null} onchange={(v) => setSaving(k, p.id, v)} placeholder="—" />
              </td>
            {/each}
            <td class="tcol">
              {#if S.people.some((p) => sv(k)[p.id] != null)}
                {fmt(S.people.reduce((a, p) => a + (sv(k)[p.id] ?? 0), 0))}
              {:else}
                <span class="none">—</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>

  <section>
    <h2>Épargne de départ</h2>
    <p class="hint">Le montant déjà épargné avant le début du suivi — inutile de ressaisir tout l'historique.</p>
    <div class="initrow">
      {#each S.people as p (p.id)}
        <label class="initfield" style="--c:{personColor(p.id)}">
          <span>{p.name}</span>
          <AmountInput value={initOf(p.id)} onchange={(v) => setInit(p.id, v)} placeholder="0 €" />
        </label>
      {/each}
    </div>
  </section>
</div>

<style>
  .epargne { max-width: 1100px; width: 100%; margin: 0 auto; display: grid; gap: 20px; }
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
  .toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; }
  .chip {
    font: inherit;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 17px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--glass);
    color: var(--muted);
    cursor: pointer;
    transition: all 0.2s;
  }
  .chip:hover { color: var(--txt); background: var(--glass2); }
  .chip.on {
    background: linear-gradient(135deg, rgba(34, 211, 238, 0.22), rgba(167, 139, 250, 0.28));
    color: #fff;
    font-weight: 600;
    border-color: var(--c, rgba(34, 211, 238, 0.45));
    box-shadow: 0 0 18px rgba(34, 211, 238, 0.3), inset 0 0 14px rgba(167, 139, 250, 0.15);
  }

  /* --- cartes indicateurs --- */
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 14px;
    background: none;
    border: none;
    box-shadow: none;
    padding: 0;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  .card {
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--panel);
    padding: 15px 18px;
    display: grid;
    gap: 3px;
  }
  .card.proj { border-color: rgba(167, 139, 250, 0.35); box-shadow: 0 0 18px rgba(167, 139, 250, 0.12); }
  .clabel { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
  .cval { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .cval.neg { color: #f87171; }
  .csub { color: #5d6684; font-size: 12px; }

  /* --- graphique --- */
  .chart { width: 100%; height: auto; touch-action: none; }
  .grid { stroke: rgba(255, 255, 255, 0.07); }
  .ylab { fill: var(--muted); font-size: 10.5px; text-anchor: end; font-variant-numeric: tabular-nums; }
  .xlab { fill: var(--muted); font-size: 10.5px; text-anchor: middle; }
  .line { fill: none; stroke-width: 2.2; stroke-linejoin: round; stroke-linecap: round; }
  .histline { filter: drop-shadow(0 0 5px currentColor); }
  .plannedline { stroke-dasharray: 2 3; opacity: 0.9; }
  .projline { stroke-dasharray: 6 5; opacity: 0.6; }
  .pt { pointer-events: none; }
  .mark { stroke: rgba(167, 139, 250, 0.4); stroke-dasharray: 2 4; }
  .marklab { fill: var(--violet); font-size: 10.5px; text-anchor: middle; }
  .marknow { stroke: rgba(34, 211, 238, 0.45); stroke-dasharray: 2 4; }
  .marklabnow { fill: var(--cyan); font-size: 10.5px; text-anchor: middle; }

  /* --- crosshair --- */
  .cross { stroke: rgba(255, 255, 255, 0.45); stroke-width: 1; stroke-dasharray: 3 4; pointer-events: none; }
  .crossdot { pointer-events: none; stroke: #0a0e1c; stroke-width: 1.5; filter: drop-shadow(0 0 6px currentColor); }
  .tagbox { fill: rgba(8, 11, 22, 0.92); stroke: rgba(255, 255, 255, 0.25); stroke-width: 0.8; pointer-events: none; }
  .tagx { fill: var(--txt); font-size: 10px; text-anchor: middle; pointer-events: none; }
  .tagy { font-size: 10px; text-anchor: end; font-variant-numeric: tabular-nums; font-weight: 700; pointer-events: none; }

  .tooltipbar, .legendline {
    display: flex;
    gap: 20px;
    align-items: center;
    margin-top: 8px;
    color: var(--muted);
    font-size: 12.5px;
    min-height: 20px;
    flex-wrap: wrap;
  }
  .tooltipbar b { color: var(--txt); font-variant-numeric: tabular-nums; }
  .projtag {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--violet);
    border: 1px solid rgba(167, 139, 250, 0.45);
    border-radius: 999px;
    padding: 1px 9px;
  }
  .tval { display: inline-flex; align-items: center; gap: 7px; }
  .tval.total { color: var(--cyan); }
  .legendline > span { display: inline-flex; align-items: center; gap: 7px; }
  .lswatch { width: 22px; height: 0; border-top: 2.2px solid var(--cyan); }
  .lswatch.dashed { border-top-style: dashed; border-top-color: var(--muted); }
  .lswatch.planned { border-top-style: dotted; border-top-color: var(--muted); }
  .empty { color: var(--muted); font-size: 13.5px; }

  /* --- épargne de départ --- */
  .initrow { display: flex; gap: 18px; flex-wrap: wrap; }
  .initfield {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 8px 14px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: rgba(6, 10, 22, 0.4);
  }
  .initfield > span { color: var(--c, var(--muted)); font-size: 13px; font-weight: 600; }

  /* --- tableau --- */
  .hint { color: var(--muted); font-size: 13px; margin: -6px 0 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  th {
    text-align: right;
    color: var(--muted);
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 6px 10px;
    border-bottom: 1px solid var(--border);
  }
  td { padding: 3px 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); text-align: right; }
  .mcol { text-align: left; color: #c7cde0; white-space: nowrap; text-transform: capitalize; }
  .tcol { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--cyan); width: 130px; }
  .dim { opacity: 0.35; }
  .none { color: var(--muted); font-weight: 400; }
  tbody tr:hover { background: rgba(255, 255, 255, 0.025); }
  tr.future { background: rgba(167, 139, 250, 0.045); }
  tr.future .mcol { color: #8d95b5; font-style: italic; border-left: 3px solid rgba(167, 139, 250, 0.65); }
  td.mcol { border-left: 3px solid transparent; }
</style>
