<script>
  import { store } from './store.svelte.js'
  import AmountInput from './AmountInput.svelte'
  import Icon from './Icon.svelte'
  import { fmt, fmt0, pct, addMonths, monthLabel, todayKey, trend } from './utils.js'

  const S = $derived(store.settings)
  // début de suivi : mois paramétré, sinon mois courant
  const startMonth = $derived(S.startMonth || todayKey())
  const clamp = (k) => (k < startMonth ? startMonth : k)
  let viewStart = $state(addMonths(todayKey(), -1))
  $effect(() => {
    if (viewStart < startMonth) viewStart = startMonth
  })
  const months = $derived(
    Array.from(
      { length: Math.min(12, Math.max(1, Number(S.monthsToShow) || 4)) },
      (_, i) => addMonths(clamp(viewStart), i)
    )
  )

  const EMPTY = { incomes: {}, real: {}, expenses: {} }
  const md = (k) => store.months[k] ?? EMPTY
  function ensure(k) {
    if (!store.months[k]) store.months[k] = { incomes: {}, real: {}, expenses: {} }
    return store.months[k]
  }

  // ---- Recettes ----
  // dépenses rattachées à une ligne de recette (ex. tickets resto)
  function linkedExpenses(lineId) {
    const r = []
    for (const c of S.categories)
      for (const e of c.expenses) if (e.incomeLineId === lineId) r.push(e)
    return r
  }
  const isAuto = (line) => linkedExpenses(line.id).length > 0
  // valeur effective d'une ligne de recette : auto (somme des dépenses liées) ou saisie manuelle
  function lineIncome(k, line) {
    const linked = linkedExpenses(line.id)
    if (linked.length) {
      let t = null
      for (const e of linked) {
        const v = md(k).expenses[e.id]
        if (v != null) t = (t ?? 0) + v
      }
      return t
    }
    return md(k).incomes[line.id] ?? null
  }
  function incomeTotal(k) {
    let t = null
    for (const l of S.incomeLines) {
      const v = lineIncome(k, l)
      if (v != null) t = (t ?? 0) + v
    }
    return t
  }
  function personIncome(k, pid) {
    let t = 0
    for (const l of S.incomeLines) if (l.personId === pid) t += lineIncome(k, l) ?? 0
    return t
  }
  function assignedTotal(k) {
    let t = 0
    for (const p of S.people) t += personIncome(k, p.id)
    return t
  }

  // ---- Budget ----
  function previs(k, pid) {
    const n = S.people.length || 1
    const b = S.monthlyBudget
    if (b == null) return null
    const tot = assignedTotal(k)
    if (S.budgetMode === 'equalRemaining') return personIncome(k, pid) - (tot - b) / n
    return tot > 0 ? (b * personIncome(k, pid)) / tot : b / n
  }
  const realVal = (k, pid) => md(k).real[pid] ?? null
  function realTotal(k) {
    let t = null
    for (const p of S.people) {
      const v = realVal(k, p.id)
      if (v != null) t = (t ?? 0) + v
    }
    return t
  }

  // ---- Dépenses ----
  const expVal = (k, id) => md(k).expenses[id] ?? null
  function catTotal(k, cat) {
    let t = null
    for (const e of cat.expenses) {
      const v = expVal(k, e.id)
      if (v != null) t = (t ?? 0) + v
    }
    return t
  }
  function expTotal(k) {
    let t = null
    for (const c of S.categories) {
      const v = catTotal(k, c)
      if (v != null) t = (t ?? 0) + v
    }
    return t
  }

  // Moyenne sur les 12 derniers mois (mois renseignés uniquement, depuis le début de suivi)
  function avg12(getter) {
    const end = todayKey()
    let s = 0, n = 0
    for (let i = 0; i < 12; i++) {
      const k = addMonths(end, -i)
      if (k < startMonth) break
      const v = getter(k)
      if (v != null) { s += v; n++ }
    }
    return n ? s / n : null
  }

  function setIncome(k, id, v) {
    const m = ensure(k)
    if (v == null) delete m.incomes[id]
    else m.incomes[id] = v
  }
  function setReal(k, pid, v) {
    const m = ensure(k)
    if (v == null) delete m.real[pid]
    else m.real[pid] = v
  }
  // saisie du total « Budget réel » : on répartit sur les personnes
  // (au prorata des montants existants, sinon à parts égales)
  function setRealTotal(k, v) {
    const m = ensure(k)
    if (v == null) {
      m.real = {}
      return
    }
    const cur = realTotal(k)
    const targets =
      cur != null && cur !== 0 ? S.people.filter((p) => m.real[p.id] != null) : S.people
    const r2 = (x) => Math.round(x * 100) / 100
    let acc = 0
    targets.forEach((p, i) => {
      if (i === targets.length - 1) {
        m.real[p.id] = r2(v - acc)
      } else {
        const nv = r2(cur != null && cur !== 0 ? (m.real[p.id] * v) / cur : v / targets.length)
        m.real[p.id] = nv
        acc += nv
      }
    })
  }
  function setExp(k, id, v) {
    const m = ensure(k)
    if (v == null) delete m.expenses[id]
    else m.expenses[id] = v
  }

  // dépense en cours de saisie : surbrillance du nom à gauche
  let editingExp = $state(null)

  // ---- Navigation clavier entre les cases saisissables ----
  const fullySelected = (t) =>
    t.selectionStart === 0 && t.selectionEnd === t.value.length && t.value.length > 0
  function navKey(e) {
    const t = e.target
    if (!t.matches?.('input.amt')) return
    const key = e.key === 'Enter' ? 'ArrowDown' : e.key
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) return
    // gauche/droite : on ne navigue que si le curseur est au bord (ou tout sélectionné),
    // pour laisser la possibilité d'éditer une somme "11+5+3"
    if (key === 'ArrowLeft' && !fullySelected(t) && !(t.selectionStart === 0 && t.selectionEnd === 0)) return
    if (key === 'ArrowRight' && !fullySelected(t) && t.selectionEnd !== t.value.length) return
    const tr = t.closest('tr')
    const rowInputs = [...tr.querySelectorAll('input.amt')]
    const ci = rowInputs.indexOf(t)
    let target = null
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      target = rowInputs[ci + (key === 'ArrowRight' ? 1 : -1)]
    } else {
      const rows = [...t.closest('table').querySelectorAll('tr')].filter((r) =>
        r.querySelector('input.amt')
      )
      const nr = rows[rows.indexOf(tr) + (key === 'ArrowDown' ? 1 : -1)]
      if (nr) {
        const ni = [...nr.querySelectorAll('input.amt')]
        target = ni[Math.min(ci, ni.length - 1)]
      }
    }
    if (target) {
      e.preventDefault()
      target.focus()
    }
  }
</script>

{#snippet tcell(cur, prev, goodUp)}
  {@const t = trend(cur, prev)}
  <td class="trend {t.c === 'flat' ? 'flat' : (t.c === 'up') === goodUp ? 'good' : 'bad'}">{t.s}</td>
{/snippet}

<div class="toolbar" data-tour="nav-mois">
  <button
    onclick={() => (viewStart = clamp(addMonths(viewStart, -1)))}
    disabled={viewStart <= startMonth}
    title="Mois précédent"><Icon name="chevron-left" size={14} /></button>
  <button onclick={() => (viewStart = clamp(addMonths(todayKey(), -1)))}>Aujourd'hui</button>
  <button onclick={() => (viewStart = addMonths(viewStart, 1))} title="Mois suivant"><Icon name="chevron-right" size={14} /></button>
  <span class="since">suivi depuis {monthLabel(startMonth)}</span>
</div>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="scroller" onkeydown={navKey}>
  <table>
    <thead>
      <tr>
        <th class="name"></th>
        <th class="avg">moy. 12 mois</th>
        {#each months as k (k)}
          <th colspan="2" class="month" class:current={k === todayKey()}>{monthLabel(k)}</th>
        {/each}
      </tr>
    </thead>

    <!-- ====== RECETTES ====== -->
    <tbody data-tour="recettes">
      <tr class="sec rec">
        <td class="name">Recettes</td>
        <td class="avg">{fmt0(avg12(incomeTotal))}</td>
        {#each months as k (k)}
          {@render tcell(incomeTotal(k), incomeTotal(addMonths(k, -1)), true)}
          <td class="num total">{fmt(incomeTotal(k))}</td>
        {/each}
      </tr>
      {#each S.incomeLines as l (l.id)}
        <tr>
          <td class="name">
            {#if l.personId}
              {@const pi = S.people.findIndex((p) => p.id === l.personId)}
              {#if pi >= 0}{S.people[pi].name} <span class="dot c{pi % 5}">●</span> {/if}
            {/if}
            {l.name}
            {#if isAuto(l)}<span class="auto" title="Calculée automatiquement : somme des dépenses rattachées ({linkedExpenses(l.id).map((e) => e.name).join(', ')})"><Icon name="link" size={11} /></span>{/if}
          </td>
          <td class="avg">{fmt0(avg12((k) => lineIncome(k, l)))}</td>
          {#each months as k (k)}
            {@render tcell(lineIncome(k, l), lineIncome(addMonths(k, -1), l), true)}
            <td class="num">
              <div class="cellrow">
                {#if isAuto(l)}
                  <span
                    class="autoval"
                    title="Somme des dépenses rattachées ({linkedExpenses(l.id).map((e) => e.name).join(', ')})"
                    >{fmt(lineIncome(k, l))}</span>
                {:else}
                  <AmountInput value={lineIncome(k, l)} onchange={(v) => setIncome(k, l.id, v)} />
                {/if}
                {#if l.personId && lineIncome(k, l) != null && assignedTotal(k) > 0}
                  <span class="share">{pct(lineIncome(k, l) / assignedTotal(k))}</span>
                {/if}
              </div>
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>

    <!-- ====== BUDGET ====== -->
    <tbody data-tour="budget">
      <tr class="sec prev">
        <td class="name">Budget prévisionnel</td>
        <td class="avg"></td>
        {#each months as k (k)}
          <td class="trend flat"></td>
          <td class="num total">{fmt(S.monthlyBudget)}</td>
        {/each}
      </tr>
      {#each S.people as p (p.id)}
        <tr class="sub">
          <td class="name">{p.name}</td>
          <td class="avg"></td>
          {#each months as k (k)}
            <td class="trend flat"></td>
            <td class="num muted">{fmt(previs(k, p.id))}</td>
          {/each}
        </tr>
      {/each}
      <tr class="sec real">
        <td class="name">Budget réel <small>(versé au pot commun)</small></td>
        <td class="avg"></td>
        {#each months as k (k)}
          <td class="trend flat"></td>
          <td class="num total">
            <AmountInput value={realTotal(k)} onchange={(v) => setRealTotal(k, v)} />
          </td>
        {/each}
      </tr>
      {#each S.people as p (p.id)}
        <tr class="sub">
          <td class="name">{p.name}</td>
          <td class="avg">{fmt0(avg12((k) => realVal(k, p.id)))}</td>
          {#each months as k (k)}
            <td class="trend flat"></td>
            <td class="num">
              <div class="cellrow">
                <AmountInput value={realVal(k, p.id)} onchange={(v) => setReal(k, p.id, v)} />
                {#if realVal(k, p.id) != null && realTotal(k) > 0}
                  <span class="share">{pct(realVal(k, p.id) / realTotal(k))}</span>
                {/if}
              </div>
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>

    <!-- ====== DÉPENSES ====== -->
    <tbody data-tour="depenses">
      <tr class="sec dep">
        <td class="name">Dépenses</td>
        <td class="avg">{fmt0(avg12(expTotal))}</td>
        {#each months as k (k)}
          {@const t = expTotal(k)}
          {@render tcell(t, expTotal(addMonths(k, -1)), false)}
          <td class="num total">
            {fmt(t)}
            {#if t != null && S.monthlyBudget > 0}
              <span class="badge" class:over={t > S.monthlyBudget}>{pct(t / S.monthlyBudget)}</span>
            {/if}
          </td>
        {/each}
      </tr>
      {#each S.categories as cat (cat.id)}
        <tr class="cat">
          <td class="name">{cat.name}</td>
          <td class="avg">{fmt0(avg12((k) => catTotal(k, cat)))}</td>
          {#each months as k (k)}
            {@render tcell(catTotal(k, cat), catTotal(addMonths(k, -1), cat), false)}
            <td class="num total">{fmt(catTotal(k, cat))}</td>
          {/each}
        </tr>
        {#each cat.expenses as e (e.id)}
          <tr>
            <td class="name indent" class:editing={editingExp === e.id}>
              {#if e.locked}<span class="lockic" title="Dépense fixe"><Icon name="lock" size={11} /></span>{/if}
              {e.name}
              {#if e.incomeLineId}
                {@const target = S.incomeLines.find((l) => l.id === e.incomeLineId)}
                <span class="auto" title="Comptée dans la recette « {target?.name ?? '?'} »"><Icon name="link" size={11} /></span>
              {/if}
            </td>
            <td class="avg">{fmt0(avg12((k) => expVal(k, e.id)))}</td>
            {#each months as k (k)}
              {@render tcell(expVal(k, e.id), expVal(addMonths(k, -1), e.id), false)}
              <td class="num">
                <div class="cellrow">
                  {#if expVal(k, e.id) == null && e.planned}
                    <button
                      class="ghost"
                      title="Valider le montant prévu"
                      onclick={() => setExp(k, e.id, e.planned)}><Icon name="check" size={11} /></button>
                  {/if}
                  <AmountInput
                    value={expVal(k, e.id)}
                    placeholder={e.planned ? fmt0(e.planned) : ''}
                    onchange={(v) => setExp(k, e.id, v)}
                    onediting={(on) => (editingExp = on ? e.id : null)} />
                </div>
              </td>
            {/each}
          </tr>
        {/each}
      {/each}
    </tbody>
  </table>
</div>

<style>
  .toolbar { display: flex; gap: 8px; margin-bottom: 14px; align-items: center; }
  .toolbar .since { color: var(--muted); font-size: 12px; margin-left: 6px; }
  .toolbar button:disabled { opacity: 0.35; cursor: default; box-shadow: none; }
  .toolbar button {
    font: inherit;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--glass);
    color: var(--muted);
    cursor: pointer;
    transition: all 0.2s;
  }
  .toolbar button:hover {
    color: var(--cyan);
    border-color: rgba(34, 211, 238, 0.5);
    box-shadow: 0 0 12px rgba(34, 211, 238, 0.25);
  }

  .scroller {
    overflow-x: auto;
    width: fit-content;
    max-width: 100%;
    border-radius: 18px;
    border: 1px solid var(--border);
    background: var(--panel);
    backdrop-filter: blur(16px) saturate(1.3);
    -webkit-backdrop-filter: blur(16px) saturate(1.3);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }
  table { border-collapse: separate; border-spacing: 0; min-width: 100%; }
  th, td { padding: 4px 8px; font-size: 13.5px; white-space: nowrap; }
  thead th {
    text-align: center;
    padding: 12px 8px;
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    border-bottom: 1px solid var(--border);
    background: rgba(255, 255, 255, 0.02);
  }
  thead th.current {
    color: var(--cyan);
    text-shadow: 0 0 14px rgba(34, 211, 238, 0.8);
  }
  .name {
    text-align: left;
    position: sticky;
    left: 0;
    background: #0a0e1c;
    min-width: 200px;
    z-index: 1;
    color: #c7cde0;
  }
  thead th.name, thead th.avg { background: #0a0e1c; }
  .name.indent { padding-left: 24px; }
  td.name.editing {
    background: #0b2432 !important;
    color: #67e8f9;
    text-shadow: 0 0 12px rgba(34, 211, 238, 0.55);
    box-shadow: inset 3px 0 0 var(--cyan);
    transition: background 0.15s, color 0.15s;
  }
  .avg {
    text-align: right;
    color: var(--muted);
    font-size: 11.5px;
    border-right: 1px solid var(--border);
    min-width: 85px;
  }
  .num {
    text-align: right;
    min-width: 110px;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
    font-variant-numeric: tabular-nums;
  }
  .trend { text-align: center; width: 32px; font-size: 12.5px; }
  .trend.good { color: var(--green); text-shadow: 0 0 10px rgba(52, 211, 153, 0.75); }
  .trend.bad { color: var(--red); text-shadow: 0 0 10px rgba(248, 113, 113, 0.75); }
  .trend.flat { color: #4b5470; }

  .sec td { font-weight: 700; padding: 9px 8px; }
  .sec.rec td { background: rgba(52, 211, 153, 0.09); color: #6ee7b7; }
  .sec.rec td.name { background: #0b1e18; }
  .sec.prev td { background: rgba(34, 211, 238, 0.09); color: #67e8f9; }
  .sec.prev td.name { background: #081c24; }
  .sec.real td { background: rgba(167, 139, 250, 0.1); color: #c4b5fd; }
  .sec.real td.name { background: #151129; }
  .sec.dep td { background: rgba(251, 146, 60, 0.1); color: #fdba74; }
  .sec.dep td.name { background: #251507; }

  .cat td { font-weight: 600; background: rgba(255, 255, 255, 0.045); color: #dfe5f5; }
  .cat td.name { background: #121729; }

  .num.muted { color: var(--muted); }
  tbody tr:not(.sec):not(.cat):hover td { background: rgba(34, 211, 238, 0.05); }
  tbody tr:not(.sec):not(.cat):hover td.name { background: #0e1526; }
  tbody { border-bottom: 14px solid transparent; }

  .share { color: #5d6684; font-size: 11px; margin-left: 4px; }
  .dot { font-size: 7px; vertical-align: 2px; margin: 0 1px; }
  .dot.c0 { color: var(--cyan); text-shadow: 0 0 6px rgba(34, 211, 238, 0.8); }
  .dot.c1 { color: var(--violet); text-shadow: 0 0 6px rgba(167, 139, 250, 0.8); }
  .dot.c2 { color: var(--green); text-shadow: 0 0 6px rgba(52, 211, 153, 0.8); }
  .dot.c3 { color: var(--orange); text-shadow: 0 0 6px rgba(251, 146, 60, 0.8); }
  .dot.c4 { color: #f472b6; text-shadow: 0 0 6px rgba(244, 114, 182, 0.8); }
  .auto { margin-left: 4px; cursor: help; color: #67e8f9; }
  .lockic { color: var(--muted); margin-right: 2px; }
  .autoval { color: #67e8f9; padding: 2px 5px; cursor: help; }
  .badge {
    font-size: 11px;
    border-radius: 999px;
    padding: 1px 8px;
    margin-left: 6px;
    background: rgba(52, 211, 153, 0.15);
    color: var(--green);
    border: 1px solid rgba(52, 211, 153, 0.35);
  }
  .badge.over {
    background: rgba(248, 113, 113, 0.15);
    color: var(--red);
    border-color: rgba(248, 113, 113, 0.4);
    box-shadow: 0 0 10px rgba(248, 113, 113, 0.3);
  }
  .cellrow { display: flex; align-items: center; justify-content: flex-end; gap: 2px; }
  .cellrow .share { flex: none; min-width: 34px; text-align: right; }
  .ghost {
    border: 1px dashed rgba(255, 255, 255, 0.25);
    background: none;
    color: var(--muted);
    border-radius: 5px;
    cursor: pointer;
    font-size: 11px;
    padding: 1px 6px;
    transition: all 0.2s;
  }
  .ghost:hover {
    color: var(--green);
    border-color: var(--green);
    box-shadow: 0 0 10px rgba(52, 211, 153, 0.35);
  }
  small { font-weight: normal; color: var(--muted); }
  button { cursor: pointer; }
</style>
