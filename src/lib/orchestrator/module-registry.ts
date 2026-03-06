import type { ModuleExecutor } from './types'

/**
 * Module Registry — Lazy-Loading aller Module
 * Neue Module hier registrieren.
 */
const registry: Record<string, () => Promise<ModuleExecutor>> = {
  'verstehen_01': async () => {
    const mod = await import('@/modules/verstehen/01-brand-entry/agent')
    return mod.brandEntryModule
  },
  // Phase 2+: weitere Module registrieren
  // 'verstehen_02': async () => { ... },
  // 'validieren_04': async () => { ... },
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
    'verstehen_01', 'verstehen_01b', 'verstehen_02', 'verstehen_03',
    'validieren_04', 'validieren_05', 'validieren_06',
    'create_07', 'create_08', 'create_09',
    'bewerten_10', 'bewerten_11', 'bewerten_12',
  ]

  const currentIndex = order.indexOf(currentModuleId)
  if (currentIndex === -1 || currentIndex === order.length - 1) return null

  // Finde das nächste verfügbare Modul
  for (let i = currentIndex + 1; i < order.length; i++) {
    if (isModuleAvailable(order[i])) return order[i]
  }

  return null
}
