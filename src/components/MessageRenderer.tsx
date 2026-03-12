'use client'

/**
 * Rendert KI-Antworten als formatiertes HTML:
 * - Markdown: Headlines, Bold, Italic, Bullets, Numbered Lists
 * - Versteckt ```json Blöcke (interne Daten, nicht für User)
 * - Wandelt [VERIFIZIERT], [PLAUSIBEL], [HYPOTHESE] in farbige Badges
 *   Erkennt auch Varianten: ohne Klammern, mit Underscores, mit Komma+Text
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

  // 4. Konfidenz-Badges — umfassende Erkennung aller Varianten
  // Reihenfolge: Erst spezifische Patterns (mit Klammern/Underscores), dann fallback

  // 4a. [BADGE, extra text] und [BADGE: extra text] — mit Klammern + Zusatztext
  text = text.replace(
    /\[VERIFIZIERT(?:[,:]([^\]]*))?\]/g,
    (_m, extra) => `<span class="badge-verified"${extra ? ` title="${extra.trim()}"` : ''}>VERIFIZIERT</span>`
  )
  text = text.replace(
    /\[PLAUSIBEL(?:[,:]([^\]]*))?\]/g,
    (_m, extra) => `<span class="badge-plausible"${extra ? ` title="${extra.trim()}"` : ''}>PLAUSIBEL</span>`
  )
  text = text.replace(
    /\[HYPOTHESE(?:[,:]([^\]]*))?\]/g,
    (_m, extra) => `<span class="badge-hypothesis"${extra ? ` title="${extra.trim()}"` : ''}>HYPOTHESE</span>`
  )
  // English
  text = text.replace(
    /\[VERIFIED(?:[,:]([^\]]*))?\]/g,
    (_m, extra) => `<span class="badge-verified"${extra ? ` title="${extra.trim()}"` : ''}>VERIFIED</span>`
  )
  text = text.replace(
    /\[PLAUSIBLE(?:[,:]([^\]]*))?\]/g,
    (_m, extra) => `<span class="badge-plausible"${extra ? ` title="${extra.trim()}"` : ''}>PLAUSIBLE</span>`
  )
  text = text.replace(
    /\[HYPOTHESIS(?:[,:]([^\]]*))?\]/g,
    (_m, extra) => `<span class="badge-hypothesis"${extra ? ` title="${extra.trim()}"` : ''}>HYPOTHESIS</span>`
  )

  // 4b. __BADGE__ — mit Underscores (Markdown-Bold-Variante)
  text = text.replace(/__VERIFIZIERT__/g, '<span class="badge-verified">VERIFIZIERT</span>')
  text = text.replace(/__PLAUSIBEL__/g, '<span class="badge-plausible">PLAUSIBEL</span>')
  text = text.replace(/__HYPOTHESE__/g, '<span class="badge-hypothesis">HYPOTHESE</span>')
  text = text.replace(/__VERIFIED__/g, '<span class="badge-verified">VERIFIED</span>')
  text = text.replace(/__PLAUSIBLE__/g, '<span class="badge-plausible">PLAUSIBLE</span>')
  text = text.replace(/__HYPOTHESIS__/g, '<span class="badge-hypothesis">HYPOTHESIS</span>')

  // 4c. Standalone BADGE (ohne Klammern, als ganzes Wort, nicht in HTML-Tags)
  // Nur matchen wenn es ein eigenständiges Wort ist (word boundary) und nicht bereits in einem span
  text = text.replace(/(?<![<\w])(?:^|\s)(VERIFIZIERT)(?=[\s.,;:!?\)]|$)/gm,
    (match) => match.replace('VERIFIZIERT', '<span class="badge-verified">VERIFIZIERT</span>'))
  text = text.replace(/(?<![<\w])(?:^|\s)(PLAUSIBEL)(?=[\s.,;:!?\)]|$)/gm,
    (match) => match.replace('PLAUSIBEL', '<span class="badge-plausible">PLAUSIBEL</span>'))
  text = text.replace(/(?<![<\w])(?:^|\s)(HYPOTHESE)(?=[\s.,;:!?\)]|$)/gm,
    (match) => match.replace('HYPOTHESE', '<span class="badge-hypothesis">HYPOTHESE</span>'))
  text = text.replace(/(?<![<\w])(?:^|\s)(VERIFIED)(?=[\s.,;:!?\)]|$)/gm,
    (match) => match.replace('VERIFIED', '<span class="badge-verified">VERIFIED</span>'))
  text = text.replace(/(?<![<\w])(?:^|\s)(PLAUSIBLE)(?=[\s.,;:!?\)]|$)/gm,
    (match) => match.replace('PLAUSIBLE', '<span class="badge-plausible">PLAUSIBLE</span>'))
  text = text.replace(/(?<![<\w])(?:^|\s)(HYPOTHESIS)(?=[\s.,;:!?\)]|$)/gm,
    (match) => match.replace('HYPOTHESIS', '<span class="badge-hypothesis">HYPOTHESIS</span>'))

  // 5. Markdown → HTML
  // Headlines with consistent styling
  // H1: 20px, bold, margin-top 24px — for major module sections
  text = text.replace(/^# (.+)$/gm, '<h1 style="font-size: 20px; font-weight: bold; margin-top: 24px; margin-bottom: 12px; color: var(--text-primary);">$1</h1>')
  // H2: 16px, bold, margin-top 20px — for sub-sections
  text = text.replace(/^## (.+)$/gm, '<h2 style="font-size: 16px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; color: var(--text-primary);">$1</h2>')
  // H3: 14px, bold, margin-top 16px — for sub-sub-sections
  text = text.replace(/^### (.+)$/gm, '<h3 style="font-size: 14px; font-weight: bold; margin-top: 16px; margin-bottom: 8px; color: var(--text-primary);">$1</h3>')
  // H4+: map to H3 styling (no smaller headings)
  text = text.replace(/^#### (.+)$/gm, '<h3 style="font-size: 14px; font-weight: bold; margin-top: 16px; margin-bottom: 8px; color: var(--text-primary);">$1</h3>')
  text = text.replace(/^##### (.+)$/gm, '<h3 style="font-size: 14px; font-weight: bold; margin-top: 16px; margin-bottom: 8px; color: var(--text-primary);">$1</h3>')
  text = text.replace(/^###### (.+)$/gm, '<h3 style="font-size: 14px; font-weight: bold; margin-top: 16px; margin-bottom: 8px; color: var(--text-primary);">$1</h3>')

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
  // Handle styled h1, h2, h3 tags
  text = text.replace(/<p>(<h[123][^>]*>)/g, '$1')
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
