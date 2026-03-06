'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  name?: string | null
  email?: string | null
  role?: string
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (data?.user) {
          setUser(data.user)
        } else {
          router.replace('/login')
        }
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        Laden...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 56,
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', zIndex: 100,
      }}>
        {/* Left: Logo */}
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #e87461, #d45a48)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 13,
          }}>17</div>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            17solutions
          </span>
        </a>

        {/* Right: User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            display: 'flex', gap: 4, padding: '4px',
            background: 'var(--bg-card)', borderRadius: 8,
            border: '1px solid var(--border)',
          }}>
            <button style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: 'var(--accent-teal)', color: 'white', border: 'none', cursor: 'pointer',
            }}>DE</button>
            <button style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer',
            }}>EN</button>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {user.name || user.email}
          </div>

          {user.role === 'admin' && (
            <a href="/admin/usage" style={{
              fontSize: 12, color: 'var(--accent-gold)', textDecoration: 'none',
              padding: '4px 10px', borderRadius: 6,
              border: '1px solid var(--accent-gold)',
            }}>
              Admin
            </a>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main style={{ paddingTop: 56 }}>
        {children}
      </main>
    </div>
  )
}
