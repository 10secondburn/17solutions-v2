'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    // Session-Check via API, dann weiterleiten
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (data?.user) {
          router.replace('/dashboard')
        } else {
          router.replace('/login')
        }
      })
      .catch(() => router.replace('/login'))
  }, [router])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
      Laden...
    </div>
  )
}
