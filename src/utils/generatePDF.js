// Shared helpers used by UI components

export function dedupeArray(arr) {
  if (!Array.isArray(arr)) return []
  const seen = new Set()
  return arr.filter(item => {
    const key = String(item).toLowerCase().trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function hasMultipleSteps(text) {
  if (!text?.trim()) return false
  const t = text.trim()
  const lines = t.split('\n').filter(s => s.trim())
  if (lines.length > 1) return true
  if (/^\d+[\.\)]/m.test(t)) return true
  if (/^[-•*]/m.test(t)) return true
  const sentences = t.split(/\.\s+/).filter(s => s.trim().length > 10)
  return sentences.length >= 3
}

// Opens the pitch PDF page in a new tab — actual rendering happens in PitchPDF.jsx
export function generateIdeaPDF(idea) {
  if (idea?.id) window.open(`/pitch/${idea.id}`, '_blank')
}
