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

export default function DashboardPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [brandName, setBrandName] = useState('')
  const [creating, setCreating] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(setSessions)
      .catch(console.error)
  }, [])

  async function createSession() {
    if (!brandName.trim()) return
    setCreating(true)

    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandName: brandName.trim() }),
    })

    const session = await res.json()
    setCreating(false)
    router.push(`/session/${session.id}`)
  }

  function getClusterForModule(moduleId: string) {
    return CLUSTERS.find(c => c.modules.some(m => m.id === moduleId))
  }

  return (
    <AppShell>
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Sessions</h1>
        <button
          onClick={() => setShowNewForm(true)}
          style={{
            padding: '10px 20px', borderRadius: 10,
            background: 'var(--accent-teal)', color: 'white',
            fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
          }}
        >
          + Neue Session
        </button>
      </div>

      {/* Neue Session Form */}
      {showNewForm && (
        <div style={{
          padding: 24, borderRadius: 14,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Neue Session starten</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              placeholder="z.B. MANN+HUMMEL, Siemens, Nike..."
              onKeyDown={e => e.key === 'Enter' && createSession()}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 14, outline: 'none',
              }}
            />
            <button
              onClick={createSession}
              disabled={creating || !brandName.trim()}
              style={{
                padding: '10px 24px', borderRadius: 8,
                background: creating ? 'var(--text-muted)' : 'var(--accent-coral)',
                color: 'white', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
              }}
            >
              {creating ? 'Erstellen...' : 'Starten'}
            </button>
            <button
              onClick={() => { setShowNewForm(false); setBrandName('') }}
              style={{
                padding: '10px 16px', borderRadius: 8,
                background: 'transparent', color: 'var(--text-muted)',
                fontSize: 14, border: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Sessions Liste */}
      {sessions.length === 0 && !showNewForm ? (
        <div style={{
          textAlign: 'center', padding: '80px 0',
          color: 'var(--text-muted)', fontSize: 15,
        }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>🌍</p>
          <p>Noch keine Sessions. Starte deine erste!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {sessions.map(s => {
            const cluster = getClusterForModule(s.currentModule)
            return (
              <div
                key={s.id}
                onClick={() => router.push(`/session/${s.id}`)}
                style={{
                  padding: '18px 20px', borderRadius: 12,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-teal)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{s.brandName}</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {cluster && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: cluster.color,
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
                <span style={{ fontSize: 20, color: 'var(--text-muted)' }}>→</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
    </AppShell>
  )
}
