/**
 * Token-Preise pro Modell (USD pro Token)
 * Stand: März 2026 — bei Preisänderungen hier aktualisieren
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': {
    input: 3.0 / 1_000_000,   // $3.00 pro 1M Input Tokens
    output: 15.0 / 1_000_000,  // $15.00 pro 1M Output Tokens
  },
  'claude-opus-4-6': {
    input: 15.0 / 1_000_000,  // $15.00 pro 1M Input Tokens
    output: 75.0 / 1_000_000,  // $75.00 pro 1M Output Tokens
  },
  'claude-haiku-4-5': {
    input: 0.80 / 1_000_000,
    output: 4.0 / 1_000_000,
  },
}

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-sonnet-4-20250514']
  return (inputTokens * pricing.input) + (outputTokens * pricing.output)
}

export function formatCostEUR(usd: number, exchangeRate = 0.92): string {
  const eur = usd * exchangeRate
  return `€${eur.toFixed(4)}`
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return tokens.toString()
}
