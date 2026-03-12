// 17solutions — Global Types

export type Language = 'de' | 'en'
export type UserRole = 'admin' | 'user'
export type UserStatus = 'active' | 'invited' | 'suspended'
export type SessionStatus = 'active' | 'completed' | 'archived'
export type SessionMode = 'creative' | 'inspiration'
export type MessageRole = 'user' | 'assistant' | 'system'
export type ConfidenceLevel = 'VERIFIZIERT' | 'PLAUSIBEL' | 'HYPOTHESE'
export type SourceType = 'API' | 'DOC' | 'DB' | 'WEB' | 'KI' | 'MIX'

export type ClusterName = 'verstehen' | 'validieren' | 'create' | 'bewerten'

export interface ModuleDefinition {
  id: string
  name: string
  nameDE: string
  cluster: ClusterName
  stepNum: number
  status: 'available' | 'coming_soon'
}

export const MODULES: ModuleDefinition[] = [
  // VERSTEHEN
  { id: 'verstehen_01', name: 'Brand Entry', nameDE: 'Marken-Einstieg', cluster: 'verstehen', stepNum: 1, status: 'available' },
  { id: 'verstehen_01b', name: 'Document Intake', nameDE: 'Dokumenten-Aufnahme', cluster: 'verstehen', stepNum: 2, status: 'coming_soon' },
  { id: 'verstehen_02', name: 'SDG Mapping', nameDE: 'SDG-Zuordnung', cluster: 'verstehen', stepNum: 3, status: 'available' },
  { id: 'validieren_04', name: 'Reality Check', nameDE: 'Realitäts-Check', cluster: 'validieren', stepNum: 4, status: 'available' },
  { id: 'verstehen_03', name: 'SDG Selection', nameDE: 'SDG-Auswahl', cluster: 'verstehen', stepNum: 5, status: 'available' },
  // VALIDIEREN
  { id: 'validieren_05', name: 'Protagonist Search', nameDE: 'Protagonisten-Search', cluster: 'validieren', stepNum: 6, status: 'available' },
  // CREATE
  { id: 'create_07', name: 'Springboards', nameDE: 'Sprungbretter', cluster: 'create', stepNum: 7, status: 'available' },
  { id: 'create_09', name: 'Idea Development', nameDE: 'Ideen-Entwicklung', cluster: 'create', stepNum: 8, status: 'available' },
  { id: 'create_08', name: 'Partnerships', nameDE: 'Partnerschaften', cluster: 'create', stepNum: 9, status: 'available' },
  { id: 'create_08b', name: 'Audience Design', nameDE: 'Zielpublikum', cluster: 'create', stepNum: 10, status: 'available' },
  { id: 'create_08c', name: 'Market Scope', nameDE: 'Markt-Definition', cluster: 'create', stepNum: 11, status: 'available' },
  { id: 'validieren_06', name: 'Events/Timing', nameDE: 'Ereignisse', cluster: 'validieren', stepNum: 12, status: 'available' },
  // BEWERTEN
  { id: 'bewerten_11', name: 'ROI Estimation', nameDE: 'ROI-Schätzung', cluster: 'bewerten', stepNum: 13, status: 'available' },
  { id: 'bewerten_12', name: 'Case Board', nameDE: 'Case Board', cluster: 'bewerten', stepNum: 14, status: 'available' },
  { id: 'bewerten_13', name: 'Executive Summary', nameDE: 'Executive Summary', cluster: 'bewerten', stepNum: 15, status: 'available' },
]

export const CLUSTERS = [
  { id: 'verstehen' as ClusterName, name: 'VERSTEHEN', nameDE: 'VERSTEHEN', color: '#4a9e8e', modules: MODULES.filter(m => m.cluster === 'verstehen') },
  { id: 'validieren' as ClusterName, name: 'VALIDIEREN', nameDE: 'VALIDIEREN', color: '#5b8ec9', modules: MODULES.filter(m => m.cluster === 'validieren') },
  { id: 'create' as ClusterName, name: 'CREATE', nameDE: 'CREATE', color: '#e87461', modules: MODULES.filter(m => m.cluster === 'create') },
  { id: 'bewerten' as ClusterName, name: 'BEWERTEN', nameDE: 'BEWERTEN', color: '#c4a44a', modules: MODULES.filter(m => m.cluster === 'bewerten') },
]
