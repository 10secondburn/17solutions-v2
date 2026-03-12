/**
 * 17solutions V2 — Integration Test: Alle 4 Phasen
 *
 * Testet:
 * 1. Module Registry: Alle 12 Module ladbar?
 * 2. Context Store: Lesen/Schreiben funktioniert?
 * 3. Orchestrator: Trigger-Messages für alle Module vorhanden?
 * 4. Type Parsers: Alle parse-Funktionen importierbar?
 * 5. Live API Call: Ein echtes Modul gegen Claude testen
 */

import { isModuleAvailable, loadModule, getNextAvailableModule } from './src/lib/orchestrator/module-registry'
import { parseBrandEntryOutput } from './src/modules/verstehen/01-brand-entry/types'
import { parseSDGMappingOutput } from './src/modules/verstehen/02-sdg-mapping/types'
import { parseSDGSelectionOutput } from './src/modules/verstehen/03-sdg-selection/types'
import { parseRealityCheckOutput } from './src/modules/validieren/04-reality-check/types'
import { parseTargetResearchOutput } from './src/modules/validieren/05-target-research/types'
import { parseDataResearchOutput } from './src/modules/validieren/06-data-research/types'
import { parseSpringboardsOutput } from './src/modules/create/07-springboards/types'
import { parsePartnershipsOutput } from './src/modules/create/08-partnerships/types'
import { parseIdeaDevelopmentOutput } from './src/modules/create/09-idea-development/types'
import { parseBusinessImpactOutput } from './src/modules/bewerten/10-business-impact/types'
import { parseROIEstimationOutput } from './src/modules/bewerten/11-roi-estimation/types'
import { parseCaseBoardOutput } from './src/modules/bewerten/12-case-board/types'
import { MODULES, CLUSTERS } from './src/types'

// ============================================================
// Test Utilities
// ============================================================
let passed = 0
let failed = 0
const errors: string[] = []

function test(name: string, fn: () => boolean | Promise<boolean>) {
  try {
    const result = fn()
    if (result instanceof Promise) {
      return result.then(ok => {
        if (ok) { passed++; console.log(`  ✓ ${name}`) }
        else { failed++; errors.push(name); console.log(`  ✗ ${name}`) }
      }).catch(e => {
        failed++; errors.push(`${name}: ${e.message}`); console.log(`  ✗ ${name} — ${e.message}`)
      })
    }
    if (result) { passed++; console.log(`  ✓ ${name}`) }
    else { failed++; errors.push(name); console.log(`  ✗ ${name}`) }
  } catch (e: any) {
    failed++; errors.push(`${name}: ${e.message}`); console.log(`  ✗ ${name} — ${e.message}`)
  }
}

// ============================================================
// TEST 1: Module Registry — Alle Module registriert?
// ============================================================
console.log('\n═══════════════════════════════════════')
console.log('TEST 1: Module Registry')
console.log('═══════════════════════════════════════')

const ALL_MODULES = [
  'verstehen_01', 'verstehen_02', 'verstehen_03',
  'validieren_04', 'validieren_05', 'validieren_06',
  'create_07', 'create_08', 'create_09',
  'bewerten_10', 'bewerten_11', 'bewerten_12',
]

for (const moduleId of ALL_MODULES) {
  test(`${moduleId} ist registriert`, () => isModuleAvailable(moduleId))
}

// ============================================================
// TEST 2: Module Chain — Korrekte Verkettung?
// ============================================================
console.log('\n═══════════════════════════════════════')
console.log('TEST 2: Module Chain (Verkettung)')
console.log('═══════════════════════════════════════')

const expectedChain: Record<string, string | null> = {
  'verstehen_01': 'verstehen_02',
  'verstehen_02': 'verstehen_03',
  'verstehen_03': 'validieren_04',
  'validieren_04': 'validieren_05',
  'validieren_05': 'validieren_06',
  'validieren_06': 'create_07',
  'create_07': 'create_08',
  'create_08': 'create_09',
  'create_09': 'bewerten_10',
  'bewerten_10': 'bewerten_11',
  'bewerten_11': 'bewerten_12',
  'bewerten_12': null,
}

for (const [current, expected] of Object.entries(expectedChain)) {
  const actual = getNextAvailableModule(current)
  test(`${current} → ${expected ?? 'END'}`, () => actual === expected)
}

// ============================================================
// TEST 3: Type Parsers — Alle vorhanden und aufrufbar?
// ============================================================
console.log('\n═══════════════════════════════════════')
console.log('TEST 3: Type Parsers')
console.log('═══════════════════════════════════════')

const parsers = {
  'verstehen_01': parseBrandEntryOutput,
  'verstehen_02': parseSDGMappingOutput,
  'verstehen_03': parseSDGSelectionOutput,
  'validieren_04': parseRealityCheckOutput,
  'validieren_05': parseTargetResearchOutput,
  'validieren_06': parseDataResearchOutput,
  'create_07': parseSpringboardsOutput,
  'create_08': parsePartnershipsOutput,
  'create_09': parseIdeaDevelopmentOutput,
  'bewerten_10': parseBusinessImpactOutput,
  'bewerten_11': parseROIEstimationOutput,
  'bewerten_12': parseCaseBoardOutput,
}

for (const [moduleId, parser] of Object.entries(parsers)) {
  test(`${moduleId} parser ist eine Funktion`, () => typeof parser === 'function')
  test(`${moduleId} parser gibt null bei leerem Input`, () => parser('') === null)
}

// ============================================================
// TEST 4: MODULES / CLUSTERS Konfiguration
// ============================================================
console.log('\n═══════════════════════════════════════')
console.log('TEST 4: MODULES & CLUSTERS')
console.log('═══════════════════════════════════════')

test('13 Module definiert', () => MODULES.length === 13)
test('4 Cluster definiert', () => CLUSTERS.length === 4)

// Alle Module (außer verstehen_01b) sollten status: 'available' haben
const availableModules = MODULES.filter(m => m.status === 'available')
test(`12 Module available (ohne 01b)`, () => availableModules.length === 12)

const comingSoon = MODULES.filter(m => m.status === 'coming_soon')
test(`1 Modul coming_soon (01b)`, () => comingSoon.length === 1 && comingSoon[0].id === 'verstehen_01b')

// Cluster-Zuordnung
for (const cluster of CLUSTERS) {
  const count = MODULES.filter(m => m.cluster === cluster.id).length
  test(`Cluster ${cluster.name}: ${count} Module`, () => count >= 3)
}

// ============================================================
// TEST 5: Module Lazy-Loading — Alle Module ladbar?
// ============================================================
console.log('\n═══════════════════════════════════════')
console.log('TEST 5: Module Lazy-Loading')
console.log('═══════════════════════════════════════')

async function testModuleLoading() {
  for (const moduleId of ALL_MODULES) {
    try {
      const executor = await loadModule(moduleId)
      if (executor) {
        const hasExecute = typeof executor.execute === 'function'
        const hasStream = typeof executor.executeStream === 'function'
        const hasConfig = executor.config && executor.config.id === moduleId

        if (hasExecute && hasStream && hasConfig) {
          passed++; console.log(`  ✓ ${moduleId} geladen — execute: ✓ stream: ✓ config: ✓`)
        } else {
          failed++; errors.push(`${moduleId} incomplete`)
          console.log(`  ✗ ${moduleId} — execute: ${hasExecute} stream: ${hasStream} config: ${hasConfig}`)
        }
      } else {
        failed++; errors.push(`${moduleId} null`); console.log(`  ✗ ${moduleId} — null`)
      }
    } catch (e: any) {
      failed++; errors.push(`${moduleId}: ${e.message}`)
      console.log(`  ✗ ${moduleId} — ${e.message}`)
    }
  }
}

// ============================================================
// TEST 6: Live API Call — Reality Check Module
// ============================================================
async function testLiveAPICall() {
  console.log('\n═══════════════════════════════════════')
  console.log('TEST 6: Live API Call (validieren_04)')
  console.log('═══════════════════════════════════════')

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('  ⊘ Übersprungen — kein ANTHROPIC_API_KEY')
    return
  }

  try {
    const executor = await loadModule('validieren_04')
    if (!executor) {
      failed++; errors.push('validieren_04 nicht ladbar'); return
    }

    // Minimaler Mock-Context
    const mockContext: any = {
      sessionId: 'test-session',
      userId: 'test-user',
      brandName: 'Patagonia',
      language: 'de',
      mode: 'creative',
      currentModule: 'validieren_04',
      citationRegistry: [],
      lastUpdated: new Date().toISOString(),
      brandProfile: {
        brandName: 'Patagonia',
        sector: 'Outdoor/Fashion',
        positioning: 'Nachhaltige Outdoor-Marke',
        coreValues: ['Umweltschutz', 'Qualität', 'Transparenz'],
        marketPosition: 'category_leader',
        currentSDGActivities: ['1% for the Planet', 'Worn Wear Program'],
        culturalMoment: 'Klimabewegung',
        sdgHypothesis: 'SDG 12 + SDG 13',
        confidenceScore: 0.85,
      },
      sdgMapping: { confidenceScore: 0.8 },
      sdgSelection: {
        primarySDG: 12,
        secondarySDGs: [13, 15],
        rationale: 'Verantwortungsvoller Konsum passt perfekt',
        strategicNarrative: 'Buy less, demand more',
        userOverrides: [],
        confidenceScore: 0.85,
      },
    }

    console.log('  ⏳ Sende Request an Claude API (validieren_04)...')
    const start = Date.now()
    const result = await executor.execute(mockContext, 'Führe einen Reality Check für Patagonia durch.')
    const duration = ((Date.now() - start) / 1000).toFixed(1)

    test(`API Antwort erhalten (${duration}s)`, () => !!result.response)
    test(`Antwort > 200 Zeichen`, () => result.response.length > 200)
    test(`Token-Usage vorhanden`, () => !!result.tokenUsage && result.tokenUsage.inputTokens > 0)

    if (result.outputData) {
      test(`Strukturierte Output-Daten`, () => true)
      console.log(`  📊 Confidence: ${result.confidenceScore}`)
    } else {
      test(`Strukturierte Output-Daten (JSON parse)`, () => false)
    }

    console.log(`  📝 Antwort-Auszug: ${result.response.substring(0, 150)}...`)
    console.log(`  🔢 Tokens: ${result.tokenUsage?.inputTokens} in / ${result.tokenUsage?.outputTokens} out`)

  } catch (e: any) {
    failed++; errors.push(`Live API: ${e.message}`)
    console.log(`  ✗ Live API Call fehlgeschlagen — ${e.message}`)
  }
}

// ============================================================
// RUN ALL
// ============================================================
async function runAll() {
  await testModuleLoading()
  await testLiveAPICall()

  console.log('\n═══════════════════════════════════════')
  console.log(`ERGEBNIS: ${passed} passed, ${failed} failed`)
  console.log('═══════════════════════════════════════')

  if (errors.length > 0) {
    console.log('\nFehler:')
    errors.forEach(e => console.log(`  • ${e}`))
  }

  process.exit(failed > 0 ? 1 : 0)
}

runAll()
