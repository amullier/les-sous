// Popup de saisie de code (déchiffrement d'une sauvegarde importée).
// askCode() renvoie une promesse résolue avec le code saisi, ou null si annulé.

export const codePrompt = $state({ open: false, wrong: false })

let resolver = null

export function askCode(wrong = false) {
  codePrompt.open = true
  codePrompt.wrong = wrong
  return new Promise((resolve) => (resolver = resolve))
}

export function answerCode(value) {
  codePrompt.open = false
  resolver?.(value)
  resolver = null
}
