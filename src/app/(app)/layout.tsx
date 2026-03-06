import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user as any

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 56,
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', zIndex: 100,
      }}>
        {/* Left: Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #e87461, #d45a48)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 13,
          }}>17</div>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            17solutions
          </span>
        </div>

        {/* Right: Language + User */}
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

      {/* Main Content (below header) */}
      <main style={{ flex: 1, paddingTop: 56 }}>
        {children}
      </main>
    </div>
  )
}
