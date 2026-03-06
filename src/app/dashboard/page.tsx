'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CLUSTERS } from '@/types'
import AppShell from '@/components/AppShell'

interface SessionItem {
  id: string
  brandName: string
  currentModule: string
  status: string
  updatedAt: string
}

const EXAMPLE_BRANDS = [
  { name: 'Nike', industry: 'Sportswear' },
  { name: 'MANN+HUMMEL', industry: 'Filtration' },
  { name: 'Siemens', industry: 'Technology' },
  { name: 'Patagonia', industry: 'Outdoor' },
]

export default function DashboardPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [brandName, setBrandName] = useState('')
  const [creating, setCreating] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(data => {
        setSessions(data)
        setLoadingSessions(false)
      })
      .catch(() => setLoadingSessions(false))
  }, [])

  async function startSession(name: string) {
    if (!name.trim() || creating) return
    setCreating(true)

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName: name.trim() }),
      })
      const session = await res.json()
      // Redirect — die Session-Page startet automatisch die Analyse
      router.push(`/session/${session.id}`)
    } catch {
      setCreating(false)
    }
  }

  function getClusterForModule(moduleId: string) {
    return CLUSTERS.find(c => c.modules.some(m => m.id === moduleId))
  }

  const hasSessions = sessions.length > 0

  return (
    <AppShell>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px' }}>

        {/* === Hero / Welcome === */}
        <div style={{ textAlign: 'center', marginBottom: hasSessions ? 48 : 56 }}>
          <h1 style={{
            fontSize: hasSessions ? 24 : 40,
            fontWeight: 300,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            marginBottom: hasSessions ? 8 : 20,
            transition: 'all 0.3s',
          }}>
            {hasSessions ? (
              <>Willkommen zurück</>
            ) : (
              <>Finde die <strong style={{ fontWeight: 700 }}>SDG-Innovation</strong><br />für deine Marke</>
            )}
          </h1>
          {!hasSessions && (
            <p style={{
              fontSize: 15,
              color: 'var(--text-secondary)',
              maxWidth: 480,
              margin: '0 auto',
              lineHeight: 1.7,
            }}>
              17solutions analysiert deine Marke und entwickelt nachhaltige Innovationsideen
              entlang der UN Sustainable Development Goals.
            </p>
          )}
        </div>

        {/* === Neue Session starten === */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: hasSessions ? '28px 32px' : '36px 40px',
          marginBottom: 40,
        }}>
          <div style={{
            fontSize: 17,
            fontWeight: 600,
            marginBottom: hasSessions ? 16 : 24,
            color: 'var(--text-primary)',
          }}>
            {hasSessions ? 'Neue Analyse starten' : 'Welche Marke möchtest du analysieren?'}
          </div>

          {/* Brand Input */}
          <div style={{ display: 'flex', gap: 12, marginBottom: !hasSessions ? 24 : 0 }}>
            <input
              type="text"
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              placeholder="Markenname eingeben…"
              onKeyDown={e => e.key === 'Enter' && startSession(brandName)}
              disabled={creating}
              style={{
                flex: 1,
                padding: '14px 18px',
                borderRadius: 12,
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: 15,
                outline: 'none',
              }}
            />
            <button
              onClick={() => startSession(brandName)}
              disabled={creating || !brandName.trim()}
              style={{
                padding: '14px 28px',
                borderRadius: 12,
                background: creating || !brandName.trim() ? 'var(--text-muted)' : 'var(--accent-coral)',
                color: 'white',
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                cursor: creating ? 'wait' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.2s',
              }}
            >
              {creating ? 'Starte…' : 'Analyse starten'}
            </button>
          </div>

          {/* Example Brand Cards — nur beim ersten Besuch */}
          {!hasSessions && (
            <>
              <div style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                marginBottom: 12,
              }}>
                Oder starte mit einem Beispiel:
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {EXAMPLE_BRANDS.map(b => (
                  <button
                    key={b.name}
                    onClick={() => startSession(b.name)}
                    disabled={creating}
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '14px 22px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                      minWidth: 120,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--accent-coral)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {b.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {b.industry}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* === Bisherige Projekte === */}
        {hasSessions && (
          <div>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 14,
            }}>
              Deine Projekte
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {sessions.map(s => {
                const cluster = getClusterForModule(s.currentModule)
                return (
                  <div
                    key={s.id}
                    onClick={() => router.push(`/session/${s.id}`)}
                    style={{
                      padding: '16px 20px',
                      borderRadius: 12,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-teal)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{s.brandName}</h3>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {cluster && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: cluster.color,
                            padding: '2px 8px', borderRadius: 4,
                            border: `1px solid ${cluster.color}`,
                          }}>
                            {cluster.name}
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(s.updatedAt).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>→</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loadingSessions && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Projekte laden…
          </div>
        )}
      </div>
    </AppShell>
  )
}
