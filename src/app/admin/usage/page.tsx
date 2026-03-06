'use client'

import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'

interface UserUsage {
  userId: string
  email: string
  name: string | null
  lastLoginAt: string | null
  sessionCount: number
  totalTokens: number
  totalCostUsd: number
  totalCalls: number
  cachedCalls: number
}

interface UsageTotals {
  totalTokens: number
  totalCostUsd: number
  totalCalls: number
  userCount: number
}

export default function AdminUsagePage() {
  const [users, setUsers] = useState<UserUsage[]>([])
  const [totals, setTotals] = useState<UsageTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  async function loadUsage() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)

      const res = await fetch(`/api/admin/usage?${params}`)
      if (res.status === 403) {
        setError('Zugriff verweigert — nur für Administratoren.')
        return
      }
      const data = await res.json()
      setUsers(data.users || [])
      setTotals(data.totals || null)
    } catch (e) {
      setError('Fehler beim Laden der Nutzungsdaten.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsage() }, [])

  function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
    return n.toString()
  }

  function formatCost(usd: number): string {
    const eur = usd * 0.92
    return `€${eur.toFixed(2)}`
  }

  function exportCSV() {
    const headers = ['Nutzer', 'E-Mail', 'Sessions', 'Tokens', 'Kosten (USD)', 'Kosten (EUR)', 'API-Calls', 'Cached', 'Letzter Login']
    const rows = users.map(u => [
      u.name || '-',
      u.email,
      u.sessionCount,
      u.totalTokens,
      Number(u.totalCostUsd).toFixed(4),
      (Number(u.totalCostUsd) * 0.92).toFixed(4),
      u.totalCalls,
      u.cachedCalls,
      u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('de-DE') : '-',
    ])

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `17solutions_usage_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (error) {
    return (
      <AppShell>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--accent-coral)', fontSize: 16 }}>{error}</p>
      </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Nutzung & Kosten</h1>
        <button
          onClick={exportCSV}
          style={{
            padding: '10px 20px', borderRadius: 10,
            background: 'var(--accent-teal)', color: 'white',
            fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
          }}
        >
          CSV exportieren
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center',
      }}>
        <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Von:</label>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 8,
            background: 'var(--bg-input)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', fontSize: 13,
          }}
        />
        <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Bis:</label>
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 8,
            background: 'var(--bg-input)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', fontSize: 13,
          }}
        />
        <button
          onClick={loadUsage}
          style={{
            padding: '8px 16px', borderRadius: 8,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer',
          }}
        >
          Filtern
        </button>
      </div>

      {/* Summary Cards */}
      {totals && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Nutzer', value: totals.userCount.toString(), color: 'var(--accent-teal)' },
            { label: 'Tokens gesamt', value: formatTokens(totals.totalTokens), color: 'var(--accent-coral)' },
            { label: 'Kosten (EUR)', value: formatCost(totals.totalCostUsd), color: 'var(--accent-gold)' },
            { label: 'API-Calls', value: totals.totalCalls.toString(), color: '#5b8ec9' },
          ].map(card => (
            <div key={card.label} style={{
              padding: '20px', borderRadius: 12,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{card.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Laden...</p>
      ) : (
        <div style={{
          borderRadius: 12, overflow: 'hidden',
          border: '1px solid var(--border)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-card)' }}>
                {['Nutzer', 'E-Mail', 'Sessions', 'Tokens', 'Kosten', 'API-Calls', 'Letzter Login'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontWeight: 600, color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.userId} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{u.name || '—'}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px' }}>{u.sessionCount}</td>
                  <td style={{ padding: '12px 16px' }}>{formatTokens(u.totalTokens)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--accent-gold)' }}>{formatCost(Number(u.totalCostUsd))}</td>
                  <td style={{ padding: '12px 16px' }}>{u.totalCalls}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('de-DE') : '—'}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Noch keine Nutzungsdaten vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </AppShell>
  )
}
