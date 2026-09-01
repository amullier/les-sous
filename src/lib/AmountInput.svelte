<script>
  import { fmt, parseAmount } from './utils.js'

  /** Champ montant : accepte un nombre ou une somme "11,2+50+60". */
  let { value = null, onchange, placeholder = '', onediting = () => {}, dimZero = false } = $props()

  let editing = false
  const display = $derived(value == null ? '' : fmt(value))

  function onfocus(e) {
    editing = true
    onediting(true)
    e.target.value = value == null ? '' : String(value).replace('.', ',')
    e.target.select()
  }
  function commit(e) {
    onediting(false)
    if (!editing) return
    editing = false
    const v = parseAmount(e.target.value)
    if (v === undefined) {
      // invalide : on revient à la valeur précédente
      e.target.value = display
      return
    }
    if (v !== value) onchange(v)
    e.target.value = v == null ? '' : fmt(v)
  }
</script>

<input
  class="amt"
  class:zero={dimZero && value === 0}
  type="text"
  inputmode="decimal"
  value={display}
  {placeholder}
  {onfocus}
  onblur={commit}
  onkeydown={(e) => e.key === 'Enter' && e.target.blur()}
/>

<style>
  .amt {
    width: 100%;
    border: 1px solid transparent;
    background: transparent;
    color: var(--txt);
    text-align: right;
    font: inherit;
    font-variant-numeric: tabular-nums;
    padding: 2px 5px;
    border-radius: 6px;
    min-width: 70px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .amt:hover { border-color: rgba(255, 255, 255, 0.18); }
  .amt.zero:not(:focus) { color: var(--muted); }
  .amt:focus {
    outline: none;
    border-color: rgba(34, 211, 238, 0.7);
    background: rgba(34, 211, 238, 0.07);
    box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.15), 0 0 16px rgba(34, 211, 238, 0.25);
  }
  .amt::placeholder { color: #4b5470; }
</style>
