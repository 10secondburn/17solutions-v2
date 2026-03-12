import type { Language } from '@/types'
import type { SessionContext } from '@/lib/context-store/types'
import { TONALITY_DE, TONALITY_EN, FACTS_CONSTRAINT_DE, FACTS_CONSTRAINT_EN } from '@/lib/prompts/tonality'

export function getExecutiveSummarySystemPrompt(language: Language, context: SessionContext): string {
  if (language === 'en') return getExecutiveSummaryEN(context)
  return getExecutiveSummaryDE(context)
}

function buildFullRecapDE(context: SessionContext): string {
  let recap = ''

  if (context.brandProfile) {
    const bp = context.brandProfile
    recap += `## VERSTEHEN\n\n`
    recap += `### Marken-Profil\n${bp.brandName} | ${bp.sector} | ${bp.positioning}\nKernwerte: ${bp.coreValues?.join(', ')}\nMarktposition: ${bp.marketPosition}\n\n`
  }
  if (context.sdgMapping) {
    recap += `### SDG-Mapping\nAnalyse aller 17 SDGs liegt vor.\n\n`
  }
  if (context.sdgSelection) {
    const ss = context.sdgSelection
    recap += `### SDG-Auswahl\nPrimaeres SDG: ${ss.primarySDG} | Sekundaere: ${ss.secondarySDGs?.join(', ')}\nNarrativ: ${ss.strategicNarrative || ss.rationale}\n\n`
  }

  if (context.realityCheck) {
    const rc = context.realityCheck as any
    recap += `## VALIDIEREN\n\n`
    recap += `### Reality Check\nGreenwashing-Risiko: ${rc.greenwashingRiskScore}/10\nBewertung: ${rc.overallAssessment || 'liegt vor'}\n\n`
  }
  if (context.targetResearch) {
    const tr = context.targetResearch as any
    if (tr.protagonists) {
      recap += `### Protagonisten\n${tr.protagonists.map((p: any) => `- ${p.name}: ${p.realProblem} (Surprise ${p.surpriseScore}/10)`).join('\n')}\n\n`
    }
  }
  if (context.dataResearch) {
    const dr = context.dataResearch as any
    recap += `### Daten-Research\nSchluesselstatistik: ${dr.keyStatistic || 'k.A.'}\n`
    if (dr.timingWindows) {
      recap += `Timing: ${dr.timingWindows.map((tw: any) => tw.name).join(', ')}\n`
    }
    recap += '\n'
  }

  if (context.springboards) {
    const sb = context.springboards as any
    recap += `## CREATE\n\n`
    if (sb.springboards) {
      recap += `### Springboards\n${sb.springboards.map((s: any) => `- ${s.headline}: ${s.coreSpannung}`).join('\n')}\n\n`
    }
  }
  if (context.partnerships) {
    const p = context.partnerships as any
    if (p.partnerships) {
      recap += `### Partnerschaften\n${p.partnerships.map((pt: any) => `- ${pt.partnerName} (${pt.partnerType}): ${pt.strategicLogic}`).join('\n')}\n\n`
    }
  }
  if (context.audienceDesign) {
    const ad = context.audienceDesign as any
    if (ad.audiences) {
      recap += `### Zielpublikum\n${ad.audiences.map((a: any) => `- ${a.name}: ${a.whyTheyMatter}`).join('\n')}\n\n`
    }
  }
  if (context.ideaDevelopment) {
    const id = context.ideaDevelopment as any
    recap += `### Die Idee\nHeadline: ${id.headline || id.campaignName}\nKonzept: ${id.idea || id.coreConcept}\n\n`
  }

  if (context.businessImpact) {
    recap += `## BEWERTEN\n\n`
    recap += `### Business Impact\nModell liegt vor.\n\n`
  }
  if (context.roiEstimation) {
    const roi = context.roiEstimation as any
    recap += `### ROI-Schaetzung\nROI: ${roi.roiRatio || 'k.A.'}x | Budget: ${roi.totalBudgetRange || 'k.A.'}\n\n`
  }
  if (context.caseBoard) {
    recap += `### Case Board\nVisuelles Board liegt vor.\n\n`
  }

  return recap
}

function buildFullRecapEN(context: SessionContext): string {
  let recap = ''

  if (context.brandProfile) {
    const bp = context.brandProfile
    recap += `## UNDERSTAND\n\n`
    recap += `### Brand Profile\n${bp.brandName} | ${bp.sector} | ${bp.positioning}\nValues: ${bp.coreValues?.join(', ')}\n\n`
  }
  if (context.sdgSelection) {
    const ss = context.sdgSelection
    recap += `### SDG Selection\nPrimary: ${ss.primarySDG} | Secondary: ${ss.secondarySDGs?.join(', ')}\nNarrative: ${ss.strategicNarrative || ss.rationale}\n\n`
  }
  if (context.targetResearch) {
    const tr = context.targetResearch as any
    if (tr.protagonists) {
      recap += `## VALIDATE\n\n### Protagonists\n${tr.protagonists.map((p: any) => `- ${p.name}: ${p.realProblem}`).join('\n')}\n\n`
    }
  }
  if (context.ideaDevelopment) {
    const id = context.ideaDevelopment as any
    recap += `## CREATE\n\n### The Idea\nHeadline: ${id.headline || id.campaignName}\nConcept: ${id.idea || id.coreConcept}\n\n`
  }
  if (context.businessImpact) {
    recap += `## EVALUATE\n\n### Business Impact\nModel available.\n\n`
  }

  return recap
}

function getExecutiveSummaryDE(context: SessionContext): string {
  const recap = buildFullRecapDE(context)

  return `# 17solutions. Modul 13: Executive Summary

## Deine Rolle
Du bist der strategische Redakteur, der alles Erarbeitete in eine strukturierte, ueberzeugende Zusammenfassung bringt. Nicht als Wiederholung, sondern als Verdichtung. Jeder Abschnitt auf den Punkt. Jede Erkenntnis mit Substanz.

## Bisherige Ergebnisse
${recap}

## Aufgabe
Erstelle eine vollstaendige Executive Summary, die alle Phasen und Module zusammenfasst. Strukturiere sie so:

### 1. TITEL & KONTEXT
Projekttitel, Markenname, Datum. Ein Satz der das Projekt zusammenfasst.

### 2. VERSTEHEN (Module 01-03)
Was wurde ueber die Marke gelernt? Welches SDG und warum? Die wichtigsten strategischen Einsichten.

### 3. VALIDIEREN (Module 04-06)
Reality Check: Wo steht die Marke wirklich? Protagonisten: Wer sind die Menschen dahinter? Daten: Welche Fakten stuetzen die Strategie?

### 4. CREATE (Module 07-09)
Springboards: Welche kreativen Richtungen wurden eroeffnet? Partnerschaften & Zielpublikum: Mit wem und fuer wen? Die Idee: Was ist das Konzept?

### 5. BEWERTEN (Module 10-12)
Business Impact: Was bringt es? ROI: Was kostet es und was kommt zurueck? Case Board: Wie sieht es aus?

### 6. STRATEGISCHE SCHLUSSFOLGERUNG
3-5 Saetze, die das gesamte Projekt auf den Punkt bringen. Was ist die eine grosse Erkenntnis? Was sollte als naechstes passieren?

### 7. IP-VERMERK
Schliesse mit folgendem Vermerk ab (woertlich):

"Die 17solutions Methode, einschliesslich aller Analyse-Frameworks, Modul-Strukturen und strategischen Prozesse, ist geistiges Eigentum. Jegliche Reproduktion, Weitergabe oder kommerzielle Nutzung ohne ausdrueckliche Genehmigung ist untersagt."

## Wichtig
KRITISCH: Beginne deine Antwort IMMER mit dem JSON-Block. Der JSON-Block muss das ERSTE sein, was du ausgibst.

- Jeder Abschnitt soll die WESENTLICHEN Erkenntnisse enthalten, nicht alles wiederholen
- Schreibe praegnant. Kein Fuellmaterial.
- Nutze die Daten und Scores aus den Modulen wo relevant
- Der Ton ist professionell aber nicht steif

## Strukturierter Output
Liefere ZUERST den strukturierten Block:

\`\`\`json
{
  "title": "Executive Summary: [Marke] x SDG [Nummer]",
  "brandName": "${context.brandName}",
  "date": "${new Date().toISOString().split('T')[0]}",
  "sections": [
    {
      "phase": "verstehen",
      "moduleId": "verstehen_01",
      "moduleName": "Marken-Profil",
      "summary": "Zusammenfassung",
      "keyFindings": ["Erkenntnis 1", "Erkenntnis 2"]
    }
  ],
  "strategicConclusion": "Strategische Schlussfolgerung in 3-5 Saetzen",
  "ipNotice": "Die 17solutions Methode ist geistiges Eigentum...",
  "confidenceScore": 0.85
}
\`\`\`

Danach schreibe die Executive Summary.

## Sprache & Ton
${TONALITY_DE}

${FACTS_CONSTRAINT_DE}`
}

function getExecutiveSummaryEN(context: SessionContext): string {
  const recap = buildFullRecapEN(context)

  return `# 17solutions. Module 13: Executive Summary

## Your Role
You are the strategic editor who distills everything into a structured, compelling summary. Not repetition but condensation. Every section to the point. Every finding with substance.

## Previous Results
${recap}

## Task
Create a complete Executive Summary covering all phases and modules:

### 1. TITLE & CONTEXT
Project title, brand name, date. One sentence summarizing the project.

### 2. UNDERSTAND (Modules 01-03)
What was learned about the brand? Which SDG and why?

### 3. VALIDATE (Modules 04-06)
Reality Check, Protagonists, Data findings.

### 4. CREATE (Modules 07-09)
Springboards, Partnerships & Audience, The Idea.

### 5. EVALUATE (Modules 10-12)
Business Impact, ROI, Case Board.

### 6. STRATEGIC CONCLUSION
3-5 sentences summing up the entire project.

### 7. IP NOTICE
Close with: "The 17solutions methodology, including all analysis frameworks, module structures and strategic processes, is intellectual property. Any reproduction, distribution or commercial use without explicit permission is prohibited."

## Structured Output
CRITICAL: ALWAYS begin your response with the JSON block. The JSON block must be the FIRST thing you output.

Provide the structured block FIRST:

\`\`\`json
{
  "title": "Executive Summary: [Brand] x SDG [Number]",
  "brandName": "${context.brandName}",
  "date": "${new Date().toISOString().split('T')[0]}",
  "sections": [
    {
      "phase": "understand",
      "moduleId": "verstehen_01",
      "moduleName": "Brand Profile",
      "summary": "Summary",
      "keyFindings": ["Finding 1", "Finding 2"]
    }
  ],
  "strategicConclusion": "Strategic conclusion in 3-5 sentences",
  "ipNotice": "The 17solutions methodology is intellectual property...",
  "confidenceScore": 0.85
}
\`\`\`

Then write the Executive Summary.

## Language & Tone
${TONALITY_EN}

${FACTS_CONSTRAINT_EN}`
}
