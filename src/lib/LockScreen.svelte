<script>
  import { store } from './store.svelte.js'
  import Icon from './Icon.svelte'

  let { onunlock } = $props()

  let code = $state('')
  let wrong = $state(false)
  let input

  // vérification automatique dès que la longueur correspond
  $effect(() => {
    if (code.length && code === store.settings.lockCode) onunlock()
    else if (code.length >= store.settings.lockCode.length) {
      wrong = true
      code = ''
      setTimeout(() => (wrong = false), 500)
    }
  })

  function focusNow(node) {
    node.focus()
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
<div class="lock" role="dialog" aria-label="Écran verrouillé" onclick={() => input?.focus()}>
  <div class="box" class:wrong>
    <span class="padlock"><Icon name="lock" size={30} /></span>
    <h2><span class="grad">les sous</span></h2>
    <p>Saisissez votre code pour afficher l'écran</p>
    <input
      bind:this={input}
      use:focusNow
      type="password"
      inputmode="numeric"
      autocomplete="off"
      placeholder="Code"
      bind:value={code}
      maxlength={store.settings.lockCode.length}
    />
    <div class="dots">
      {#each { length: store.settings.lockCode.length } as _, i}
        <span class="dot" class:on={i < code.length}></span>
      {/each}
    </div>
  </div>
</div>

<style>
  .lock {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(6, 9, 18, 0.55);
    backdrop-filter: blur(26px) saturate(1.2);
    -webkit-backdrop-filter: blur(26px) saturate(1.2);
  }
  .box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 34px 46px;
    border: 1px solid var(--border);
    border-radius: 22px;
    background: rgba(10, 14, 28, 0.7);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.07);
    transition: transform 0.1s;
  }
  .box.wrong {
    animation: shake 0.4s;
    border-color: rgba(248, 113, 113, 0.6);
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-8px); }
    40%, 80% { transform: translateX(8px); }
  }
  .padlock {
    color: var(--cyan);
    filter: drop-shadow(0 0 12px rgba(34, 211, 238, 0.6));
  }
  h2 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.02em; }
  .grad {
    background: linear-gradient(90deg, var(--cyan), var(--violet) 55%, #f472b6);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  p { margin: 0 0 6px; color: var(--muted); font-size: 13.5px; }
  input {
    font: inherit;
    font-size: 20px;
    letter-spacing: 0.5em;
    text-align: center;
    width: 180px;
    color: var(--txt);
    padding: 10px 12px;
    background: rgba(6, 10, 22, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.4);
  }
  input:focus {
    outline: none;
    border-color: rgba(167, 139, 250, 0.75);
    box-shadow:
      inset 0 2px 6px rgba(0, 0, 0, 0.35),
      0 0 0 3px rgba(167, 139, 250, 0.16),
      0 0 18px rgba(167, 139, 250, 0.3);
  }
  .dots { display: flex; gap: 9px; margin-top: 4px; }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.14);
    transition: all 0.15s;
  }
  .dot.on {
    background: var(--cyan);
    box-shadow: 0 0 8px rgba(34, 211, 238, 0.7);
  }
</style>
