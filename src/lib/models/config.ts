/**
 * Zentrale Model-Konfiguration für alle Module
 *
 * OPUS: Für Module die tiefes strategisches/kreatives Denken brauchen
 * SONNET: Für strukturierte Module mit klaren Aufgaben
 *
 * Über die Env-Variable FORCE_MODEL kann global ein Modell erzwungen werden.
 */

const OPUS = 'claude-opus-4-6'
const SONNET = 'claude-sonnet-4-20250514'

/**
 * Welches Modell für welches Modul?
 *
 * Opus-Module: Brauchen echtes Denken — Analyse, Kreation, Investigation
 * Sonnet-Module: Strukturierte Aufgaben, Daten-Aggregation, User-Interaktion
 */
const MODULE_MODELS: Record<string, string> = {
  // VERSTEHEN — strategische Analyse
  'verstehen_01': OPUS,    // Brand Entry: Multi-dimensionale Markenanalyse + Aktualitäts-Check
  'verstehen_02': OPUS,    // SDG Mapping: 17 SDGs strategisch bewerten
  'verstehen_03': SONNET,  // SDG Selection: User-Entscheidung, wenig eigene Denkarbeit

  // VALIDIEREN — investigative Tiefe
  'validieren_04': OPUS,   // Reality Check: Investigative Analyse, Anti-Halluzination kritisch
  'validieren_05': OPUS,   // Target Research: Protagonisten-Deep-Dive
  'validieren_06': SONNET, // Data Research: Strukturierte Datenrecherche

  // CREATE — kreatives Herzstück
  'create_07': SONNET,     // Springboards: Kreative Territorien, aber kürzerer Output
  'create_08': SONNET,     // Partnerships: Strukturierte Recherche
  'create_08b': SONNET,    // Audience Design: Zielgruppen-Profiling
  'create_08c': SONNET,    // Market Scope: Einfaches Input-Modul
  'create_09': OPUS,       // Idea Development: DAS kreative Kernmodul

  // BEWERTEN — Bewertung und Synthese
  'bewerten_11': SONNET,   // ROI Estimation + Business Impact: Zahlenbasiert
  'bewerten_12': OPUS,     // Case Board: Kampagnen-Synthese
  'bewerten_13': SONNET,   // Executive Summary: Aggregation
}

/**
 * Gibt das richtige Modell für ein Modul zurück.
 *
 * Priorität:
 * 1. Env FORCE_MODEL (überschreibt alles — zum Testen/Kosten sparen)
 * 2. MODULE_MODELS Konfiguration
 * 3. Fallback: SONNET
 */
export function getModelForModule(moduleId: string): string {
  // Env-Override: FORCE_MODEL=claude-sonnet-4-20250514 → alles auf Sonnet
  const forceModel = process.env.FORCE_MODEL
  if (forceModel) return forceModel

  return MODULE_MODELS[moduleId] || SONNET
}

export { OPUS, SONNET }
