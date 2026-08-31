<script>
  let { onclose, setScreen } = $props()

  const steps = [
    {
      title: '👋 Bienvenue dans les sous',
      text: "L'app pour gérer le budget du foyer à plusieurs. Important : toutes vos données restent dans ce navigateur, rien n'est envoyé sur un serveur. Pensez à exporter une sauvegarde (Paramétrage).",
    },
    {
      sel: '[data-tour="nav"]',
      screen: 'suivi',
      title: 'Deux écrans',
      text: '« Suivi » pour la saisie et le récap mensuel, « Paramétrage » pour configurer le foyer.',
    },
    {
      sel: '[data-tour="recettes"]',
      screen: 'suivi',
      title: 'Recettes',
      text: 'Saisissez les revenus de chacun. Astuce : vous pouvez taper une somme, par ex. « 1200+87,15 ». La colonne grise donne la moyenne sur 12 mois, les flèches comparent au mois précédent.',
    },
    {
      sel: '[data-tour="budget"]',
      screen: 'suivi',
      title: 'Budget',
      text: 'Le prévisionnel répartit automatiquement le budget entre les personnes (à la proportionnelle ou au même reste à vivre). Dans « Budget réel », saisissez ce que chacun a réellement versé.',
    },
    {
      sel: '[data-tour="depenses"]',
      screen: 'suivi',
      title: 'Dépenses',
      text: 'Saisissez vos dépenses par poste. Le cadenas = dépense fixe. Les montants gris sont les prévisions : cliquez sur la coche pour les valider tels quels.',
    },
    {
      sel: '[data-tour="nav-mois"]',
      screen: 'suivi',
      title: 'Navigation',
      text: 'Changez de période ici. Le nombre de mois affichés se règle dans le paramétrage.',
    },
    {
      sel: '[data-tour="param"]',
      screen: 'param',
      title: 'Paramétrage',
      text: 'Personnes, recettes, mode de répartition, catégories et montants prévus… et surtout l\u2019export / import de vos données. Bonne gestion ! 💪',
    },
  ]

  let i = $state(0)
  let rect = $state(null)

  $effect(() => {
    const s = steps[i]
    if (s.screen) setScreen(s.screen)
    rect = null
    const t = setTimeout(() => {
      const el = s.sel ? document.querySelector(s.sel) : null
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' })
        rect = el.getBoundingClientRect()
      }
    }, 60)
    return () => clearTimeout(t)
  })

  const tipStyle = $derived.by(() => {
    if (!rect) return 'left:50%;top:50%;transform:translate(-50%,-50%)'
    const below = rect.bottom + 180 < window.innerHeight
    const top = below ? rect.bottom + 12 : Math.max(10, rect.top - 190)
    const left = Math.max(10, Math.min(rect.left, window.innerWidth - 380))
    return `left:${left}px;top:${top}px`
  })

  function next() {
    if (i < steps.length - 1) i++
    else onclose()
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<div class="tuto">
  {#if rect}
    <div
      class="hl"
      style="left:{rect.left - 5}px;top:{rect.top - 5}px;width:{rect.width + 10}px;height:{rect.height + 10}px"
    ></div>
  {:else}
    <div class="veil"></div>
  {/if}
  <div class="tip" style={tipStyle}>
    <h3>{steps[i].title}</h3>
    <p>{steps[i].text}</p>
    <div class="actions">
      <span class="count">{i + 1}/{steps.length}</span>
      <button class="skip" onclick={onclose}>Passer</button>
      {#if i > 0}<button onclick={() => i--}>Précédent</button>{/if}
      <button class="primary" onclick={next}>{i === steps.length - 1 ? 'Terminer' : 'Suivant'}</button>
    </div>
  </div>
</div>

<style>
  .tuto { position: fixed; inset: 0; z-index: 100; }
  .veil { position: fixed; inset: 0; background: rgba(2, 4, 10, 0.72); backdrop-filter: blur(2px); }
  .hl {
    position: fixed;
    border-radius: 10px;
    box-shadow:
      0 0 0 9999px rgba(2, 4, 10, 0.72),
      0 0 0 2px var(--cyan),
      0 0 28px rgba(34, 211, 238, 0.6),
      inset 0 0 18px rgba(34, 211, 238, 0.15);
    transition: all 0.25s;
    pointer-events: none;
  }
  .tip {
    position: fixed;
    background: rgba(14, 18, 34, 0.88);
    backdrop-filter: blur(20px) saturate(1.4);
    -webkit-backdrop-filter: blur(20px) saturate(1.4);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 14px;
    padding: 16px 20px;
    max-width: 360px;
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
  .tip h3 {
    margin: 0 0 6px;
    font-size: 16px;
    background: linear-gradient(90deg, var(--cyan), var(--violet));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .tip p { margin: 0 0 14px; font-size: 14px; line-height: 1.5; color: #c7cde0; }
  .actions { display: flex; gap: 8px; align-items: center; justify-content: flex-end; }
  .count { color: var(--muted); font-size: 12px; margin-right: auto; }
  button {
    font: inherit;
    padding: 6px 14px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--glass);
    color: var(--txt);
    cursor: pointer;
    transition: all 0.2s;
  }
  button:hover { background: var(--glass2); }
  button.primary {
    background: linear-gradient(135deg, rgba(34, 211, 238, 0.85), rgba(167, 139, 250, 0.9));
    border-color: transparent;
    color: #06121c;
    font-weight: 700;
    box-shadow: 0 0 20px rgba(34, 211, 238, 0.4);
  }
  button.primary:hover { box-shadow: 0 0 28px rgba(167, 139, 250, 0.55); }
  button.skip { border: none; background: none; color: var(--muted); }
</style>
