import type { ModuleExecutor } from './types'

/**
 * Module Registry — Lazy-Loading aller Module
 * Neue Module hier registrieren.
 */
const registry: Record<string, () => Promise<ModuleExecutor>> = {
  // VERSTEHEN (Phase 1)
  'verstehen_01': async () => {
    const mod = await import('@/modules/verstehen/01-brand-entry/agent')
    return mod.brandEntryModule
  },
  'verstehen_02': async () => {
    const mod = await import('@/modules/verstehen/02-sdg-mapping/agent')
    return mod.sdgMappingModule
  },
  'verstehen_03': async () => {
    const mod = await import('@/modules/verstehen/03-sdg-selection/agent')
    return mod.sdgSelectionModule
  },
  // VALIDIEREN (Phase 2)
  'validieren_04': async () => {
    const mod = await import('@/modules/validieren/04-reality-check/agent')
    return mod.realityCheckModule
  },
  'validieren_05': async () => {
    const mod = await import('@/modules/validieren/05-target-research/agent')
    return mod.targetResearchModule
  },
  'validieren_06': async () => {
    const mod = await import('@/modules/validieren/06-data-research/agent')
    return mod.dataResearchModule
  },
  // CREATE (Phase 3)
  'create_07': async () => {
    const mod = await import('@/modules/create/07-springboards/agent')
    return mod.springboardsModule
  },
  'create_08': async () => {
    const mod = await import('@/modules/create/08-partnerships/agent')
    return mod.partnershipsModule
  },
  'create_08b': async () => {
    const mod = await import('@/modules/create/08b-audience-design/agent')
    return mod.audienceDesignModule
  },
  'create_08c': async () => {
    const mod = await import('@/modules/create/08c-market-scope/agent')
    return mod.marketScopeModule
  },
  'create_09': async () => {
    const mod = await import('@/modules/create/09-idea-development/agent')
    return mod.ideaDevelopmentModule
  },
  // BEWERTEN (Phase 4)
  'bewerten_11': async () => {
    const mod = await import('@/modules/bewerten/11-roi-estimation/agent')
    return mod.roiEstimationModule
  },
  'bewerten_12': async () => {
    const mod = await import('@/modules/bewerten/12-case-board/agent')
    return mod.caseBoardModule
  },
  'bewerten_13': async () => {
    const mod = await import('@/modules/bewerten/13-executive-summary/agent')
    return mod.executiveSummaryModule
  },
}

export async function loadModule(moduleId: string): Promise<ModuleExecutor | null> {
  const loader = registry[moduleId]
  if (!loader) return null
  return loader()
}

export function isModuleAvailable(moduleId: string): boolean {
  return moduleId in registry
}

/**
 * Gibt die nächste verfügbare Modul-ID zurück.
 * Überspringt Module die noch nicht implementiert sind.
 */
export function getNextAvailableModule(currentModuleId: string): string | null {
  const order = [
    'verstehen_01', 'verstehen_02', 'verstehen_03', 'validieren_04',
    'validieren_05', 'create_07', 'create_09', 'create_08', 'create_08b', 'create_08c',
    'validieren_06', 'bewerten_11', 'bewerten_12', 'bewerten_13',
  ]

  const currentIndex = order.indexOf(currentModuleId)
  if (currentIndex === -1 || currentIndex === order.length - 1) return null

  // Finde das nächste verfügbare Modul
  for (let i = currentIndex + 1; i < order.length; i++) {
    if (isModuleAvailable(order[i])) return order[i]
  }

  return null
}
