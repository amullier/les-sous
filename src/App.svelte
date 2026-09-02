<script>
  import { store, save, startedFresh, importSaveFile, exportSave } from './lib/store.svelte.js'
  import Suivi from './lib/Suivi.svelte'
  import Parametrage from './lib/Parametrage.svelte'
  import Analyse from './lib/Analyse.svelte'
  import Epargne from './lib/Epargne.svelte'
  import Tutorial from './lib/Tutorial.svelte'
  import Icon from './lib/Icon.svelte'
  import LockScreen from './lib/LockScreen.svelte'

  // routing par hash : #/suivi et #/parametrage
  const ROUTES = { '#/suivi': 'suivi', '#/analyse': 'analyse', '#/epargne': 'epargne', '#/parametrage': 'param' }
  const HASHES = { suivi: '#/suivi', analyse: '#/analyse', epargne: '#/epargne', param: '#/parametrage' }
  let screen = $state(ROUTES[location.hash] ?? 'suivi')
  if (!ROUTES[location.hash]) history.replaceState(null, '', '#/suivi')
  function go(s) {
    screen = s
    if (location.hash !== HASHES[s]) location.hash = HASHES[s]
  }
  let showTuto = $state(!store.settings.tutorialDone)

  // sauvegarde automatique à chaque modification
  $effect(() => save())

  // ---- Écran de masquage (confidentialité, pas de vraie sécurité) ----
  // Verrouillé par défaut au démarrage si un code est défini, puis après inactivité.
  const LOCK_DELAY = 2 * 60 * 1000 // 2 min d'inactivité
  let locked = $state(!!store.settings.lockCode)
  let lockTimer
  function armLockTimer() {
    clearTimeout(lockTimer)
    if (store.settings.lockCode) lockTimer = setTimeout(() => (locked = true), LOCK_DELAY)
  }
  function activity() {
    if (!locked) armLockTimer()
  }
  $effect(() => {
    // (ré)arme le timer quand le code change (défini/supprimé)
    store.settings.lockCode
    armLockTimer()
  })

  function closeTuto() {
    showTuto = false
    store.settings.tutorialDone = true
  }

  // bouton Sauvegarder : télécharge un fichier de sauvegarde + feedback visuel
  let saved = $state(false)
  let savedTimer
  function doSave() {
    save()
    exportSave()
    saved = true
    clearTimeout(savedTimer)
    savedTimer = setTimeout(() => (saved = false), 1600)
  }

  // premier démarrage (aucune donnée) : proposer d'importer une sauvegarde
  let showImportBanner = $state(startedFresh)
  function bannerImport(e) {
    const file = e.target.files[0]
    if (!file) return
    importSaveFile(file)
      .then(() => (showImportBanner = false))
      .catch(() => alert('Fichier invalide.'))
    e.target.value = ''
  }
</script>

<svelte:window
  onhashchange={() => (screen = ROUTES[location.hash] ?? 'suivi')}
  onpointermove={activity}
  onpointerdown={activity}
  onkeydown={activity}
  onwheel={activity}
/>

<header>
  <h1><span class="logo"><Icon name="wallet" size={20} /></span><span class="grad">les sous</span></h1>
  <nav data-tour="nav">
    <button class:active={screen === 'suivi'} onclick={() => go('suivi')}><Icon name="chart" size={14} /> Suivi</button>
    <button class:active={screen === 'analyse'} onclick={() => go('analyse')}><Icon name="pie" size={14} /> Analyse</button>
    <button class:active={screen === 'epargne'} onclick={() => go('epargne')}><Icon name="piggy" size={14} /> Épargne</button>
    <button class:active={screen === 'param'} onclick={() => go('param')}><Icon name="settings" size={14} /> Paramétrage</button>
  </nav>
  <button class="savebtn" class:saved onclick={doSave} title="Télécharger un fichier de sauvegarde de vos données">
    {#if saved}<Icon name="check" size={14} /> Sauvegardé{:else}<Icon name="save" size={14} /> Sauvegarder{/if}
  </button>
  <button class="help" title="Revoir le tutoriel" onclick={() => (showTuto = true)}><Icon name="help" size={16} /></button>
</header>

{#if showImportBanner}
  <div class="banner">
    <Icon name="upload" size={15} />
    <span>Vous démarrez avec des données d'exemple. Vous avez déjà une sauvegarde <b>les sous</b> ?</span>
    <label class="bannerbtn">
      Importer une sauvegarde
      <input type="file" accept=".ls,.sous,.json,application/json" onchange={bannerImport} hidden />
    </label>
    <button class="bannerclose" title="Fermer" onclick={() => (showImportBanner = false)}><Icon name="x" size={13} /></button>
  </div>
{/if}

<main>
  {#if screen === 'suivi'}
    <Suivi />
  {:else if screen === 'analyse'}
    <Analyse />
  {:else if screen === 'epargne'}
    <Epargne />
  {:else}
    <Parametrage />
  {/if}
</main>

{#if showTuto}
  <Tutorial onclose={closeTuto} setScreen={go} />
{/if}

{#if locked}
  <LockScreen onunlock={() => { locked = false; armLockTimer() }} />
{/if}

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 13px 22px;
    background: rgba(8, 11, 22, 0.65);
    backdrop-filter: blur(18px) saturate(1.4);
    -webkit-backdrop-filter: blur(18px) saturate(1.4);
    border-bottom: 1px solid var(--border);
  }
  h1 {
    font-size: 20px;
    margin: 0;
    flex: 1;
    font-weight: 800;
    letter-spacing: 0.02em;
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .logo {
    display: inline-flex;
    color: var(--cyan);
    filter: drop-shadow(0 0 10px rgba(34, 211, 238, 0.6));
  }
  .grad {
    background: linear-gradient(90deg, var(--cyan), var(--violet) 55%, #f472b6);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 0 14px rgba(167, 139, 250, 0.35));
  }
  nav { display: flex; gap: 8px; }
  nav button {
    font: inherit;
    padding: 8px 18px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--glass);
    color: var(--muted);
    cursor: pointer;
    transition: all 0.2s;
  }
  nav button:hover { color: var(--txt); background: var(--glass2); }
  nav button,
  .savebtn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
  .savebtn {
    font: inherit;
    padding: 8px 16px;
    border: 1px solid rgba(34, 211, 238, 0.35);
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(34, 211, 238, 0.14), rgba(167, 139, 250, 0.16));
    color: #a5f3fc;
    cursor: pointer;
    transition: all 0.2s;
  }
  .savebtn:hover {
    border-color: rgba(34, 211, 238, 0.7);
    box-shadow: 0 0 16px rgba(34, 211, 238, 0.3);
    color: #fff;
  }
  .savebtn.saved {
    border-color: rgba(52, 211, 153, 0.6);
    background: rgba(52, 211, 153, 0.14);
    color: var(--green);
    box-shadow: 0 0 16px rgba(52, 211, 153, 0.35);
  }
  nav button.active {
    background: linear-gradient(135deg, rgba(34, 211, 238, 0.22), rgba(167, 139, 250, 0.28));
    color: #fff;
    font-weight: 600;
    border-color: rgba(34, 211, 238, 0.45);
    box-shadow:
      0 0 18px rgba(34, 211, 238, 0.3),
      inset 0 0 14px rgba(167, 139, 250, 0.15);
  }
  .help {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    border: 1px solid var(--border);
    background: var(--glass);
    color: var(--muted);
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s;
  }
  .help:hover {
    color: var(--cyan);
    border-color: rgba(34, 211, 238, 0.6);
    box-shadow: 0 0 14px rgba(34, 211, 238, 0.4);
  }
  main {
    padding: 20px 22px;
    max-width: 1280px;
    margin: 0 auto;
  }
  .banner {
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 1280px;
    width: calc(100% - 44px);
    margin: 16px auto -6px;
    padding: 10px 18px;
    border: 1px solid rgba(34, 211, 238, 0.35);
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(34, 211, 238, 0.1), rgba(167, 139, 250, 0.12));
    color: #c7cde0;
    font-size: 13.5px;
    box-shadow: 0 0 22px rgba(34, 211, 238, 0.12);
  }
  .banner span { flex: 1; }
  .bannerbtn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 15px;
    border: 1px solid rgba(34, 211, 238, 0.45);
    border-radius: 999px;
    background: rgba(34, 211, 238, 0.12);
    color: #a5f3fc;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }
  .bannerbtn:hover {
    border-color: rgba(34, 211, 238, 0.8);
    box-shadow: 0 0 14px rgba(34, 211, 238, 0.35);
    color: #fff;
  }
  .bannerclose {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: none;
    color: var(--muted);
    cursor: pointer;
    flex: none;
    transition: all 0.2s;
  }
  .bannerclose:hover { color: var(--txt); border-color: rgba(255, 255, 255, 0.3); }
</style>
