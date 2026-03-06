'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { CLUSTERS, MODULES, type ModuleDefinition } from '@/types'
import AppShell from '@/components/AppShell'
import { renderMessage } from '@/components/MessageRenderer'
import casesData from '@/data/cases.json'

interface CaseItem {
  id: string
  name: string
  brand: string
  agency: string
  year: number
  award: string
  sdgs: number[]
  type: string
  industry: string
  region: string
  context: string
  insight: string
  solution: string
  results: string
  source: string
}

const cases: CaseItem[] = casesData as CaseItem[]

const SDG_COLORS: Record<number, string> = {
  1:'#E5243B',2:'#DDA63A',3:'#4C9F38',4:'#C5192D',5:'#FF3A21',6:'#26BDE2',
  7:'#FCC30B',8:'#A21942',9:'#FD6925',10:'#DD1367',11:'#FD9D24',12:'#BF8B2E',
  13:'#3F7E44',14:'#0A97D9',15:'#56C02B',16:'#00689D',17:'#19486A',
}

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
  const [autoStarted, setAutoStarted] = useState(false)
  const [showCases, setShowCases] = useState(false)
  const [caseFilter, setCaseFilter] = useState('')
  const [sdgFilter, setSdgFilter] = useState<number | null>(null)
  const [expandedCase, setExpandedCase] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Cases filtern
  const filteredCases = useMemo(() => cases.filter(c => {
    const matchesText = !caseFilter ||
      c.brand.toLowerCase().includes(caseFilter.toLowerCase()) ||
      c.name.toLowerCase().includes(caseFilter.toLowerCase()) ||
      c.industry.toLowerCase().includes(caseFilter.toLowerCase())
    return matchesText && (!sdgFilter || c.sdgs.includes(sdgFilter))
  }), [caseFilter, sdgFilter])

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

  // === AUTO-START: Wenn Session geladen und keine Messages → KI sofort starten ===
  useEffect(() => {
    if (!session || loading || autoStarted || messages.length > 0) return
    setAutoStarted(true)

    // Automatisch die erste Analyse starten
    const brandName = session.brandName
    sendToOrchestrator(`Analysiere die Marke ${brandName}. Starte mit dem Brand Entry.`, true)
  }, [session, loading, autoStarted, messages.length])

  // Generische Send-Funktion
  async function sendToOrchestrator(userInput: string, isAutoStart = false) {
    if (sending) return
    setSending(true)

    // Bei Auto-Start keine User-Bubble zeigen (der User hat nichts getippt)
    if (!isAutoStart) {
      const userMsg: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: userInput,
        moduleId: session?.currentModule,
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev, userMsg])
    }

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
        body: JSON.stringify({
          sessionId,
          userInput,
          action: isAutoStart ? 'auto_start' : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
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
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'token') {
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + event.text }
                  : m
              ))
            }

            if (event.type === 'module' && event.currentModule && session) {
              setSession(s => s ? { ...s, currentModule: event.currentModule } : s)
            }

            if (event.type === 'done') {
              if (event.currentModule) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, moduleId: event.currentModule }
                    : m
                ))
                setSession(s => s ? { ...s, currentModule: event.currentModule } : s)
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
  }

  // User-Message senden
  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return
    const userInput = input.trim()
    setInput('')
    sendToOrchestrator(userInput, false)
  }, [input, sending, sessionId, session])

  // Enter zum Senden
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Weiter-Button: nächstes Modul starten
  async function handleAdvance() {
    if (sending) return
    sendToOrchestrator('Weiter zum nächsten Schritt.', false)
  }

  // Prüfe ob das aktuelle Modul einen Nachfolger hat
  function hasNextModule(): boolean {
    if (!session) return false
    const currentDef = MODULES.find(m => m.id === session.currentModule)
    if (!currentDef) return false
    const currentIdx = MODULES.findIndex(m => m.id === session.currentModule)
    // Gibt es ein verfügbares Modul nach dem aktuellen?
    for (let i = currentIdx + 1; i < MODULES.length; i++) {
      if (MODULES[i].status === 'available') return true
    }
    return false
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
      <AppShell>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 'calc(100vh - 56px)', color: 'var(--text-muted)',
        }}>
          Laden…
        </div>
      </AppShell>
    )
  }

  if (!session) return null

  const lang = (session.language || 'de') as 'de' | 'en'
  const currentModuleDef = getModuleDef(session.currentModule)
  const currentCluster = getClusterForModule(session.currentModule)

  return (
    <AppShell>
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
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Projekt</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{session.brandName}</div>
        </div>

        {/* Cluster + Module Navigation */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 0' }}>
          {CLUSTERS.map(cluster => (
            <div key={cluster.id} style={{ marginBottom: 8 }}>
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
                    <span style={{ fontSize: 10 }}>
                      {complete ? '✓' : current ? '●' : '○'}
                    </span>
                    <span>{lang === 'de' ? mod.nameDE : mod.name}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => setShowCases(!showCases)}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              background: showCases ? 'var(--accent-teal)' : 'var(--bg-card)',
              color: showCases ? 'white' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 500, border: '1px solid var(--border)', cursor: 'pointer',
            }}
          >
            {showCases ? 'Cases schliessen' : 'Case Library'}
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              background: 'transparent', color: 'var(--text-muted)',
              fontSize: 12, border: '1px solid var(--border)', cursor: 'pointer',
            }}
          >
            ← {lang === 'de' ? 'Zur Übersicht' : 'Back'}
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
        {/* Module Header mit Brand Pill */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
          {/* Brand Pill */}
          <span style={{
            fontSize: 13, fontWeight: 600, color: '#fff',
            padding: '5px 16px', borderRadius: 20,
            background: 'var(--accent-coral)',
          }}>
            {session.brandName}
          </span>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflow: 'auto',
          padding: '24px 24px 0',
        }}>
          {/* Analyse-Start-Indikator wenn noch keine Messages und Auto-Start läuft */}
          {messages.length === 0 && !sending && (
            <div style={{
              textAlign: 'center', padding: '80px 40px',
              color: 'var(--text-muted)',
            }}>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                Analyse wird vorbereitet…
              </p>
            </div>
          )}

          {/* Message List — filtere Auto-Messages raus */}
          {messages
            .filter(msg => {
              // Auto-Start-Messages verstecken (User hat sie nicht getippt)
              if (msg.role === 'user' && msg.content.startsWith('Analysiere die Marke ')) return false
              // "Weiter"-Klick-Messages verstecken
              if (msg.role === 'user' && msg.content === 'Weiter zum nächsten Schritt.') return false
              return true
            })
            .map(msg => (
            <div
              key={msg.id}
              style={{
                marginBottom: 20,
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {msg.role === 'assistant' ? (
                /* Assistant: Formatiertes Markdown */
                <div
                  className="chat-content"
                  style={{
                    maxWidth: '85%',
                    padding: '16px 20px',
                    borderRadius: '16px 16px 16px 4px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                  dangerouslySetInnerHTML={{
                    __html: streaming && msg.id.startsWith('stream-')
                      ? renderMessage(msg.content) + '<span style="opacity:0.4">▍</span>'
                      : renderMessage(msg.content)
                  }}
                />
              ) : (
                /* User + System: Plain Text */
                <div style={{
                  maxWidth: msg.role === 'user' ? '70%' : '85%',
                  padding: '14px 18px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user'
                    ? 'var(--accent-teal)'
                    : 'rgba(232, 116, 97, 0.15)',
                  color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                  fontSize: 14,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {sending && messages.filter(m => m.id.startsWith('stream-') && m.content.length > 0).length === 0 && (
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '14px 18px', borderRadius: '16px 16px 16px 4px',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', fontSize: 14,
              }}>
                <span style={{ display: 'inline-flex', gap: 4 }}>
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
              </div>
            </div>
          )}

          {/* Phase-Complete Card: Download + Weiter */}
          {!sending && !streaming && messages.length > 0 && (
            <div style={{
              margin: '24px auto 8px',
              maxWidth: 560,
              padding: '20px 24px',
              borderRadius: 16,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}>
              {/* Phase-Abschluss Header */}
              <div style={{
                fontSize: 13, fontWeight: 700, color: 'var(--accent-teal)',
                textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
              }}>
                {currentModuleDef
                  ? `${lang === 'de' ? currentModuleDef.nameDE : currentModuleDef.name} — abgeschlossen`
                  : 'Phase abgeschlossen'}
              </div>

              {/* Download-Optionen */}
              <div style={{ marginBottom: hasNextModule() ? 16 : 0 }}>
                <div style={{
                  fontSize: 12, color: 'var(--text-muted)', marginBottom: 10,
                }}>
                  {lang === 'de' ? 'Ergebnisse exportieren:' : 'Export results:'}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { format: 'pdf', label: 'PDF' },
                    { format: 'pptx', label: 'PowerPoint' },
                    { format: 'docx', label: 'Word' },
                  ].map(({ format, label }) => (
                    <a
                      key={format}
                      href={`/api/export?sessionId=${sessionId}&format=${format}`}
                      download
                      style={{
                        padding: '8px 16px', borderRadius: 8,
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        fontSize: 12, fontWeight: 500,
                        textDecoration: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => {
                        (e.target as HTMLElement).style.borderColor = 'var(--accent-teal)'
                        ;(e.target as HTMLElement).style.color = 'var(--text-primary)'
                      }}
                      onMouseLeave={e => {
                        (e.target as HTMLElement).style.borderColor = 'var(--border)'
                        ;(e.target as HTMLElement).style.color = 'var(--text-secondary)'
                      }}
                    >
                      <span style={{ fontSize: 14 }}>↓</span> {label}
                    </a>
                  ))}
                </div>
              </div>

              {/* Weiter-Button */}
              {hasNextModule() && (
                <div style={{
                  paddingTop: 16,
                  borderTop: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'flex-end',
                }}>
                  <button
                    onClick={handleAdvance}
                    style={{
                      padding: '10px 28px', borderRadius: 10,
                      background: 'var(--accent-teal)',
                      color: 'white', fontSize: 14, fontWeight: 600,
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      boxShadow: '0 2px 8px rgba(74,158,142,0.3)',
                    }}
                    onMouseEnter={e => {
                      (e.target as HTMLElement).style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={e => {
                      (e.target as HTMLElement).style.transform = 'translateY(0)'
                    }}
                  >
                    {lang === 'de' ? 'Weiter' : 'Continue'} →
                  </button>
                </div>
              )}
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
              placeholder={lang === 'de' ? 'Nachricht eingeben…' : 'Type your message…'}
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
              {sending ? '…' : lang === 'de' ? 'Senden' : 'Send'}
            </button>
          </div>
        </div>
      </div>
      {/* === Cases Panel (Slide-Out rechts) === */}
      {showCases && (
        <div className="cases-panel">
          {/* Header */}
          <div style={{ padding: 18, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Case Library</h2>
              <button
                onClick={() => setShowCases(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
              >
                x
              </button>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder={lang === 'de' ? 'Marke, Case oder Branche suchen…' : 'Search brands, cases, industries…'}
              value={caseFilter}
              onChange={e => setCaseFilter(e.target.value)}
              style={{
                width: '100%', fontSize: 13, padding: '10px 14px', borderRadius: 10,
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
                marginBottom: 10, boxSizing: 'border-box' as const,
              }}
            />

            {/* SDG Filter Dots */}
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
              {Array.from({ length: 17 }, (_, i) => i + 1).map(s => (
                <button
                  key={s}
                  onClick={() => setSdgFilter(sdgFilter === s ? null : s)}
                  style={{
                    width: 22, height: 22, borderRadius: '50%',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: sdgFilter === s ? '#fff' : 'var(--text-muted)',
                    background: sdgFilter === s ? SDG_COLORS[s] : 'var(--bg-input)',
                    border: `1px solid ${sdgFilter === s ? SDG_COLORS[s] : 'var(--border)'}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Count */}
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
              {filteredCases.length} {filteredCases.length === 1 ? 'Case' : 'Cases'}
            </div>
          </div>

          {/* Cases List */}
          <div style={{ flex: 1, overflowY: 'auto' as const, padding: 10 }}>
            {filteredCases.map(c => (
              <div
                key={c.id}
                className={`case-card ${expandedCase === c.id ? 'expanded' : ''}`}
                onClick={() => setExpandedCase(expandedCase === c.id ? null : c.id)}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.brand}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{c.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    {c.sdgs.slice(0, 3).map(s => (
                      <span
                        key={s}
                        style={{
                          width: 20, height: 20, borderRadius: '50%',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 8, fontWeight: 700, color: '#fff',
                          background: SDG_COLORS[s],
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedCase === c.id && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    {[
                      { label: 'Context', text: c.context },
                      { label: 'Insight', text: c.insight },
                      { label: 'Solution', text: c.solution },
                      { label: 'Results', text: c.results },
                    ].map(x => (
                      <div key={x.label} style={{ marginBottom: 10 }}>
                        <div style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const,
                          color: 'var(--text-muted)', marginBottom: 3, letterSpacing: 0.5,
                        }}>
                          {x.label}
                        </div>
                        <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                          {x.text}
                        </div>
                      </div>
                    ))}
                    <div style={{
                      display: 'flex', gap: 8, marginTop: 8, fontSize: 10,
                      color: 'var(--text-muted)', flexWrap: 'wrap' as const,
                    }}>
                      <span>{c.industry}</span>
                      <span>·</span>
                      <span>{c.region}</span>
                      <span>·</span>
                      <span>{c.year}</span>
                      <span>·</span>
                      <span>{c.type}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </AppShell>
  )
}
