'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { CLUSTERS, MODULES, type ModuleDefinition } from '@/types'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  moduleId?: string
  createdAt: string
}

interface SessionData {
  id: string
  brandName: string
  currentModule: string
  language: string
  mode: string
  status: string
}

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [session, setSession] = useState<SessionData | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Session + Messages laden
  useEffect(() => {
    async function load() {
      try {
        const [sessRes, msgRes] = await Promise.all([
          fetch(`/api/sessions/${sessionId}`),
          fetch(`/api/sessions/${sessionId}/messages`),
        ])
        if (!sessRes.ok) { router.push('/dashboard'); return }
        const sessData = await sessRes.json()
        setSession(sessData)
        if (msgRes.ok) {
          const msgs = await msgRes.json()
          setMessages(msgs)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId, router])

  // Auto-scroll bei neuen Messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Nachricht senden — Streaming SSE
  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return
    const userInput = input.trim()
    setInput('')
    setSending(true)

    // Optimistisch User-Message anzeigen
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userInput,
      moduleId: session?.currentModule,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])

    // Leere Assistant-Message anlegen (wird per Streaming gefüllt)
    const assistantMsgId = `stream-${Date.now()}`
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    }])
    setStreaming(true)

    try {
      const res = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userInput }),
      })

      if (!res.ok) {
        const data = await res.json()
        setMessages(prev => prev.filter(m => m.id !== assistantMsgId))
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: 'system',
          content: data.error || 'Ein Fehler ist aufgetreten.',
          createdAt: new Date().toISOString(),
        }])
        return
      }

      // SSE Stream lesen
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No reader')

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Unvollständige letzte Zeile behalten

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'token') {
              // Token an bestehende Assistant-Message anhängen
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + event.text }
                  : m
              ))
            }

            if (event.type === 'module' && event.currentModule && session) {
              setSession({ ...session, currentModule: event.currentModule })
            }

            if (event.type === 'done') {
              // ModuleId setzen
              if (event.currentModule) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, moduleId: event.currentModule }
                    : m
                ))
                if (session) {
                  setSession({ ...session, currentModule: event.currentModule })
                }
              }
            }

            if (event.type === 'error') {
              setMessages(prev => prev.filter(m => m.id !== assistantMsgId))
              setMessages(prev => [...prev, {
                id: `err-${Date.now()}`,
                role: 'system',
                content: event.message,
                createdAt: new Date().toISOString(),
              }])
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'system',
        content: 'Netzwerkfehler — bitte versuche es erneut.',
        createdAt: new Date().toISOString(),
      }])
    } finally {
      setSending(false)
      setStreaming(false)
      inputRef.current?.focus()
    }
  }, [input, sending, sessionId, session])

  // Enter zum Senden
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function getModuleDef(moduleId: string): ModuleDefinition | undefined {
    return MODULES.find(m => m.id === moduleId)
  }

  function getClusterForModule(moduleId: string) {
    return CLUSTERS.find(c => c.modules.some(m => m.id === moduleId))
  }

  function isModuleComplete(moduleId: string): boolean {
    if (!session) return false
    const current = MODULES.findIndex(m => m.id === session.currentModule)
    const check = MODULES.findIndex(m => m.id === moduleId)
    return check < current
  }

  function isCurrentModule(moduleId: string): boolean {
    return session?.currentModule === moduleId
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 56px)', color: 'var(--text-muted)' }}>
        Laden...
      </div>
    )
  }

  if (!session) return null

  const lang = (session.language || 'de') as 'de' | 'en'
  const currentModuleDef = getModuleDef(session.currentModule)
  const currentCluster = getClusterForModule(session.currentModule)

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
      {/* === Sidebar: Phase Navigation === */}
      <aside style={{
        width: sidebarOpen ? 260 : 0,
        overflow: 'hidden',
        transition: 'width 0.2s',
        borderRight: sidebarOpen ? '1px solid var(--border)' : 'none',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Brand Header */}
        <div style={{
          padding: '20px 16px 12px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Session</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{session.brandName}</div>
        </div>

        {/* Cluster + Module Navigation */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 0' }}>
          {CLUSTERS.map(cluster => (
            <div key={cluster.id} style={{ marginBottom: 8 }}>
              {/* Cluster Header */}
              <div style={{
                padding: '8px 16px',
                fontSize: 11,
                fontWeight: 800,
                color: cluster.color,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}>
                {cluster.name}
              </div>

              {/* Modules */}
              {cluster.modules.map(mod => {
                const complete = isModuleComplete(mod.id)
                const current = isCurrentModule(mod.id)
                const comingSoon = mod.status === 'coming_soon'
                return (
                  <div
                    key={mod.id}
                    style={{
                      padding: '8px 16px 8px 24px',
                      fontSize: 13,
                      color: current ? 'var(--text-primary)' : complete ? cluster.color : 'var(--text-muted)',
                      fontWeight: current ? 600 : 400,
                      background: current ? 'var(--bg-card)' : 'transparent',
                      borderLeft: current ? `3px solid ${cluster.color}` : '3px solid transparent',
                      cursor: comingSoon ? 'default' : 'pointer',
                      opacity: comingSoon ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {/* Status Indicator */}
                    <span style={{ fontSize: 10 }}>
                      {complete ? '✓' : current ? '●' : comingSoon ? '○' : '○'}
                    </span>
                    <span>{lang === 'de' ? mod.nameDE : mod.name}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Zurück Button */}
        <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              background: 'transparent', color: 'var(--text-muted)',
              fontSize: 13, border: '1px solid var(--border)', cursor: 'pointer',
            }}
          >
            ← {lang === 'de' ? 'Zur Übersicht' : 'Back to Dashboard'}
          </button>
        </div>
      </aside>

      {/* Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'absolute', left: sidebarOpen ? 248 : 0,
          top: 72, width: 24, height: 24, borderRadius: '50%',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10, transition: 'left 0.2s',
        }}
      >
        {sidebarOpen ? '‹' : '›'}
      </button>

      {/* === Main Chat Area === */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Module Header */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {currentCluster && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: currentCluster.color,
              padding: '3px 10px', borderRadius: 6,
              border: `1px solid ${currentCluster.color}`,
            }}>
              {currentCluster.name}
            </span>
          )}
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            {currentModuleDef ? (lang === 'de' ? currentModuleDef.nameDE : currentModuleDef.name) : session.currentModule}
          </span>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflow: 'auto',
          padding: '24px 24px 0',
        }}>
          {/* Welcome Message wenn noch keine Messages */}
          {messages.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '60px 40px',
              color: 'var(--text-muted)',
            }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>🌍</div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                {session.brandName}
              </h2>
              <p style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>
                {lang === 'de'
                  ? `Starte die Analyse, indem du den Markennamen bestätigst oder zusätzliche Informationen über ${session.brandName} teilst.`
                  : `Start the analysis by confirming the brand name or sharing additional information about ${session.brandName}.`
                }
              </p>
            </div>
          )}

          {/* Message List */}
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                marginBottom: 20,
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{
                maxWidth: msg.role === 'user' ? '70%' : '85%',
                padding: '14px 18px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user'
                  ? 'var(--accent-teal)'
                  : msg.role === 'system'
                    ? 'rgba(232, 116, 97, 0.15)'
                    : 'var(--bg-card)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                fontSize: 14,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing Indicator — nur vor dem ersten Token, nicht während Streaming */}
          {sending && !streaming && (
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '14px 18px', borderRadius: '16px 16px 16px 4px',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', fontSize: 14,
              }}>
                <span style={{ animation: 'pulse 1.5s infinite' }}>●●●</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{
          padding: '16px 24px 20px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-primary)',
        }}>
          <div style={{
            display: 'flex', gap: 12, alignItems: 'flex-end',
            maxWidth: 800, margin: '0 auto',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={lang === 'de' ? 'Nachricht eingeben...' : 'Type your message...'}
              rows={1}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 12,
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 14,
                resize: 'none', outline: 'none',
                minHeight: 44, maxHeight: 200,
                lineHeight: 1.5, fontFamily: 'inherit',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              style={{
                padding: '12px 24px', borderRadius: 12,
                background: sending || !input.trim() ? 'var(--text-muted)' : 'var(--accent-coral)',
                color: 'white', fontSize: 14, fontWeight: 600,
                border: 'none', cursor: sending ? 'wait' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {sending ? '...' : lang === 'de' ? 'Senden' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
