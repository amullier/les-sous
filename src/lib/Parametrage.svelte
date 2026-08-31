<script>
  import { store, replaceAll, defaultState, save, importSaveFile, exportSave } from './store.svelte.js'
  import { uid, fmt, todayKey, monthLabel } from './utils.js'
  import Icon from './Icon.svelte'

  const S = $derived(store.settings)
  const curMonth = todayKey()
  const curVal = (id) => store.months[curMonth]?.expenses[id] ?? null

  // date de départ : input date, stockée en 'YYYY-MM' ; défaut = mois courant
  if (!store.settings.startMonth) store.settings.startMonth = curMonth
  const startDate = $derived(store.settings.startMonth + '-01')
  function setStartDate(e) {
    const v = e.target.value
    store.settings.startMonth = v ? v.slice(0, 7) : todayKey()
  }

  function addPerson() {
    S.people.push({ id: uid(), name: 'Nouvelle personne' })
  }
  function removePerson(id) {
    if (!confirm('Supprimer cette personne ?')) return
    store.settings.people = S.people.filter((p) => p.id !== id)
    for (const l of S.incomeLines) if (l.personId === id) l.personId = null
  }
  function addIncomeLine() {
    S.incomeLines.push({ id: uid(), name: 'Nouvelle recette', personId: null })
  }
  function removeIncomeLine(id) {
    store.settings.incomeLines = S.incomeLines.filter((l) => l.id !== id)
  }
  function addCategory() {
    const id = uid()
    S.categories.push({ id, name: 'Nouvelle catégorie', expenses: [] })
    focusId = id
  }
  function removeCategory(cat) {
    if (!confirm(`Supprimer la catégorie « ${cat.name} » et ses dépenses ?`)) return
    store.settings.categories = S.categories.filter((c) => c.id !== cat.id)
  }
  function addExpense(cat) {
    const id = uid()
    cat.expenses.push({ id, name: 'Nouvelle dépense', locked: false, planned: null, incomeLineId: null })
    focusId = id
  }
  function removeExpense(cat, id) {
    cat.expenses = cat.expenses.filter((e) => e.id !== id)
  }

  // focus + sélection du nom sur l'élément fraîchement créé
  let focusId = $state(null)
  function focusOnMount(node, id) {
    if (id === focusId) {
      focusId = null
      node.focus()
      node.select()
    }
  }

  // ---- Drag & drop ----
  let drag = $state(null) // { list, index }
  let over = $state(null)
  function dragStart(e, list, index) {
    drag = { list, index }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', '')
  }
  function dragOver(e, list, index) {
    if (!drag || drag.list !== list) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    over = { list, index }
  }
  function dropOn(e, list, index) {
    if (!drag || drag.list !== list) return
    e.preventDefault()
    e.stopPropagation()
    if (drag.index !== index) {
      const [item] = list.splice(drag.index, 1)
      list.splice(index, 0, item)
    }
    drag = null
    over = null
  }
  function dragEnd() {
    drag = null
    over = null
  }
  const isOver = (list, i) => !!(over && over.list === list && over.index === i && drag && drag.index !== i)

  // ---- Données ----
  function importJson(e) {
    const file = e.target.files[0]
    if (!file) return
    importSaveFile(file).catch(() => alert('Fichier invalide.'))
    e.target.value = ''
  }
  function reset() {
    if (confirm('Tout effacer et repartir de zéro ? (irréversible, pensez à exporter avant)'))
      replaceAll(defaultState())
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="param" data-tour="param" onfocusout={save}>
  <section>
    <h2>Foyer</h2>
    <h3>Personnes</h3>
    {#each S.people as p, i (p.id)}
      <div
        class="row item"
        class:dropover={isOver(S.people, i)}
        ondragover={(e) => dragOver(e, S.people, i)}
        ondrop={(e) => dropOn(e, S.people, i)}
      >
        <span class="handle" draggable="true" title="Glisser pour réordonner" ondragstart={(e) => dragStart(e, S.people, i)} ondragend={dragEnd}><Icon name="grip" size={14} /></span>
        <input type="text" bind:value={p.name} />
        <button class="icon danger" onclick={() => removePerson(p.id)} title="Supprimer"><Icon name="x" size={13} /></button>
      </div>
    {/each}
    <button class="add" onclick={addPerson}><Icon name="plus" size={14} /> Ajouter une personne</button>

    <h3>Lignes de recettes</h3>
    <p class="hint">Chaque ligne peut être rattachée à une personne : elle compte alors dans le calcul de sa part du budget.</p>
    {#each S.incomeLines as l, i (l.id)}
      <div
        class="row item"
        class:dropover={isOver(S.incomeLines, i)}
        ondragover={(e) => dragOver(e, S.incomeLines, i)}
        ondrop={(e) => dropOn(e, S.incomeLines, i)}
      >
        <span class="handle" draggable="true" title="Glisser pour réordonner" ondragstart={(e) => dragStart(e, S.incomeLines, i)} ondragend={dragEnd}><Icon name="grip" size={14} /></span>
        <input type="text" bind:value={l.name} />
        <select bind:value={l.personId}>
          <option value={null}>— non répartie —</option>
          {#each S.people as p (p.id)}
            <option value={p.id}>{p.name}</option>
          {/each}
        </select>
        <button class="icon danger" onclick={() => removeIncomeLine(l.id)} title="Supprimer"><Icon name="x" size={13} /></button>
      </div>
    {/each}
    <button class="add" onclick={addIncomeLine}><Icon name="plus" size={14} /> Ajouter une recette</button>
  </section>

  <section>
    <h2>Budget prévisionnel</h2>
    <label class="row">
      <span>Montant mensuel</span>
      <input type="number" min="0" step="10" bind:value={store.settings.monthlyBudget} /> €
    </label>
    <div class="radios">
      <label>
        <input type="radio" bind:group={store.settings.budgetMode} value="proportional" />
        <b>À la proportionnelle</b> — chacun contribue au prorata de ses revenus.
      </label>
      <label>
        <input type="radio" bind:group={store.settings.budgetMode} value="equalRemaining" />
        <b>Au même reste à vivre</b> — chacun contribue de sorte qu'il reste la même somme à chacun après contribution.
      </label>
    </div>
    <label class="row">
      <span>Mois affichés dans le suivi</span>
      <input type="number" min="1" max="12" bind:value={store.settings.monthsToShow} />
    </label>
    <label class="row">
      <span>Début du suivi</span>
      <input type="date" value={startDate} onchange={setStartDate} />
      <em class="hint" style="margin:0">si vide : mois courant (seul le mois est pris en compte)</em>
    </label>
  </section>

  <section>
    <h2>Catégories & dépenses</h2>
    <p class="hint"><Icon name="lock" size={12} /> = dépense fixe (loyer, abonnement…). « Prévu » = montant attendu chaque mois, affiché en gris dans le suivi (validez-le d'un clic sur <Icon name="check" size={12} />). <Icon name="link" size={12} /> = dépense rattachée à une recette : la somme de ces dépenses alimente automatiquement la recette (ex. dépenses en tickets resto → recette « Tickets resto »).</p>
    {#each S.categories as cat, ci (cat.id)}
      <div
        class="cat"
        class:dropover={isOver(S.categories, ci)}
        ondragover={(e) => dragOver(e, S.categories, ci)}
        ondrop={(e) => dropOn(e, S.categories, ci)}
      >
        <div class="row cathead item">
          <span class="handle" draggable="true" title="Glisser pour réordonner" ondragstart={(e) => dragStart(e, S.categories, ci)} ondragend={dragEnd}><Icon name="grip" size={14} /></span>
          <input type="text" class="catname" bind:value={cat.name} use:focusOnMount={cat.id} />
          <button class="icon danger" onclick={() => removeCategory(cat)} title="Supprimer"><Icon name="x" size={13} /></button>
        </div>
        {#each cat.expenses as e, ei (e.id)}
          <div
            class="row exp item"
            class:dropover={isOver(cat.expenses, ei)}
            ondragover={(ev) => dragOver(ev, cat.expenses, ei)}
            ondrop={(ev) => dropOn(ev, cat.expenses, ei)}
          >
            <span class="handle" draggable="true" title="Glisser pour réordonner" ondragstart={(ev) => dragStart(ev, cat.expenses, ei)} ondragend={dragEnd}><Icon name="grip" size={14} /></span>
            <label class="lock" title="Dépense fixe / récurrente">
              <input type="checkbox" bind:checked={e.locked} /><Icon name="lock" size={13} />
            </label>
            <input type="text" bind:value={e.name} use:focusOnMount={e.id} />
            <label class="planned">
              Prévu : <input type="number" min="0" step="1" bind:value={e.planned} /> €
            </label>
            <label class="linkinc" title="La somme de ces dépenses alimentera automatiquement la recette choisie (ex. tickets resto)">
              <Icon name="link" size={13} />
              <select bind:value={e.incomeLineId}>
                <option value={null}>— aucune recette —</option>
                {#each S.incomeLines as l (l.id)}
                  <option value={l.id}>{l.name}</option>
                {/each}
              </select>
            </label>
            <span class="curmonth" title="Dépensé en {monthLabel(curMonth)}">
              ce mois-ci : <b class:none={curVal(e.id) == null}>{curVal(e.id) == null ? '—' : fmt(curVal(e.id))}</b>
            </span>
            <button class="icon danger" onclick={() => removeExpense(cat, e.id)} title="Supprimer"><Icon name="x" size={13} /></button>
          </div>
        {/each}
        <button class="small add" onclick={() => addExpense(cat)}><Icon name="plus" size={12} /> dépense</button>
      </div>
    {/each}
    <button class="add" onclick={addCategory}><Icon name="plus" size={14} /> Ajouter une catégorie</button>
  </section>

  <section>
    <h2>Vos données</h2>
    <p class="hint">
      <Icon name="shield" size={13} /> Tout est stocké <b>uniquement dans ce navigateur</b> (localStorage) : rien n'est envoyé sur
      un serveur. Revers de la médaille : si vous videz les données du navigateur, tout est perdu.
      Exportez régulièrement une sauvegarde.
    </p>
    <div class="row">
      <button onclick={exportSave}><Icon name="download" size={14} /> Exporter une sauvegarde</button>
      <label class="filebtn">
        <Icon name="upload" size={14} /> Importer une sauvegarde
        <input type="file" accept=".ls,.sous,.json,application/json" onchange={importJson} hidden />
      </label>
      <button class="danger" onclick={reset}><Icon name="trash" size={14} /> Tout réinitialiser</button>
    </div>
  </section>
</div>

<style>
  .param { max-width: 1100px; width: 100%; margin: 0 auto; display: grid; gap: 20px; }
  section {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 18px 22px;
    backdrop-filter: blur(16px) saturate(1.3);
    -webkit-backdrop-filter: blur(16px) saturate(1.3);
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }
  h2 {
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.02em;
    background: linear-gradient(90deg, var(--cyan), var(--violet));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  h3 { margin: 18px 0 6px; font-size: 13px; color: var(--txt); text-transform: uppercase; letter-spacing: 0.1em; }
  .row { display: flex; align-items: center; gap: 6px; margin: 5px 0; flex-wrap: wrap; }
  .row > span { min-width: 180px; color: var(--muted); }
  input[type='text'] { flex: 1; min-width: 140px; }
  input, select {
    font: inherit;
    color: var(--txt);
    padding: 8px 12px;
    background: rgba(6, 10, 22, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 10px;
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.4), inset 0 -1px 0 rgba(255, 255, 255, 0.04);
    transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
  }
  input:hover, select:hover { border-color: rgba(255, 255, 255, 0.22); }
  input:focus, select:focus {
    outline: none;
    background: rgba(10, 14, 28, 0.8);
    border-color: rgba(167, 139, 250, 0.75);
    box-shadow:
      inset 0 2px 6px rgba(0, 0, 0, 0.35),
      0 0 0 3px rgba(167, 139, 250, 0.16),
      0 0 18px rgba(167, 139, 250, 0.3);
  }
  select {
    appearance: none;
    -webkit-appearance: none;
    padding-right: 30px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238b93ad' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 11px center;
    cursor: pointer;
  }
  input[type='number'] { width: 90px; appearance: textfield; -moz-appearance: textfield; }
  input[type='number']::-webkit-outer-spin-button,
  input[type='number']::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  input[type='checkbox'] { width: 15px; height: 15px; padding: 0; box-shadow: none; cursor: pointer; }
  .radios { display: grid; gap: 8px; margin: 12px 0; }
  .radios label { display: flex; gap: 8px; align-items: baseline; color: var(--muted); }
  .radios b { color: var(--txt); }
  .radios input[type='radio'] { accent-color: var(--violet); }
  .hint { color: var(--muted); font-size: 13px; margin: 4px 0 12px; line-height: 1.5; }
  .handle {
    cursor: grab;
    color: #4b5470;
    user-select: none;
    display: inline-flex;
    align-items: center;
    padding: 0 4px;
    transition: color 0.15s;
  }
  .handle:hover { color: var(--cyan); }
  .handle:active { cursor: grabbing; }
  .item { border-radius: 8px; }
  .dropover {
    box-shadow: inset 0 2px 0 var(--cyan), 0 -1px 10px rgba(34, 211, 238, 0.25);
  }
  .cat.dropover {
    border-color: rgba(34, 211, 238, 0.55);
    box-shadow: inset 0 2px 0 var(--cyan), 0 0 16px rgba(34, 211, 238, 0.2);
  }
  .cat {
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 10px 12px;
    margin-bottom: 12px;
    background: rgba(255, 255, 255, 0.03);
  }
  .cathead .catname { font-weight: bold; }
  .exp { padding-left: 14px; }
  .lock { display: flex; align-items: center; gap: 2px; }
  .lock input { accent-color: var(--cyan); }
  .planned { display: flex; align-items: center; gap: 4px; color: var(--muted); font-size: 13px; }
  .planned input { width: 70px; }
  .linkinc { display: flex; align-items: center; gap: 4px; font-size: 13px; }
  .linkinc select { max-width: 170px; font-size: 12px; padding: 4px 6px; }
  .curmonth {
    color: var(--muted);
    font-size: 12px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .curmonth b { color: var(--cyan); font-weight: 600; }
  .curmonth b.none { color: #4b5470; }
  button {
    font: inherit;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 8px 16px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.03));
    color: var(--txt);
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    transition: all 0.18s;
  }
  button:hover {
    transform: translateY(-1px);
    border-color: rgba(34, 211, 238, 0.5);
    box-shadow:
      0 6px 18px rgba(0, 0, 0, 0.4),
      0 0 16px rgba(34, 211, 238, 0.22),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
  button:active {
    transform: translateY(0) scale(0.98);
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.4);
  }
  button.add {
    background: linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(167, 139, 250, 0.24));
    border-color: rgba(34, 211, 238, 0.35);
    color: #d7f8ff;
    text-shadow: 0 0 10px rgba(34, 211, 238, 0.4);
  }
  button.add:hover {
    border-color: rgba(34, 211, 238, 0.7);
    box-shadow:
      0 6px 18px rgba(0, 0, 0, 0.4),
      0 0 22px rgba(34, 211, 238, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }
  button.icon {
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.04);
    color: var(--muted);
    box-shadow: none;
  }
  button.icon:hover { transform: none; color: var(--txt); }
  button.small { font-size: 12px; padding: 4px 12px; margin-left: 14px; border-radius: 999px; }
  .danger { color: var(--red); }
  button.danger:hover {
    border-color: rgba(248, 113, 113, 0.55);
    box-shadow: 0 0 14px rgba(248, 113, 113, 0.3);
    color: var(--red);
  }
  .filebtn {
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.03));
    padding: 8px 16px;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    transition: all 0.18s;
  }
  .filebtn:hover {
    transform: translateY(-1px);
    border-color: rgba(34, 211, 238, 0.5);
    box-shadow:
      0 6px 18px rgba(0, 0, 0, 0.4),
      0 0 16px rgba(34, 211, 238, 0.22),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
</style>
