'use client'

/**
 * Rendert KI-Antworten als formatiertes HTML:
 * - Markdown: Headlines, Bold, Italic, Bullets, Numbered Lists
 * - Versteckt ```json Blöcke (interne Daten, nicht für User)
 * - Wandelt [VERIFIZIERT], [PLAUSIBEL], [HYPOTHESE] in farbige Badges
 */
export function renderMessage(raw: string): string {
  if (!raw) return ''

  let text = raw

  // 1. JSON-Code-Blöcke komplett entfernen (```json ... ```)
  text = text.replace(/```json[\s\S]*?```/g, '')

  // Auch einzelne ``` am Ende entfernen (falls der Stream abbrach)
  text = text.replace(/```[\s\S]*$/g, '')

  // 2. Trailing whitespace / newlines nach dem Entfernen aufräumen
  text = text.trim()

  // 3. HTML-Entities escapen
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 4. Konfidenz-Badges
  text = text.replace(
    /\[VERIFIZIERT\]/g,
    '<span class="badge-verified">VERIFIZIERT</span>'
  )
  text = text.replace(
    /\[PLAUSIBEL\]/g,
    '<span class="badge-plausible">PLAUSIBEL</span>'
  )
  text = text.replace(
    /\[HYPOTHESE\]/g,
    '<span class="badge-hypothesis">HYPOTHESE</span>'
  )
  // English variants
  text = text.replace(
    /\[VERIFIED\]/g,
    '<span class="badge-verified">VERIFIED</span>'
  )
  text = text.replace(
    /\[PLAUSIBLE\]/g,
    '<span class="badge-plausible">PLAUSIBLE</span>'
  )
  text = text.replace(
    /\[HYPOTHESIS\]/g,
    '<span class="badge-hypothesis">HYPOTHESIS</span>'
  )

  // 5. Markdown → HTML
  // Headlines
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Horizontal Rule
  text = text.replace(/^---$/gm, '<hr>')

  // Bold + Italic
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Inline Code
  text = text.replace(/`(.+?)`/g, '<code>$1</code>')

  // Bullet Lists: sammle aufeinanderfolgende "- " Zeilen
  text = text.replace(/(^- .+$(\n- .+$)*)/gm, (match) => {
    const items = match.split('\n').map(line =>
      `<li>${line.replace(/^- /, '')}</li>`
    ).join('')
    return `<ul>${items}</ul>`
  })

  // Numbered Lists: sammle aufeinanderfolgende "1. " Zeilen
  text = text.replace(/(^\d+\. .+$(\n\d+\. .+$)*)/gm, (match) => {
    const items = match.split('\n').map(line =>
      `<li>${line.replace(/^\d+\. /, '')}</li>`
    ).join('')
    return `<ol>${items}</ol>`
  })

  // Blockquotes
  text = text.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')

  // Paragraphs: Doppelte Newlines → Absätze
  text = text.replace(/\n\n+/g, '</p><p>')
  text = text.replace(/\n/g, '<br>')

  // Wrap in paragraph
  text = '<p>' + text + '</p>'

  // Cleanup: leere Paragraphen, Headlines in Paragraphen
  text = text.replace(/<p><\/p>/g, '')
  text = text.replace(/<p>(<h[123]>)/g, '$1')
  text = text.replace(/(<\/h[123]>)<\/p>/g, '$1')
  text = text.replace(/<p>(<ul>)/g, '$1')
  text = text.replace(/(<\/ul>)<\/p>/g, '$1')
  text = text.replace(/<p>(<ol>)/g, '$1')
  text = text.replace(/(<\/ol>)<\/p>/g, '$1')
  text = text.replace(/<p>(<hr>)<\/p>/g, '$1')
  text = text.replace(/<p>(<blockquote>)/g, '$1')
  text = text.replace(/(<\/blockquote>)<\/p>/g, '$1')

  return text
}
