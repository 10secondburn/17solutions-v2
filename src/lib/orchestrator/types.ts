import type { ClusterName } from '@/types'
import type { SessionContext } from '@/lib/context-store/types'

export interface ModuleConfig {
  id: string
  name: string
  cluster: ClusterName
  stepNum: number
  nextModuleId: string | null
}

export interface ModuleExecutor {
  config: ModuleConfig
  execute: (context: SessionContext, userInput: string) => Promise<ModuleResult>
  /** Streaming-Variante — gibt Anthropic MessageStream zurück */
  executeStream?: (context: SessionContext, userInput: string) => Promise<any>
}

export interface ModuleResult {
  /** Streaming text response for chat */
  response: string
  /** Structured output to save in Context Store */
  outputData?: Record<string, unknown>
  /** Citations (mandatory for VERSTEHEN + VALIDIEREN) */
  citations?: Array<Record<string, unknown>>
  /** Confidence score 0-1 */
  confidenceScore?: number
  /** Token usage for billing */
  tokenUsage: {
    inputTokens: number
    outputTokens: number
    model: string
  }
  /** Should we auto-advance to next module? */
  shouldAdvance?: boolean
}

export interface OrchestratorRequest {
  sessionId: string
  userInput: string
  action?: 'message' | 'advance' | 'export'
}
