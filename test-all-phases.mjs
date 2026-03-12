/**
 * 17solutions V2 — Integration Test: Alle 4 Phasen
 * Standalone Node.js test (kein Next.js/TypeScript nötig)
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import Anthropic from '@anthropic-ai/sdk'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')

let passed = 0
let failed = 0
const errors = []

function test(name, condition) {
  if (condition) { passed++; console.log(`  ✓ ${name}`) }
  else { failed++; errors.push(name); console.log(`  ✗ ${name}`) }
}

// ============================================================
// TEST 1: Alle Modul-Dateien existieren
// ============================================================
console.log('\n═══════════════════════════════════════')
console.log('TEST 1: Modul-Dateien vorhanden')
console.log('═══════════════════════════════════════')

const moduleFiles = {
  // VERSTEHEN
  'verstehen/01-brand-entry': ['agent.ts', 'prompts.ts', 'types.ts'],
  'verstehen/02-sdg-mapping': ['agent.ts', 'prompts.ts', 'types.ts'],
  'verstehen/03-sdg-selection': ['agent.ts', 'prompts.ts', 'types.ts'],
  // VALIDIEREN
  'validieren/04-reality-check': ['agent.ts', 'prompts.ts', 'types.ts'],
  'validieren/05-target-research': ['agent.ts', 'prompts.ts', 'types.ts'],
  'validieren/06-data-research': ['agent.ts', 'prompts.ts', 'types.ts'],
  // CREATE
  'create/07-springboards': ['agent.ts', 'prompts.ts', 'types.ts'],
  'create/08-partnerships': ['agent.ts', 'prompts.ts', 'types.ts'],
  'create/09-idea-development': ['agent.ts', 'prompts.ts', 'types.ts'],
  // BEWERTEN
  'bewerten/10-business-impact': ['agent.ts', 'prompts.ts', 'types.ts'],
  'bewerten/11-roi-estimation': ['agent.ts', 'prompts.ts', 'types.ts'],
  'bewerten/12-case-board': ['agent.ts', 'prompts.ts', 'types.ts'],
}

for (const [modulePath, files] of Object.entries(moduleFiles)) {
  for (const file of files) {
    const fullPath = join(SRC, 'modules', modulePath, file)
    test(`${modulePath}/${file}`, existsSync(fullPath))
  }
}

// ============================================================
// TEST 2: Module Registry — Alle Module registriert
// ============================================================
console.log('\n═══════════════════════════════════════')
console.log('TEST 2: Module Registry')
console.log('═══════════════════════════════════════')

const registrySource = readFileSync(join(SRC, 'lib/orchestrator/module-registry.ts'), 'utf-8')

const ALL_MODULE_IDS = [
  'verstehen_01', 'verstehen_02', 'verstehen_03',
  'validieren_04', 'validieren_05', 'validieren_06',
  'create_07', 'create_08', 'create_09',
  'bewerten_10', 'bewerten_11', 'bewerten_12',
]

for (const moduleId of ALL_MODULE_IDS) {
  test(`${moduleId} in Registry`, registrySource.includes(`'${moduleId}'`))
}

// ============================================================
// TEST 3: Module Chain — Verkettung prüfen
// ============================================================
console.log('\n═══════════════════════════════════════')
console.log('TEST 3: Module Chain')
console.log('═══════════════════════════════════════')

// Prüfe nextModuleId in jedem Agent
const expectedChain = {
  'verstehen/01-brand-entry': 'verstehen_02',
  'verstehen/02-sdg-mapping': 'verstehen_03',
  'verstehen/03-sdg-selection': 'validieren_04',
  'validieren/04-reality-check': 'validieren_05',
  'validieren/05-target-research': 'validieren_06',
  'validieren/06-data-research': 'create_07',
  'create/07-springboards': 'create_08',
  'create/08-partnerships': 'create_09',
  'create/09-idea-development': 'bewerten_10',
  'bewerten/10-business-impact': 'bewerten_11',
  'bewerten/11-roi-estimation': 'bewerten_12',
  'bewerten/12-case-board': 'null', // Letztes Modul
}

for (const [modulePath, expectedNext] of Object.entries(expectedChain)) {
  const agentSource = readFileSync(join(SRC, 'modules', modulePath, 'agent.ts'), 'utf-8')
  const hasNext = expectedNext === 'null'
    ? agentSource.includes('nextModuleId: null')
    : agentSource.includes(`nextModuleId: '${expectedNext}'`)
  test(`${modulePath} → ${expectedNext}`, hasNext)
}

// ============================================================
// TEST 4: Orchestrator — Trigger Messages & Parser Cases
// ============================================================
console.log('\n═══════════════════════════════════════')
console.log('TEST 4: Orchestrator Integration')
console.log('═══════════════════════════════════════')

const orchestratorSource = readFileSync(join(SRC, 'lib/orchestrator/orchestrator.ts'), 'utf-8')

// Trigger Messages für alle Module (außer verstehen_01 — Einstieg)
const triggerModules = ALL_MODULE_IDS.filter(id => id !== 'verstehen_01')
for (const moduleId of triggerModules) {
  test(`Trigger für ${moduleId}`, orchestratorSource.includes(`'${moduleId}':`))
}

// Parser-Switch-Cases
for (const moduleId of ALL_MODULE_IDS) {
  test(`Parser-Case für ${moduleId}`, orchestratorSource.includes(`case '${moduleId}'`))
}

// Parser-Imports
const parseImports = [
  'parseRealityCheckOutput', 'parseTargetResearchOutput', 'parseDataResearchOutput',
  'parseSpringboardsOutput', 'parsePartnershipsOutput', 'parseIdeaDevelopmentOutput',
  'parseBusinessImpactOutput', 'parseROIEstimationOutput', 'parseCaseBoardOutput',
]
for (const imp of parseImports) {
  test(`Import ${imp}`, orchestratorSource.includes(imp))
}

// ============================================================
// TEST 5: Context Store — Alle Module gemappt
// ============================================================
console.log('\n═══════════════════════════════════════')
console.log('TEST 5: Context Store')
console.log('═══════════════════════════════════════')

const storeSource = readFileSync(join(SRC, 'lib/context-store/store.ts'), 'utf-8')

for (const moduleId of ALL_MODULE_IDS) {
  test(`Store case für ${moduleId}`, storeSource.includes(`case '${moduleId}'`))
}

// Context-Store Felder
const contextTypeSource = readFileSync(join(SRC, 'lib/context-store/types.ts'), 'utf-8')
const contextFields = [
  'brandProfile', 'sdgMapping', 'sdgSelection',
  'realityCheck', 'targetResearch', 'dataResearch',
  'springboards', 'partnerships', 'ideaDevelopment',
  'businessImpact', 'roiEstimation', 'caseBoard',
]
for (const field of contextFields) {
  test(`SessionContext.${field}`, contextTypeSource.includes(field))
}

// ============================================================
// TEST 6: Types/Index — Module Status
// ============================================================
console.log('\n═══════════════════════════════════════')
console.log('TEST 6: Module Status')
console.log('═══════════════════════════════════════')

const typesSource = readFileSync(join(SRC, 'types/index.ts'), 'utf-8')

// Zähle available vs coming_soon
const availableCount = (typesSource.match(/status: 'available'/g) || []).length
const comingSoonCount = (typesSource.match(/status: 'coming_soon'/g) || []).length

test(`12 Module available`, availableCount === 12)
test(`1 Modul coming_soon (01b)`, comingSoonCount === 1)

// Prüfe Cluster-Farben
test(`Cluster VERSTEHEN hat Farbe`, typesSource.includes('#4a9e8e'))
test(`Cluster VALIDIEREN hat Farbe`, typesSource.includes('#5b8ec9'))
test(`Cluster CREATE hat Farbe`, typesSource.includes('#e87461'))
test(`Cluster BEWERTEN hat Farbe`, typesSource.includes('#c4a44a'))

// ============================================================
// TEST 7: Prompt-Qualität — Alle Prompts haben System Prompt
// ============================================================
console.log('\n═══════════════════════════════════════')
console.log('TEST 7: Prompt-Qualität')
console.log('═══════════════════════════════════════')

for (const modulePath of Object.keys(moduleFiles)) {
  const promptPath = join(SRC, 'modules', modulePath, 'prompts.ts')
  const promptSource = readFileSync(promptPath, 'utf-8')

  // Jeder Prompt sollte eine getXXXSystemPrompt Funktion exportieren
  const hasExport = promptSource.includes('export function get') || promptSource.includes('export const get')
  test(`${modulePath}/prompts.ts hat Export`, hasExport)

  // Prüfe ob brandName/context referenziert wird
  const usesContext = promptSource.includes('context') || promptSource.includes('brandName')
  test(`${modulePath}/prompts.ts nutzt Context`, usesContext)

  // Prüfe ob zweisprachig (de/en)
  const isBilingual = promptSource.includes('language') || promptSource.includes("'de'") || promptSource.includes("'en'")
  test(`${modulePath}/prompts.ts ist zweisprachig`, isBilingual)
}

// ============================================================
// TEST 8: Agent-Konfigurationen — Temperature & Token-Limits
// ============================================================
console.log('\n═══════════════════════════════════════')
console.log('TEST 8: Agent-Konfigurationen')
console.log('═══════════════════════════════════════')

const temperatureMap = {
  'validieren/04-reality-check': 0.6,   // Analytisch
  'validieren/05-target-research': 0.7,
  'validieren/06-data-research': 0.7,
  'create/07-springboards': 0.8,         // Kreativ
  'create/08-partnerships': 0.8,
  'create/09-idea-development': 0.8,
  'bewerten/10-business-impact': 0.5,    // Konservativ
  'bewerten/11-roi-estimation': 0.5,
  'bewerten/12-case-board': 0.6,
}

for (const [modulePath, expectedTemp] of Object.entries(temperatureMap)) {
  const agentSource = readFileSync(join(SRC, 'modules', modulePath, 'agent.ts'), 'utf-8')
  test(`${modulePath} temperature: ${expectedTemp}`, agentSource.includes(`temperature: ${expectedTemp}`))
}

// ============================================================
// TEST 9: Live API Call — Reality Check (validieren_04)
// ============================================================
console.log('\n═══════════════════════════════════════')
console.log('TEST 9: Live API Call (validieren_04)')
console.log('═══════════════════════════════════════')

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  // Versuche aus .env.local zu laden
  try {
    const envContent = readFileSync(join(ROOT, '.env.local'), 'utf-8')
    const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/)
    if (match) process.env.ANTHROPIC_API_KEY = match[1].trim()
  } catch {}
}

if (process.env.ANTHROPIC_API_KEY) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Lese den Reality Check Prompt
    const promptSource = readFileSync(join(SRC, 'modules/validieren/04-reality-check/prompts.ts'), 'utf-8')

    // Extrahiere den deutschen Prompt-Text (vereinfacht)
    const systemPrompt = `Du bist ein investigativer Analyst bei 17solutions. Führe einen Reality Check für die Marke Patagonia durch.

Bekannter Kontext:
- Marke: Patagonia
- Sektor: Outdoor/Fashion
- Primäres SDG: SDG 12 (Verantwortungsvoller Konsum)
- Sekundäre SDGs: SDG 13 (Klimaschutz), SDG 15 (Leben an Land)
- Aktuelle Aktivitäten: 1% for the Planet, Worn Wear Program
- Strategisches Narrativ: "Buy less, demand more"

Prüfe alle Nachhaltigkeitsbehauptungen und gib dein Ergebnis als JSON aus.

Antworte mit einem JSON-Block in folgendem Format:
\`\`\`json
{
  "verifiedClaims": [...],
  "gaps": [...],
  "hiddenPotential": [...],
  "greenwashingRisk": 2,
  "overallAssessment": "...",
  "confidenceScore": 0.85
}
\`\`\``

    console.log('  ⏳ Sende Request an Claude API...')
    const start = Date.now()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.6,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Führe den Reality Check durch.' }],
    })

    const duration = ((Date.now() - start) / 1000).toFixed(1)
    const responseText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    test(`API Antwort erhalten (${duration}s)`, responseText.length > 100)
    test(`Tokens: ${response.usage.input_tokens}in/${response.usage.output_tokens}out`, true)

    // Versuche JSON zu parsen
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim())
        test('JSON strukturiert parsbar', true)
        test('verifiedClaims vorhanden', Array.isArray(parsed.verifiedClaims))
        test('gaps vorhanden', Array.isArray(parsed.gaps))
        test('greenwashingRisk vorhanden', typeof parsed.greenwashingRisk === 'number')
        test('confidenceScore vorhanden', typeof parsed.confidenceScore === 'number')
        console.log(`  📊 Greenwashing-Risiko: ${parsed.greenwashingRisk}/10`)
        console.log(`  📊 Confidence: ${parsed.confidenceScore}`)
        console.log(`  📊 Verifizierte Claims: ${parsed.verifiedClaims?.length || 0}`)
        console.log(`  📊 Lücken: ${parsed.gaps?.length || 0}`)
      } catch (e) {
        test('JSON strukturiert parsbar', false)
      }
    } else {
      test('JSON-Block in Antwort', false)
    }

    // Zeige Auszug
    const cleanText = responseText.replace(/```json[\s\S]*?```/g, '[JSON]').trim()
    console.log(`  📝 ${cleanText.substring(0, 200)}...`)

  } catch (e) {
    failed++; errors.push(`API: ${e.message}`)
    console.log(`  ✗ API Call fehlgeschlagen — ${e.message}`)
  }
} else {
  console.log('  ⊘ Übersprungen — kein ANTHROPIC_API_KEY')
}

// ============================================================
// ERGEBNIS
// ============================================================
console.log('\n═══════════════════════════════════════')
console.log(`ERGEBNIS: ${passed} passed, ${failed} failed`)
console.log('═══════════════════════════════════════')

if (errors.length > 0) {
  console.log('\nFehler:')
  errors.forEach(e => console.log(`  • ${e}`))
}

process.exit(failed > 0 ? 1 : 0)
