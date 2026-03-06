import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { sessions, messages, contextStore } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export const maxDuration = 30

/**
 * GET /api/export?sessionId=xxx&format=pdf|pptx|docx&moduleId=verstehen_01
 *
 * Generates a downloadable document from session data
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
    const moduleId = searchParams.get('moduleId')

    if (!sessionId) {
      return new Response('Missing sessionId', { status: 400 })
    }

    // Session laden
    const [sess] = await db.select().from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1)

    if (!sess) {
      return new Response('Session not found', { status: 404 })
    }

    // Messages laden (nur Assistant-Messages)
    const msgs = await db.select().from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(asc(messages.createdAt))

    const assistantMessages = msgs
      .filter(m => m.role === 'assistant')
      .map(m => m.content)

    // Wenn moduleId angegeben, nur Messages bis zu diesem Modul
    // (vereinfacht: alle bisherigen Assistant-Messages)
    const content = assistantMessages.join('\n\n---\n\n')

    // JSON-Bloecke entfernen fuer den Export
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
// PDF Generation
// ============================================================
async function generatePdf(brandName: string, content: string) {
  // Dynamic import to avoid bundling issues
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const maxWidth = pageWidth - margin * 2

  // Header
  doc.setFillColor(30, 35, 40)
  doc.rect(0, 0, pageWidth, 35, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('17solutions', margin, 20)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Analyse: ${brandName}`, margin, 30)

  // Content
  doc.setTextColor(40, 40, 40)
  let y = 50

  const lines = content.split('\n')
  for (const line of lines) {
    if (y > 270) {
      doc.addPage()
      y = 20
    }

    const trimmed = line.trim()
    if (!trimmed) {
      y += 4
      continue
    }

    // Headlines
    if (trimmed.startsWith('### ')) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(74, 158, 142) // teal
      const text = trimmed.replace('### ', '')
      doc.text(text, margin, y)
      y += 8
      doc.setTextColor(40, 40, 40)
      continue
    }
    if (trimmed.startsWith('## ')) {
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(232, 116, 97) // coral
      const text = trimmed.replace('## ', '')
      doc.text(text, margin, y)
      y += 10
      doc.setTextColor(40, 40, 40)
      continue
    }
    if (trimmed.startsWith('# ')) {
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      const text = trimmed.replace('# ', '')
      doc.text(text, margin, y)
      y += 12
      continue
    }

    // Bullets
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const text = trimmed.slice(2)
      const splitLines = doc.splitTextToSize(text, maxWidth - 8)
      doc.text('•', margin, y)
      doc.text(splitLines, margin + 6, y)
      y += splitLines.length * 5 + 2
      continue
    }

    // Regular text
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    // Strip markdown bold
    const cleanText = trimmed.replace(/\*\*(.*?)\*\*/g, '$1')
    const splitLines = doc.splitTextToSize(cleanText, maxWidth)
    doc.text(splitLines, margin, y)
    y += splitLines.length * 5 + 2
  }

  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`17solutions — ${brandName} — Seite ${i}/${totalPages}`, margin, 290)
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
// DOCX Generation
// ============================================================
async function generateDocx(brandName: string, content: string) {
  const { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType, BorderStyle } = await import('docx')

  const children: any[] = []

  // Title
  children.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 200 },
    children: [
      new TextRun({ text: '17solutions', bold: true, size: 36, color: '4A9E8E' }),
    ],
  }))

  children.push(new Paragraph({
    spacing: { after: 400 },
    children: [
      new TextRun({ text: `Analyse: ${brandName}`, size: 28, color: 'E87461' }),
    ],
  }))

  // Separator
  children.push(new Paragraph({
    spacing: { after: 300 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
    children: [],
  }))

  // Parse content
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      children.push(new Paragraph({ spacing: { after: 100 }, children: [] }))
      continue
    }

    if (trimmed.startsWith('### ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: trimmed.replace('### ', ''), bold: true, size: 24, color: '4A9E8E' })],
      }))
      continue
    }
    if (trimmed.startsWith('## ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
        children: [new TextRun({ text: trimmed.replace('## ', ''), bold: true, size: 28, color: 'E87461' })],
      }))
      continue
    }
    if (trimmed.startsWith('# ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        children: [new TextRun({ text: trimmed.replace('# ', ''), bold: true, size: 32 })],
      }))
      continue
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const text = trimmed.slice(2)
      children.push(new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 60 },
        children: parseInlineFormatting(text, 20),
      }))
      continue
    }

    if (trimmed === '---') {
      children.push(new Paragraph({
        spacing: { before: 200, after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
        children: [],
      }))
      continue
    }

    // Regular paragraph
    children.push(new Paragraph({
      spacing: { after: 100 },
      children: parseInlineFormatting(trimmed, 20),
    }))
  }

  const doc = new Document({
    sections: [{ children }],
  })

  const buffer = await Packer.toBuffer(doc)
  const uint8 = new Uint8Array(buffer)

  return new Response(uint8, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="17solutions_${brandName.replace(/\s+/g, '_')}.docx"`,
    },
  })
}

// Helper: Parse **bold** inline formatting for docx
function parseInlineFormatting(text: string, size: number) {
  const { TextRun } = require('docx')
  const parts: any[] = []
  const regex = /\*\*(.*?)\*\*/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(new TextRun({ text: text.slice(lastIndex, match.index), size }))
    }
    parts.push(new TextRun({ text: match[1], bold: true, size }))
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(new TextRun({ text: text.slice(lastIndex), size }))
  }

  return parts.length > 0 ? parts : [new TextRun({ text, size })]
}

// ============================================================
// PPTX Generation
// ============================================================
async function generatePptx(brandName: string, content: string) {
  const PptxGenJS = (await import('pptxgenjs')).default

  const pptx = new PptxGenJS()
  pptx.title = `17solutions — ${brandName}`
  pptx.author = '17solutions'

  // Slide 1: Title
  const slide1 = pptx.addSlide()
  slide1.background = { fill: '1E2328' }
  slide1.addText('17solutions', {
    x: 0.8, y: 1.5, w: 8.4, h: 1,
    fontSize: 36, bold: true, color: '4A9E8E',
    fontFace: 'Helvetica',
  })
  slide1.addText(`Analyse: ${brandName}`, {
    x: 0.8, y: 2.5, w: 8.4, h: 0.8,
    fontSize: 24, color: 'E87461',
    fontFace: 'Helvetica',
  })
  slide1.addText(new Date().toLocaleDateString('de-DE'), {
    x: 0.8, y: 4, w: 8.4, h: 0.5,
    fontSize: 14, color: '888888',
    fontFace: 'Helvetica',
  })

  // Parse content into sections
  const sections = content.split('---').filter(s => s.trim())

  for (const section of sections) {
    const lines = section.trim().split('\n').filter(l => l.trim())
    if (lines.length === 0) continue

    const slide = pptx.addSlide()
    slide.background = { fill: '1E2328' }

    // Find title (first heading)
    let title = brandName
    let bodyLines: string[] = []
    let startIdx = 0

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim()
      if (l.startsWith('# ') || l.startsWith('## ') || l.startsWith('### ')) {
        title = l.replace(/^#{1,3}\s+/, '')
        startIdx = i + 1
        break
      }
    }

    bodyLines = lines.slice(startIdx).map(l => l.trim()).filter(l => l)

    // Title
    slide.addText(title, {
      x: 0.8, y: 0.4, w: 8.4, h: 0.8,
      fontSize: 22, bold: true, color: 'FFFFFF',
      fontFace: 'Helvetica',
    })

    // Body — format bullets and text
    const bodyText: any[] = []
    for (const line of bodyLines) {
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const text = line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1')
        bodyText.push({
          text: `• ${text}`,
          options: { fontSize: 13, color: 'CCCCCC', fontFace: 'Helvetica', bullet: false, breakLine: true },
        })
      } else if (line.startsWith('### ')) {
        bodyText.push({
          text: line.replace('### ', ''),
          options: { fontSize: 16, bold: true, color: '4A9E8E', fontFace: 'Helvetica', breakLine: true, spaceBefore: 12 },
        })
      } else {
        const cleanText = line.replace(/\*\*(.*?)\*\*/g, '$1')
        bodyText.push({
          text: cleanText,
          options: { fontSize: 12, color: 'BBBBBB', fontFace: 'Helvetica', breakLine: true },
        })
      }
    }

    if (bodyText.length > 0) {
      slide.addText(bodyText, {
        x: 0.8, y: 1.4, w: 8.4, h: 4.2,
        valign: 'top',
        lineSpacingMultiple: 1.3,
      })
    }

    // Footer
    slide.addText('17solutions', {
      x: 0.8, y: 6.8, w: 4, h: 0.3,
      fontSize: 8, color: '666666', fontFace: 'Helvetica',
    })
  }

  const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer
  const uint8 = new Uint8Array(buffer)

  return new Response(uint8, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="17solutions_${brandName.replace(/\s+/g, '_')}.pptx"`,
    },
  })
}
