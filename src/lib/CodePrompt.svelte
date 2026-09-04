<script>
  import { codePrompt, answerCode } from './codePrompt.svelte.js'
  import Icon from './Icon.svelte'

  let code = $state('')

  function submit() {
    const v = code.trim()
    if (!v) return
    code = ''
    answerCode(v)
  }
  function cancel() {
    code = ''
    answerCode(null)
  }
  function onkeydown(e) {
    if (e.key === 'Enter') submit()
    else if (e.key === 'Escape') cancel()
  }
  function focusNow(node) {
    node.focus()
  }
</script>

{#if codePrompt.open}
  <div class="overlay" role="dialog" aria-label="Code requis">
    <div class="box" class:wrong={codePrompt.wrong}>
      <span class="padlock"><Icon name="lock" size={26} /></span>
      <h2>Sauvegarde chiffrée</h2>
      <p>
        {#if codePrompt.wrong}Code incorrect, réessayez.{:else}Entrez le code de masquage utilisé lors de l'export.{/if}
      </p>
      <input
        use:focusNow
        type="password"
        inputmode="numeric"
        autocomplete="off"
        placeholder="Code"
        bind:value={code}
        onkeydown={onkeydown}
      />
      <div class="actions">
        <button class="ghost" onclick={cancel}>Annuler</button>
        <button class="ok" onclick={submit} disabled={!code.trim()}><Icon name="check" size={14} /> Déchiffrer</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(4, 6, 14, 0.65);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }
  .box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 30px 42px;
    border: 1px solid var(--border);
    border-radius: 22px;
    background: rgba(10, 14, 28, 0.92);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.07);
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
  h2 { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: 0.02em; }
  p { margin: 0 0 6px; color: var(--muted); font-size: 13.5px; }
  .box.wrong p { color: #f87171; }
  input {
    font: inherit;
    font-size: 18px;
    letter-spacing: 0.4em;
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
  .actions { display: flex; gap: 10px; margin-top: 6px; }
  .actions button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font: inherit;
    padding: 8px 16px;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .ghost {
    border: 1px solid var(--border);
    background: var(--glass);
    color: var(--muted);
  }
  .ghost:hover { color: var(--txt); background: var(--glass2); }
  .ok {
    border: 1px solid rgba(34, 211, 238, 0.45);
    background: linear-gradient(135deg, rgba(34, 211, 238, 0.18), rgba(167, 139, 250, 0.2));
    color: #a5f3fc;
    font-weight: 600;
  }
  .ok:hover:not(:disabled) {
    border-color: rgba(34, 211, 238, 0.8);
    box-shadow: 0 0 14px rgba(34, 211, 238, 0.35);
    color: #fff;
  }
  .ok:disabled { opacity: 0.45; cursor: default; }
</style>
