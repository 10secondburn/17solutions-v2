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
  { name: 'Nike', desc: 'Sport & culture' },
  { name: 'IKEA', desc: 'Home & living' },
  { name: 'Siemens', desc: 'Tech & industry' },
  { name: 'Patagonia', desc: 'Outdoor & activism' },
  { name: 'Unilever', desc: 'FMCG & purpose' },
]

function LogoIcon({ size = 80 }: { size?: number }) {
  const cx = 50, cy = 50, outerR = 44, innerR = 26, pts = 17
  const d: string[] = []
  for (let i = 0; i < pts * 2; i++) {
    const a = (Math.PI * 2 * i) / (pts * 2) - Math.PI / 2
    const r = i % 2 === 0 ? outerR : innerR
    d.push(`${i === 0 ? 'M' : 'L'}${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  d.push('Z')
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e87461" /><stop offset="100%" stopColor="#d45a48" />
        </linearGradient>
        <filter id="gl"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <path d={d.join('')} fill="url(#lg)" filter="url(#gl)" />
      <text x="50" y="56" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff" fontFamily="Inter,system-ui,sans-serif">17</text>
    </svg>
  )
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [brandName, setBrandName] = useState('')
  const [creating, setCreating] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
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
      router.push(`/session/${session.id}`)
    } catch {
      setCreating(false)
    }
  }

  async function deleteSession(sessionId: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId))
      }
    } catch (e) {
      console.error('Delete failed:', e)
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  function getClusterForModule(moduleId: string) {
    return CLUSTERS.find(c => c.modules.some(m => m.id === moduleId))
  }

  const hasSessions = sessions.length > 0

  return (
    <AppShell>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px' }}>

        {/* === Hero — IMMER sichtbar === */}
        <div className="landing" style={{
          textAlign: 'center',
          padding: '20px 0 40px',
          height: 'auto',
        }}>
          <div style={{ marginBottom: 24 }}><LogoIcon size={88} /></div>
          <h1 className="landing-title">
            <strong>17</strong>solutions
          </h1>
          <p className="landing-subtitle">
            Every brand has an untold SDG story. We find it, shape it into
            strategy, and craft pitch-ready innovation concepts.
          </p>
        </div>

        {/* === Brand Cards — IMMER sichtbar === */}
        <p className="landing-question">Which brand do you want to transform?</p>
        <div className="landing-brands">
          {EXAMPLE_BRANDS.map(b => (
            <div key={b.name} className="brand-card" onClick={() => startSession(b.name)}>
              <div className="brand-card-name">{b.name}</div>
              <div className="brand-card-industry">{b.desc}</div>
            </div>
          ))}
        </div>
        <p className="landing-hint">Click a brand above to get started, or type your own below</p>

        {/* === Custom Input — IMMER sichtbar === */}
        <div style={{
          maxWidth: 560, margin: '28px auto 0',
          display: 'flex', gap: 12,
        }}>
          <input
            type="text"
            value={brandName}
            onChange={e => setBrandName(e.target.value)}
            placeholder="Oder eigenen Markennamen eingeben…"
            onKeyDown={e => e.key === 'Enter' && startSession(brandName)}
            disabled={creating}
            style={{
              flex: 1, padding: '14px 18px', borderRadius: 12,
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: 14, outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => startSession(brandName)}
            disabled={creating || !brandName.trim()}
            style={{
              padding: '14px 24px', borderRadius: 12,
              background: creating || !brandName.trim() ? 'var(--text-muted)' : 'var(--accent-coral)',
              color: 'white', fontSize: 14, fontWeight: 600,
              border: 'none', cursor: creating ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {creating ? 'Starte…' : 'Analyse starten'}
          </button>
        </div>

        {/* === Projekte — nur wenn vorhanden === */}
        {loadingSessions && (
          <div style={{ textAlign: 'center', padding: '40px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Projekte laden…
          </div>
        )}

        {hasSessions && (
          <div style={{ marginTop: 64 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14,
            }}>
              Deine Analysen
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {sessions.map(s => {
                const cluster = getClusterForModule(s.currentModule)
                const isConfirming = confirmDelete === s.id
                return (
                  <div
                    key={s.id}
                    style={{
                      padding: '16px 20px', borderRadius: 12,
                      background: 'var(--bg-card)',
                      border: isConfirming ? '1px solid var(--accent-coral)' : '1px solid var(--border)',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', transition: 'border-color 0.2s',
                    }}
                  >
                    {/* Projekt-Info */}
                    <div
                      onClick={() => !isConfirming && router.push(`/session/${s.id}`)}
                      style={{
                        flex: 1, cursor: isConfirming ? 'default' : 'pointer',
                      }}
                      onMouseEnter={e => {
                        if (!isConfirming) e.currentTarget.parentElement!.style.borderColor = 'var(--accent-teal)'
                      }}
                      onMouseLeave={e => {
                        if (!isConfirming) e.currentTarget.parentElement!.style.borderColor = 'var(--border)'
                      }}
                    >
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

                    {/* Aktionen */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {isConfirming ? (
                        <>
                          <span style={{ fontSize: 12, color: 'var(--accent-coral)', marginRight: 4 }}>
                            Wirklich löschen?
                          </span>
                          <button
                            onClick={() => deleteSession(s.id)}
                            disabled={deleting}
                            style={{
                              padding: '6px 14px', borderRadius: 6,
                              background: 'var(--accent-coral)', color: 'white',
                              fontSize: 12, fontWeight: 600, border: 'none',
                              cursor: deleting ? 'wait' : 'pointer',
                            }}
                          >
                            {deleting ? '...' : 'Ja'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            style={{
                              padding: '6px 14px', borderRadius: 6,
                              background: 'transparent', color: 'var(--text-muted)',
                              fontSize: 12, fontWeight: 500,
                              border: '1px solid var(--border)', cursor: 'pointer',
                            }}
                          >
                            Nein
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmDelete(s.id)
                            }}
                            title="Projekt löschen"
                            style={{
                              width: 28, height: 28, borderRadius: 6,
                              background: 'transparent', border: '1px solid transparent',
                              color: 'var(--text-muted)', fontSize: 14,
                              cursor: 'pointer', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-coral)'
                              ;(e.currentTarget as HTMLElement).style.color = 'var(--accent-coral)'
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.borderColor = 'transparent'
                              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                            }}
                          >
                            ✕
                          </button>
                          <span
                            onClick={() => router.push(`/session/${s.id}`)}
                            style={{ fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer', padding: '0 4px' }}
                          >
                            →
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
