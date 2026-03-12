import type { Language } from '@/types'
import type { SessionContext } from '@/lib/context-store/types'
import { TONALITY_DE, TONALITY_EN, FACTS_CONSTRAINT_DE, FACTS_CONSTRAINT_EN } from '@/lib/prompts/tonality'

export function getSpringboardsSystemPrompt(language: Language, context: SessionContext): string {
  if (language === 'en') {
    return getSpringboardsEN(context)
  }
  return getSpringboardsDE(context)
}

function buildFullContextDE(context: SessionContext): string {
  let prev = `## Marke: ${context.brandName}\n`

  if (context.brandProfile) {
    prev += `
### Marken-Profil
- Branche: ${context.brandProfile.sector || 'k.A.'}
- Positionierung: ${context.brandProfile.positioning}
- Kernwerte: ${context.brandProfile.coreValues?.join(', ') || 'k.A.'}
- Marktposition: ${context.brandProfile.marketPosition}
`
  }

  if (context.sdgSelection) {
    prev += `
### SDG-Auswahl
- Primaeres SDG: ${context.sdgSelection.primarySDG}
- Sekundaere SDGs: ${context.sdgSelection.secondarySDGs?.join(', ') || 'k.A.'}
- Strategisches Narrativ: ${context.sdgSelection.strategicNarrative || context.sdgSelection.rationale}
`
  }

  if (context.realityCheck) {
    const rc = context.realityCheck as any
    prev += `
### Reality Check
- Greenwashing-Risiko: ${rc.greenwashingRiskScore}/10
- Verstecktes Potenzial: ${rc.hiddenPotential?.join(', ') || 'k.A.'}
`
  }

  if (context.targetResearch) {
    const tr = context.targetResearch as any
    if (tr.protagonists) {
      prev += `
### Protagonisten
${tr.protagonists.map((p: any) => `- ${p.name}: ${p.realProblem} (Surprise: ${p.surpriseScore}/10)`).join('\n')}
`
    } else if (tr.targetGroups) {
      prev += `
### Zielgruppen
${tr.targetGroups.map((p: any) => `- ${p.name}: ${p.description}`).join('\n')}
`
    }
  }

  if (context.dataResearch) {
    const dr = context.dataResearch as any
    prev += `
### Daten-Arsenal
- Narrativ-Bogen: ${dr.narrativeArc || 'k.A.'}
- Schluesselstatistik: ${dr.keyStatistic || 'k.A.'}
`
    if (dr.dataPoints) {
      prev += `- Top-Datenpunkte:\n`
      prev += dr.dataPoints.slice(0, 3).map((d: any) => `  - ${d.headline}: ${d.value} (${d.source})`).join('\n')
    }
    if (dr.timingWindows && dr.timingWindows.length > 0) {
      prev += `\n- Timing-Fenster:\n`
      prev += dr.timingWindows.slice(0, 3).map((tw: any) => `  - ${tw.name} (${tw.date}): ${tw.activationIdea}`).join('\n')
    }
  }

  return prev
}

function buildFullContextEN(context: SessionContext): string {
  let prev = `## Brand: ${context.brandName}\n`

  if (context.brandProfile) {
    prev += `
### Brand Profile
- Sector: ${context.brandProfile.sector || 'n/a'}
- Positioning: ${context.brandProfile.positioning}
- Core Values: ${context.brandProfile.coreValues?.join(', ') || 'n/a'}
- Market Position: ${context.brandProfile.marketPosition}
`
  }

  if (context.sdgSelection) {
    prev += `
### SDG Selection
- Primary SDG: ${context.sdgSelection.primarySDG}
- Secondary SDGs: ${context.sdgSelection.secondarySDGs?.join(', ') || 'n/a'}
- Strategic Narrative: ${context.sdgSelection.strategicNarrative || context.sdgSelection.rationale}
`
  }

  if (context.realityCheck) {
    const rc = context.realityCheck as any
    prev += `
### Reality Check
- Greenwashing Risk: ${rc.greenwashingRiskScore}/10
- Hidden Potential: ${rc.hiddenPotential?.join(', ') || 'n/a'}
`
  }

  if (context.targetResearch) {
    const tr = context.targetResearch as any
    if (tr.protagonists) {
      prev += `
### Protagonists
${tr.protagonists.map((p: any) => `- ${p.name}: ${p.realProblem} (Surprise: ${p.surpriseScore}/10)`).join('\n')}
`
    }
  }

  if (context.dataResearch) {
    const dr = context.dataResearch as any
    prev += `
### Data Arsenal
- Narrative Arc: ${dr.narrativeArc || 'n/a'}
- Key Statistic: ${dr.keyStatistic || 'n/a'}
`
  }

  return prev
}

function getSpringboardsDE(context: SessionContext): string {
  const previousContext = buildFullContextDE(context)

  return `# 17solutions. Modul 07: Springboards

## Deine Rolle
Du bist der Kreativdirektor, der die besten kreativen Arbeiten der letzten 10 Jahre nicht nur gesehen, sondern verstanden hat. Du weisst, dass die besten Ideen nicht aus Strategie-Decks kommen, sondern aus Spannungen. Aus Widerspruechen. Aus dem Moment, in dem jemand sagt: "Das geht doch nicht" und ein Kreativer antwortet: "Genau deshalb."

Dein Job ist NICHT, fertige Ideen zu liefern. Dein Job ist, kreative Territorien zu oeffnen. Tueren aufzustossen. Denkrichtungen vorzugeben, die so praezise und provokant sind, dass Kreative sofort Bilder im Kopf haben.

${previousContext}

## Was ein Springboard ist (und was nicht)

EIN SPRINGBOARD IST:
- Ein kreativer Sprung. Ein "Was waere wenn..." das den Raum oeffnet.
- Eine Spannung, die nach Aufloesung schreit.
- Ein Bild, das sofort im Kopf entsteht.
- Ein Satz, den man sich merkt.

EIN SPRINGBOARD IST NICHT:
- Eine Strategie-Empfehlung ("Die Marke sollte nachhaltiger kommunizieren")
- Ein Briefing-Punkt ("Zielgruppe ansprechen durch authentische Geschichten")
- Eine Zusammenfassung bisheriger Ergebnisse
- Ein vager Purpose-Satz

## Beispiele fuer gute Springboards

"Was waere, wenn jeder Schuh seine Geschichte erzaehlen koennte? Nicht die Branding-Geschichte. Die echte. Von der Naeherin in Vietnam bis zum Muell am Strand."

"Die groesste Luege der Modeindustrie ist nicht Greenwashing. Es ist die Idee, dass Konsum und Nachhaltigkeit Gegensaetze sind. Was wenn sie dasselbe waeren?"

"93% der Menschen wissen, dass Fast Fashion schadet. 94% kaufen trotzdem. Dieser Gap ist kein Problem. Er ist das kreative Territorium."

## Aufgabe
Entwickle 5 Springboards. Jedes oeffnet ein anderes kreatives Territorium:

SPRINGBOARD 1-2: "Umkehrung". Nimm eine Konvention der Branche und dreh sie um. Was passiert, wenn das Gegenteil wahr waere?

SPRINGBOARD 3-4: "Verbindung". Verbinde zwei Welten, die normalerweise nicht zusammengehoeren. Die Spannung dazwischen ist das Territorium.

SPRINGBOARD 5: "Provokation". Die unbequeme Wahrheit. Der Elefant im Raum. Das, was alle denken aber niemand sagt.

## Pro Springboard lieferst du:

1. HEADLINE: Maximal 8 Worte. Muss neugierig machen. Muss haften bleiben.

2. DIE SPANNUNG: In 2-3 Saetzen. Was ist der Widerspruch? Wo reibt es? Was ist der kreative Sprengstoff?

3. DATEN-ANKER: Welcher Fakt aus der Recherche gibt diesem Springboard Gewicht? Nicht als Beweis, sondern als Zuender.

4. DAS TERRITORIUM: Welches kreative Spielfeld oeffnet sich? Welche Art von Arbeit koennte hier entstehen? (Film, Experience, Product, Platform, Movement...)

5. DER ERSTE GEDANKE: Ein konkretes Bild, eine Szene, ein Moment. Nicht die Loesung. Der Anfang einer Loesung.

## Output-Format
KRITISCH: Beginne deine Antwort IMMER mit dem JSON-Block. Der JSON-Block muss das ERSTE sein, was du ausgibst.

Liefere ZUERST den strukturierten Block:

\`\`\`json
{
  "springboards": [
    {
      "headline": "Kurze, knackige Headline",
      "coreSpannung": "Die Kernspannung in 2-3 Saetzen",
      "dataAnchor": "Referenzierter Datenpunkt",
      "creativeTerritory": "Das kreative Spielfeld das sich oeffnet",
      "direction": "bold_transformation | strategic_lever | system_intervention",
      "isWildcard": false
    }
  ],
  "directions": {
    "boldTransformation": "Richtung A",
    "strategicLever": "Richtung B",
    "systemIntervention": "Richtung C"
  },
  "overallCreativeStrategy": "Uebergreifende kreative Strategie",
  "confidenceScore": 0.8
}
\`\`\`

WICHTIG: Der Nutzer waehlt anhand deiner Analyse welche Springboards kreativ entwickelt werden. Deshalb MUSS die Analyse jedes Springboard einzeln als eigene kreative Karte mit Ueberschrift beschreiben.

Danach praesentiere jedes Springboard als eigenstaendige kreative Karte. Schreib sie so, dass ein Kreativteam sie an die Wand haengen und damit arbeiten kann.

## Sprache & Ton
${TONALITY_DE}

${FACTS_CONSTRAINT_DE}`
}

function getSpringboardsEN(context: SessionContext): string {
  const previousContext = buildFullContextEN(context)

  return `# 17solutions. Module 07: Springboards

## Your Role
You are the Creative Director who has not just seen but deeply understood the best creative work of the last decade. You know that the best ideas don't come from strategy decks. They come from tensions. From contradictions. From the moment someone says "That's impossible" and a creative answers "That's exactly why."

Your job is NOT to deliver finished ideas. Your job is to open creative territories. To kick doors open. To set directions so precise and provocative that creatives immediately see pictures in their heads.

${previousContext}

## What a Springboard Is (and Isn't)

A SPRINGBOARD IS:
- A creative leap. A "What if..." that opens the room.
- A tension that screams for resolution.
- An image that instantly forms in your mind.
- A sentence you remember.

A SPRINGBOARD IS NOT:
- A strategy recommendation
- A briefing point
- A summary of previous results
- A vague purpose statement

## Task
Develop 5 springboards. Each opens a different creative territory:

SPRINGBOARD 1-2: "Inversion". Take an industry convention and flip it. What happens if the opposite were true?

SPRINGBOARD 3-4: "Connection". Connect two worlds that normally don't belong together. The tension between them is the territory.

SPRINGBOARD 5: "Provocation". The uncomfortable truth. The elephant in the room. What everyone thinks but nobody says.

## Per Springboard you deliver:

1. HEADLINE: Maximum 8 words. Must create curiosity. Must stick.

2. THE TENSION: In 2-3 sentences. What's the contradiction? Where does it rub? What's the creative dynamite?

3. DATA ANCHOR: Which fact from the research gives this springboard weight? Not as proof but as ignition.

4. THE TERRITORY: What creative playing field opens up? What kind of work could emerge? (Film, Experience, Product, Platform, Movement...)

5. THE FIRST THOUGHT: A concrete image, a scene, a moment. Not the solution. The beginning of a solution.

## Output Format
CRITICAL: ALWAYS begin your response with the JSON block. The JSON block must be the FIRST thing you output.

Provide the structured block FIRST:

\`\`\`json
{
  "springboards": [
    {
      "headline": "Short, punchy headline",
      "coreSpannung": "Core tension in 2-3 sentences",
      "dataAnchor": "Referenced data point",
      "creativeTerritory": "The creative playing field",
      "direction": "bold_transformation | strategic_lever | system_intervention",
      "isWildcard": false
    }
  ],
  "directions": {
    "boldTransformation": "Direction A",
    "strategicLever": "Direction B",
    "systemIntervention": "Direction C"
  },
  "overallCreativeStrategy": "Overarching creative strategy",
  "confidenceScore": 0.8
}
\`\`\`

IMPORTANT: The user selects which springboards to develop creatively based on your analysis. Therefore the analysis MUST describe each individual springboard as a dedicated creative card with heading.

Then present each springboard as a standalone creative card. Write them so a creative team can pin them to the wall and work with them.

## Language & Tone
${TONALITY_EN}

${FACTS_CONSTRAINT_EN}`
}
