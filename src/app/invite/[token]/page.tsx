'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Bitte gib deinen Namen ein.')
      return
    }
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein.')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim(), password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Einladung ungültig oder abgelaufen.')
        return
      }

      // Erfolgreich — weiter zum Login
      router.push('/login?invited=true')
    } catch (e) {
      setError('Netzwerkfehler — bitte versuche es erneut.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)',
    }}>
      <div style={{
        width: 400, padding: 40, borderRadius: 16,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg, #e87461, #d45a48)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 18, marginBottom: 12,
          }}>17</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Einladung annehmen</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Erstelle deinen 17solutions Account
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: 'rgba(232, 116, 97, 0.15)', color: 'var(--accent-coral)',
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
              Dein Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Vor- und Nachname"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
              Passwort wählen
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mindestens 8 Zeichen"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
              Passwort bestätigen
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Passwort wiederholen"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%', padding: '12px', borderRadius: 10,
              background: submitting ? 'var(--text-muted)' : 'var(--accent-coral)',
              color: 'white', fontSize: 15, fontWeight: 600,
              border: 'none', cursor: submitting ? 'wait' : 'pointer',
            }}
          >
            {submitting ? 'Erstellen...' : 'Account erstellen'}
          </button>
        </form>
      </div>
    </div>
  )
}
