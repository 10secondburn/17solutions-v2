import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { sessions, messages } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export const maxDuration = 30

// ============================================================
// Design Tokens
// ============================================================
const BRAND = {
  teal: '4A9E8E',
  coral: 'E87461',
  dark: '1E2328',
  textDark: '2D2D2D',
  textBody: '3A3A3A',
  textMuted: '888888',
  textLight: 'CCCCCC',
  white: 'FFFFFF',
  separator: 'D4D4D4',
}

const FONTS = {
  heading: 'Helvetica',
  body: 'Helvetica',
}

/**
 * GET /api/export?sessionId=xxx&format=pdf|pptx|docx|markdown
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')
    const format = searchParams.get('format') || 'pdf'

    if (!sessionId) {
      return new Response('Missing sessionId', { status: 400 })
    }

    const [sess] = await db.select().from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1)

    if (!sess) {
      return new Response('Session not found', { status: 404 })
    }

    const msgs = await db.select().from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(asc(messages.createdAt))

    // Markdown-Export braucht den kompletten Chat (User + Assistant)
    if (format === 'markdown') {
      return generateMarkdown(sess.brandName, msgs)
    }

    const assistantMessages = msgs
      .filter(m => m.role === 'assistant')
      .map(m => m.content)

    const content = assistantMessages.join('\n\n---\n\n')

    const cleanContent = content
      .replace(/```json[\s\S]*?```/g, '')
      .replace(/\[VERIFIZIERT\]/g, '[Verifiziert]')
      .replace(/\[PLAUSIBEL\]/g, '[Plausibel]')
      .replace(/\[HYPOTHESE\]/g, '[Hypothese]')
      .trim()

    switch (format) {
      case 'docx':
        return generateDocx(sess.brandName, cleanContent)
      case 'pptx':
        return generatePptx(sess.brandName, cleanContent)
      case 'pdf':
      default:
        return generatePdf(sess.brandName, cleanContent)
    }
  } catch (error: any) {
    console.error('Export error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ============================================================
// Shared: Inline Markdown Parser
// ============================================================
interface TextSegment {
  text: string
  bold: boolean
  italic: boolean
}

function parseInlineMarkdown(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      segments.push({ text: match[2], bold: true, italic: false })
    } else if (match[3]) {
      segments.push({ text: match[3], bold: false, italic: true })
    } else if (match[4]) {
      segments.push({ text: match[4], bold: false, italic: false })
    }
  }
  return segments.length > 0 ? segments : [{ text, bold: false, italic: false }]
}

function dateLabel(): string {
  return new Date().toLocaleDateString('de-DE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ============================================================
// PDF
// ============================================================
async function generatePdf(brandName: string, content: string) {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const ml = 25
  const mr = 25
  const maxW = pageWidth - ml - mr
  const footerY = pageHeight - 12

  function checkPage(need: number) {
    if (y > pageHeight - 25 - need) {
      doc.addPage()
      y = 25
    }
  }

  // Cover
  doc.setFillColor(30, 35, 40)
  doc.rect(0, 0, pageWidth, 100, 'F')
  doc.setFillColor(74, 158, 142)
  doc.rect(ml, 88, 40, 2, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(32)
  doc.setFont(FONTS.heading, 'bold')
  doc.text('17solutions', ml, 45)

  doc.setFontSize(20)
  doc.setFont(FONTS.heading, 'normal')
  doc.setTextColor(232, 116, 97)
  doc.text(brandName, ml, 62)

  doc.setFontSize(11)
  doc.setTextColor(180, 180, 180)
  doc.text('SDG Strategy Analysis', ml, 78)

  doc.setTextColor(120, 120, 120)
  doc.setFontSize(10)
  doc.text(dateLabel(), ml, 120)

  // Content
  doc.addPage()
  let y = 30

  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) { y += 3; continue }

    if (trimmed === '---') {
      checkPage(8)
      y += 4
      doc.setDrawColor(210, 210, 210)
      doc.setLineWidth(0.3)
      doc.line(ml, y, pageWidth - mr, y)
      y += 8
      continue
    }

    // H1
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      checkPage(18)
      y += 6
      doc.setFontSize(18)
      doc.setFont(FONTS.heading, 'bold')
      doc.setTextColor(45, 45, 45)
      const t = trimmed.replace('# ', '').replace(/\*\*(.*?)\*\*/g, '$1')
      const sl = doc.splitTextToSize(t, maxW)
      doc.text(sl, ml, y)
      y += sl.length * 8 + 4
      doc.setFillColor(74, 158, 142)
      doc.rect(ml, y - 2, 30, 1, 'F')
      y += 6
      continue
    }

    // H2
    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      checkPage(14)
      y += 5
      doc.setFontSize(14)
      doc.setFont(FONTS.heading, 'bold')
      doc.setTextColor(232, 116, 97)
      const t = trimmed.replace('## ', '').replace(/\*\*(.*?)\*\*/g, '$1')
      const sl = doc.splitTextToSize(t, maxW)
      doc.text(sl, ml, y)
      y += sl.length * 6.5 + 4
      continue
    }

    // H3
    if (trimmed.startsWith('### ')) {
      checkPage(12)
      y += 4
      doc.setFontSize(11.5)
      doc.setFont(FONTS.heading, 'bold')
      doc.setTextColor(74, 158, 142)
      const t = trimmed.replace('### ', '').replace(/\*\*(.*?)\*\*/g, '$1')
      const sl = doc.splitTextToSize(t, maxW)
      doc.text(sl, ml, y)
      y += sl.length * 5.5 + 3
      continue
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      checkPage(8)
      doc.setFontSize(9.5)
      const numMatch = trimmed.match(/^(\d+\.)\s(.*)$/)
      if (numMatch) {
        doc.setFont(FONTS.body, 'bold')
        doc.setTextColor(74, 158, 142)
        doc.text(numMatch[1], ml, y)
        doc.setFont(FONTS.body, 'normal')
        doc.setTextColor(58, 58, 58)
        const ct = numMatch[2].replace(/\*\*(.*?)\*\*/g, '$1')
        const sl = doc.splitTextToSize(ct, maxW - 10)
        doc.text(sl, ml + 8, y)
        y += sl.length * 4.5 + 2.5
      }
      continue
    }

    // Bullets
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      checkPage(8)
      doc.setFontSize(9.5)
      doc.setFont(FONTS.body, 'normal')
      doc.setTextColor(58, 58, 58)
      const t = trimmed.slice(2).replace(/\*\*(.*?)\*\*/g, '$1')
      const sl = doc.splitTextToSize(t, maxW - 8)
      doc.setFillColor(74, 158, 142)
      doc.circle(ml + 1.5, y - 1.2, 0.8, 'F')
      doc.text(sl, ml + 6, y)
      y += sl.length * 4.5 + 2.5
      continue
    }

    // Body text
    checkPage(8)
    doc.setFontSize(9.5)
    doc.setFont(FONTS.body, 'normal')
    doc.setTextColor(58, 58, 58)
    const ct = trimmed.replace(/\*\*(.*?)\*\*/g, '$1')
    const sl = doc.splitTextToSize(ct, maxW)
    doc.text(sl, ml, y)
    y += sl.length * 4.5 + 2
  }

  // Footers on content pages
  const totalPages = doc.getNumberOfPages()
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7.5)
    doc.setFont(FONTS.body, 'normal')
    doc.setTextColor(160, 160, 160)
    doc.text('17solutions', ml, footerY)
    doc.text(brandName, pageWidth / 2, footerY, { align: 'center' })
    doc.text(`${i - 1} / ${totalPages - 1}`, pageWidth - mr, footerY, { align: 'right' })
    doc.setDrawColor(210, 210, 210)
    doc.setLineWidth(0.3)
    doc.line(ml, footerY - 4, pageWidth - mr, footerY - 4)
  }

  const buffer = doc.output('arraybuffer')
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="17solutions_${brandName.replace(/\s+/g, '_')}.pdf"`,
    },
  })
}

// ============================================================
// DOCX
// ============================================================
async function generateDocx(brandName: string, content: string) {
  const {
    Document, Paragraph, TextRun, HeadingLevel, Packer,
    BorderStyle, ShadingType,
  } = await import('docx')

  const children: any[] = []

  // Title block
  children.push(new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text: '17solutions', bold: true, size: 48, color: BRAND.teal, font: FONTS.heading })],
  }))
  children.push(new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: brandName, size: 36, color: BRAND.coral, font: FONTS.heading })],
  }))
  children.push(new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text: `SDG Strategy Analysis  ·  ${dateLabel()}`, size: 18, color: BRAND.textMuted, font: FONTS.body })],
  }))
  children.push(new Paragraph({
    spacing: { after: 400 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: BRAND.teal } },
    children: [],
  }))

  // Content
  const lines = content.split('\n')
  let inSources = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }))
      continue
    }

    if (trimmed === '### Quellen' || trimmed === '### Sources') inSources = true
    if (trimmed.startsWith('### ') && trimmed !== '### Quellen' && trimmed !== '### Sources') inSources = false

    if (trimmed === '---') {
      children.push(new Paragraph({
        spacing: { before: 300, after: 300 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: BRAND.separator } },
        children: [],
      }))
      continue
    }

    // H1
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      const t = trimmed.replace('# ', '').replace(/\*\*(.*?)\*\*/g, '$1')
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 480, after: 200 },
        children: [new TextRun({ text: t, bold: true, size: 36, color: BRAND.textDark, font: FONTS.heading })],
      }))
      children.push(new Paragraph({
        spacing: { after: 240 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: BRAND.teal } },
        children: [new TextRun({ text: '  ', size: 4 })],
      }))
      continue
    }

    // H2
    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      const t = trimmed.replace('## ', '').replace(/\*\*(.*?)\*\*/g, '$1')
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 360, after: 160 },
        children: [new TextRun({ text: t, bold: true, size: 28, color: BRAND.coral, font: FONTS.heading })],
      }))
      continue
    }

    // H3
    if (trimmed.startsWith('### ')) {
      const t = trimmed.replace('### ', '').replace(/\*\*(.*?)\*\*/g, '$1')
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 280, after: 120 },
        children: [new TextRun({ text: t, bold: true, size: 23, color: BRAND.teal, font: FONTS.heading })],
      }))
      continue
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      const m = trimmed.match(/^(\d+\.)\s(.*)$/)
      if (m) {
        const segs = parseInlineMarkdown(m[2])
        const runs: any[] = [new TextRun({ text: `${m[1]} `, bold: true, size: 20, color: BRAND.teal, font: FONTS.body })]
        for (const s of segs) {
          runs.push(new TextRun({ text: s.text, bold: s.bold, italics: s.italic, size: 20, color: BRAND.textBody, font: FONTS.body }))
        }
        children.push(new Paragraph({ spacing: { after: 80 }, indent: { left: 280 }, children: runs }))
      }
      continue
    }

    // Bullets
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const segs = parseInlineMarkdown(trimmed.slice(2))
      const runs: any[] = segs.map(s => new TextRun({ text: s.text, bold: s.bold, italics: s.italic, size: 20, color: BRAND.textBody, font: FONTS.body }))
      children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 80 }, children: runs }))
      continue
    }

    // Sources entries (kursiv, light background)
    if (inSources && trimmed.startsWith('*') && trimmed.endsWith('*') && !trimmed.startsWith('**')) {
      const t = trimmed.replace(/^\*/, '').replace(/\*$/, '')
      children.push(new Paragraph({
        spacing: { after: 80 },
        shading: { type: ShadingType.CLEAR, fill: 'F5F5F5' },
        indent: { left: 200, right: 200 },
        children: [new TextRun({ text: t, italics: true, size: 18, color: BRAND.textMuted, font: FONTS.body })],
      }))
      continue
    }

    // Regular paragraph
    const segs = parseInlineMarkdown(trimmed)
    const runs: any[] = segs.map(s => new TextRun({ text: s.text, bold: s.bold, italics: s.italic, size: 20, color: BRAND.textBody, font: FONTS.body }))
    children.push(new Paragraph({ spacing: { after: 120, line: 320 }, children: runs }))
  }

  const docx = new Document({
    styles: {
      default: {
        document: {
          run: { size: 20, color: BRAND.textBody, font: FONTS.body },
          paragraph: { spacing: { after: 120, line: 320 } },
        },
      },
    },
    sections: [{
      properties: { page: { margin: { top: 1200, bottom: 1000, left: 1200, right: 1200 } } },
      children,
    }],
  })

  const buffer = await Packer.toBuffer(docx)
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="17solutions_${brandName.replace(/\s+/g, '_')}.docx"`,
    },
  })
}

// ============================================================
// PPTX
// ============================================================
async function generatePptx(brandName: string, content: string) {
  const PptxGenJS = (await import('pptxgenjs')).default

  const pptx = new PptxGenJS()
  pptx.title = `17solutions | ${brandName}`
  pptx.author = '17solutions'
  pptx.layout = 'LAYOUT_16x9'

  const sm = 0.8
  const cw = 8.4

  function addFooter(slide: any) {
    slide.addShape('line', { x: sm, y: 6.7, w: cw, h: 0, line: { color: '444444', width: 0.5 } })
    slide.addText('17solutions', { x: sm, y: 6.85, w: 3, h: 0.3, fontSize: 7, color: '666666', fontFace: FONTS.body })
    slide.addText(brandName, { x: 3.5, y: 6.85, w: 3, h: 0.3, fontSize: 7, color: '666666', fontFace: FONTS.body, align: 'center' })
  }

  // Cover slide
  const cover = pptx.addSlide()
  cover.background = { fill: BRAND.dark }
  cover.addShape('rect', { x: sm, y: 2.8, w: 1.5, h: 0.06, fill: { color: BRAND.teal } })
  cover.addText('17solutions', { x: sm, y: 1.4, w: cw, h: 0.8, fontSize: 40, bold: true, color: BRAND.teal, fontFace: FONTS.heading })
  cover.addText(brandName, { x: sm, y: 2.2, w: cw, h: 0.6, fontSize: 28, color: BRAND.coral, fontFace: FONTS.heading })
  cover.addText('SDG Strategy Analysis', { x: sm, y: 3.1, w: cw, h: 0.5, fontSize: 16, color: BRAND.textLight, fontFace: FONTS.body })
  cover.addText(dateLabel(), { x: sm, y: 3.6, w: cw, h: 0.4, fontSize: 12, color: BRAND.textMuted, fontFace: FONTS.body })

  // Content slides
  const sections = content.split('---').filter(s => s.trim())

  for (const section of sections) {
    const lines = section.trim().split('\n').filter(l => l.trim())
    if (lines.length === 0) continue

    const slide = pptx.addSlide()
    slide.background = { fill: BRAND.dark }

    // Find title
    let title = ''
    let bodyStart = 0
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim()
      if (l.startsWith('# ') || l.startsWith('## ') || l.startsWith('### ')) {
        title = l.replace(/^#{1,3}\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1')
        bodyStart = i + 1
        break
      }
    }
    if (!title && lines.length > 0) {
      title = lines[0].replace(/\*\*(.*?)\*\*/g, '$1')
      bodyStart = 1
    }

    const bodyLines = lines.slice(bodyStart).map(l => l.trim()).filter(l => l)

    // Title
    slide.addText(title, {
      x: sm, y: 0.35, w: cw, h: 0.65,
      fontSize: 22, bold: true, color: BRAND.white, fontFace: FONTS.heading, valign: 'bottom',
    })
    slide.addShape('rect', { x: sm, y: 1.1, w: 1.2, h: 0.04, fill: { color: BRAND.teal } })

    // Body
    const bodyText: any[] = []
    for (const bl of bodyLines) {
      if (bl.startsWith('### ')) {
        bodyText.push({
          text: bl.replace('### ', '').replace(/\*\*(.*?)\*\*/g, '$1'),
          options: { fontSize: 14, bold: true, color: BRAND.teal, fontFace: FONTS.heading, breakLine: true, paraSpaceBefore: 14, paraSpaceAfter: 4 },
        })
      } else if (bl.startsWith('- ') || bl.startsWith('* ')) {
        bodyText.push({
          text: bl.slice(2).replace(/\*\*(.*?)\*\*/g, '$1'),
          options: { fontSize: 11.5, color: BRAND.textLight, fontFace: FONTS.body, breakLine: true, bullet: { code: '2022' }, indentLevel: 0, paraSpaceAfter: 3 },
        })
      } else if (/^\d+\.\s/.test(bl)) {
        bodyText.push({
          text: bl.replace(/\*\*(.*?)\*\*/g, '$1'),
          options: { fontSize: 11.5, color: BRAND.textLight, fontFace: FONTS.body, breakLine: true, paraSpaceAfter: 3 },
        })
      } else {
        bodyText.push({
          text: bl.replace(/\*\*(.*?)\*\*/g, '$1'),
          options: { fontSize: 11, color: 'AAAAAA', fontFace: FONTS.body, breakLine: true, paraSpaceAfter: 4 },
        })
      }
    }

    if (bodyText.length > 0) {
      slide.addText(bodyText, { x: sm, y: 1.3, w: cw, h: 5.2, valign: 'top', lineSpacingMultiple: 1.25 })
    }

    addFooter(slide)
  }

  const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="17solutions_${brandName.replace(/\s+/g, '_')}.pptx"`,
    },
  })
}

// ============================================================
// MARKDOWN — Kompletter Chat-Export
// ============================================================
function generateMarkdown(brandName: string, msgs: { role: string; content: string; moduleId: string | null; createdAt: Date }[]) {
  const lines: string[] = []

  lines.push(`# 17solutions | ${brandName}`)
  lines.push(`**SDG Strategy Analysis** — ${dateLabel()}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  let currentModule = ''

  for (const msg of msgs) {
    // Modul-Wechsel markieren
    if (msg.moduleId && msg.moduleId !== currentModule) {
      currentModule = msg.moduleId
      lines.push(`## Modul: ${msg.moduleId}`)
      lines.push('')
    }

    if (msg.role === 'user') {
      lines.push(`### User`)
      lines.push('')
      lines.push(msg.content)
      lines.push('')
    } else if (msg.role === 'assistant') {
      lines.push(`### 17solutions`)
      lines.push('')
      // JSON-Bloecke entfernen fuer Lesbarkeit
      const cleanContent = msg.content
        .replace(/```json[\s\S]*?```/g, '')
        .trim()
      lines.push(cleanContent)
      lines.push('')
    }

    lines.push('---')
    lines.push('')
  }

  // IP-Vermerk am Ende
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('*Die 17solutions Methode, einschliesslich aller Analyse-Frameworks, Modul-Strukturen und strategischen Prozesse, ist geistiges Eigentum. Jegliche Reproduktion, Weitergabe oder kommerzielle Nutzung ohne ausdrueckliche Genehmigung ist untersagt.*')
  lines.push('')
  lines.push(`*Exportiert am ${dateLabel()}*`)

  const markdown = lines.join('\n')

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="17solutions_${brandName.replace(/\s+/g, '_')}_chat.md"`,
    },
  })
}
