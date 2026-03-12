'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { CLUSTERS, MODULES, type ModuleDefinition } from '@/types'
import AppShell from '@/components/AppShell'
import { renderMessage } from '@/components/MessageRenderer'
import SelectionPanel from '@/components/SelectionPanel'
import { getSelectionConfig, getSelectableItems, getDefaultSelection, type SelectionConfig } from '@/lib/orchestrator/selection-config'
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
  completedModules?: string[]
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
  const autoStartedRef = useRef(false)
  const [showCases, setShowCases] = useState(false)
  const [caseFilter, setCaseFilter] = useState('')
  const [sdgFilter, setSdgFilter] = useState<number | null>(null)
  const [expandedCase, setExpandedCase] = useState<string | null>(null)
  const [completedModules, setCompletedModules] = useState<string[]>([])
  const [furthestModule, setFurthestModule] = useState<string>('verstehen_01')
  // Selection State
  const [selectionConfig, setSelectionConfig] = useState<SelectionConfig | null>(null)
  const [selectionItems, setSelectionItems] = useState<any[]>([])
  const [selectionDefaults, setSelectionDefaults] = useState<(string | number)[]>([])
  const [selectionConfirmed, setSelectionConfirmed] = useState(false)
  const [pendingSelection, setPendingSelection] = useState<(string | number)[] | null>(null)
  // Debug: Sichtbarer Status fuer Selection-Troubleshooting
  const [selectionDebug, setSelectionDebug] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // Track last processed module for selection to prevent duplicate checks
  const lastProcessedModuleRef = useRef<string | null>(null)

  // === Performance: Streaming-Optimierung ===
  // Token-Buffer: sammelt Tokens zwischen Frames (kein State-Update pro Token)
  const streamBufferRef = useRef('')
  // Aktueller Streaming-Content (akkumuliert, fuer renderMessage)
  const streamContentRef = useRef('')
  // Pre-gerendertes HTML fuer die aktive Streaming-Nachricht
  const [streamingHtml, setStreamingHtml] = useState('')
  // ID der aktiven Streaming-Nachricht
  const streamMsgIdRef = useRef<string | null>(null)
  // RAF ID fuer Cleanup
  const rafIdRef = useRef<number | null>(null)
  // Letzter renderMessage-Timestamp (Throttle)
  const lastRenderRef = useRef(0)
  const RENDER_THROTTLE_MS = 120 // renderMessage max alle 120ms

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
          // Funktionales Update: Wenn Auto-Start bereits Messages hinzugefügt hat,
          // nicht mit leerer DB-Antwort überschreiben (React Strict Mode Schutz)
          setMessages(prev => {
            if (prev.length > 0) return prev
            return msgs
          })
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId, router])

  // Auto-scroll bei neuen Messages oder Streaming-Updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingHtml])

  // Ref auf sendToOrchestrator — immer aktuell, kein stale closure
  const sendToOrchestratorRef = useRef(sendToOrchestrator)
  useEffect(() => { sendToOrchestratorRef.current = sendToOrchestrator })

  // Ref um Messages-Länge für den Auto-Start zu tracken ohne Dependency
  const messagesLenRef = useRef(messages.length)
  useEffect(() => { messagesLenRef.current = messages.length })

  // === AUTO-START: Wenn Session geladen und keine Messages → KI sofort starten ===
  useEffect(() => {
    if (!session || loading || autoStartedRef.current) return
    // Existierende Session mit Messages — kein Auto-Start
    if (messagesLenRef.current > 0) return

    autoStartedRef.current = true
    setAutoStarted(true)

    // setTimeout(0) damit der Ref-Update-Effect gelaufen ist
    // und sendToOrchestratorRef.current die aktuelle Version hat
    const brandName = session.brandName
    setTimeout(() => {
      sendToOrchestratorRef.current(
        `Analysiere die Marke ${brandName}. Starte mit dem Brand Entry.`,
        true,
      )
    }, 50)
  }, [session, loading, sessionId])

  // Unified Send-Funktion für alle Interaktionen
  async function sendToOrchestrator(
    userInput: string,
    isAutoStart = false,
    action?: string,
    targetModule?: string,
  ) {
    if (sending) return
    setSending(true)

    // Bei Auto-Start keine User-Bubble zeigen (der User hat nichts getippt)
    if (!isAutoStart) {
      const userMsg: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: userInput,
        moduleId: targetModule || session?.currentModule,
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
          action: action || (isAutoStart ? 'auto_start' : undefined),
          ...(targetModule ? { targetModule } : {}),
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

      // === Optimiertes SSE-Streaming ===
      // Tokens werden in einem Buffer gesammelt und per RAF geflusht.
      // renderMessage() wird nur throttled aufgerufen (nicht pro Token).
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No reader')

      // Streaming-State initialisieren
      streamBufferRef.current = ''
      streamContentRef.current = ''
      streamMsgIdRef.current = assistantMsgId
      lastRenderRef.current = 0

      // RAF-basierter Flush: sammelt alle Tokens seit dem letzten Frame
      const startStreamingLoop = () => {
        const flush = () => {
          if (streamBufferRef.current) {
            // Buffer in Content uebernehmen
            streamContentRef.current += streamBufferRef.current
            streamBufferRef.current = ''

            // Throttled Rendering: renderMessage nur alle RENDER_THROTTLE_MS
            const now = performance.now()
            if (now - lastRenderRef.current > RENDER_THROTTLE_MS) {
              lastRenderRef.current = now
              setStreamingHtml(renderMessage(streamContentRef.current) + '<span style="opacity:0.4">▍</span>')
            }
          }
          rafIdRef.current = requestAnimationFrame(flush)
        }
        rafIdRef.current = requestAnimationFrame(flush)
      }
      startStreamingLoop()

      let sseBuffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        sseBuffer += decoder.decode(value, { stream: true })
        const lines = sseBuffer.split('\n')
        sseBuffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'token') {
              // Token nur in den Buffer schreiben — RAF macht den Rest
              streamBufferRef.current += event.text
            }

            if (event.type === 'module') {
              if (event.currentModule) {
                setSession(s => s ? { ...s, currentModule: event.currentModule } : s)
              }
              if (event.completedModules) setCompletedModules(event.completedModules)
              if (event.furthestModule) setFurthestModule(event.furthestModule)
            }

            if (event.type === 'done') {
              // RAF stoppen
              if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current)
                rafIdRef.current = null
              }

              // Restlichen Buffer flushen
              streamContentRef.current += streamBufferRef.current
              streamBufferRef.current = ''

              // Finales vollstaendiges Rendering (nicht throttled)
              const finalContent = event.fullText || streamContentRef.current
              const finalHtml = renderMessage(finalContent)

              // In messages-Array uebernehmen (einmalig, nicht pro Token)
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, content: finalContent, moduleId: event.currentModule || m.moduleId }
                  : m
              ))
              setStreamingHtml('')
              streamMsgIdRef.current = null

              if (event.currentModule) {
                setSession(s => s ? { ...s, currentModule: event.currentModule } : s)

                // === SelectionPanel: ONLY process for CURRENT module, not previous ones ===
                // BUG-06 FIX: Only check selection config once per module
                if (lastProcessedModuleRef.current !== event.currentModule) {
                  lastProcessedModuleRef.current = event.currentModule

                  const selCfg = getSelectionConfig(event.currentModule)
                  const dbg: string[] = [`mod=${event.currentModule}`, `cfg=${!!selCfg}`]

                  if (selCfg) {
                    let selResolved = false
                    dbg.push(`eventSD=${!!event.selectionData}`, `sdLen=${event.selectionData?.items?.length || 0}`)

                    // Versuch 1: Direkt vom Server
                    if (event.selectionData?.items?.length > 0) {
                      dbg.push('src=server')
                      setSelectionConfig(selCfg)
                      setSelectionItems(event.selectionData.items)
                      setSelectionDefaults(event.selectionData.defaults || [])
                      setSelectionConfirmed(false)
                      setPendingSelection(null)
                      selResolved = true
                    }

                    // Versuch 2: Aus fullText
                    if (!selResolved && finalContent) {
                      try {
                        const jm = finalContent.match(/```json\s*([\s\S]*?)```/)
                        dbg.push(`jsonBlock=${!!jm}`)
                        if (jm) {
                          const pd = JSON.parse(jm[1].trim())
                          dbg.push(`keys=${Object.keys(pd).join(',')}`)
                          const itms = getSelectableItems(event.currentModule, pd)
                          dbg.push(`items=${itms.length}`)
                          if (itms.length > 0) {
                            setSelectionConfig(selCfg)
                            setSelectionItems(itms)
                            setSelectionDefaults(getDefaultSelection(event.currentModule, pd))
                            setSelectionConfirmed(false)
                            setPendingSelection(null)
                            dbg.push('src=fullText')
                            selResolved = true
                          }
                        }
                      } catch (e: any) { dbg.push(`err=${e.message?.slice(0, 40)}`) }
                    }

                    if (!selResolved) {
                      // Task 3: Enhanced diagnostic logging when extraction fails
                      const fullTextLen = finalContent.length
                      const hasJsonBlock = /```json\s*[\s\S]*?```/.test(finalContent)
                      dbg.push(`FAIL|fullTextLen=${fullTextLen}|jsonBlock=${hasJsonBlock}`)
                      setSelectionConfig(null)
                      setSelectionItems([])
                    }
                  } else {
                    setSelectionConfig(null)
                    setSelectionItems([])
                  }

                  const debugStr = dbg.join(' | ')
                  console.log('[SEL]', debugStr)
                  setSelectionDebug(debugStr)
                }
              }
              if (event.completedModules) setCompletedModules(event.completedModules)
              if (event.furthestModule) setFurthestModule(event.furthestModule)
            }

            if (event.type === 'error') {
              if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current)
                rafIdRef.current = null
              }
              streamMsgIdRef.current = null
              setStreamingHtml('')
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
      // Cleanup: RAF stoppen falls noch aktiv
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      streamMsgIdRef.current = null
      streamBufferRef.current = ''
      setSending(false)
      setStreaming(false)
      setStreamingHtml('')
      inputRef.current?.focus()
    }
  }

  // User-Message senden (normale Konversation — KEIN Advance)
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

  // Selection bestätigt: Items merken
  function handleSelectionConfirm(selectedIds: (string | number)[]) {
    setPendingSelection(selectedIds)
    setSelectionConfirmed(true)
  }

  // Weiter-Button: Selektion speichern, dann nächstes Modul starten
  async function handleAdvance() {
    if (sending) return

    // Selektion speichern (falls vorhanden)
    const currentModule = session?.currentModule
    if (currentModule && selectionConfig) {
      const itemsToSave = pendingSelection || selectionDefaults
      if (itemsToSave.length > 0) {
        try {
          await fetch('/api/selections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              moduleId: currentModule,
              selectedItems: itemsToSave,
            }),
          })
        } catch (e) {
          console.error('Selection save failed:', e)
        }
      }
    }

    // Selection State zurücksetzen
    setSelectionConfig(null)
    setSelectionItems([])
    setSelectionDefaults([])
    setSelectionConfirmed(false)
    setPendingSelection(null)

    sendToOrchestrator('Weiter zum nächsten Schritt.', false, 'advance')
  }

  // Rückwärts-Navigation: zu einem vorherigen Modul zurückkehren
  async function handleRevisit(targetModuleId: string) {
    if (sending || !session) return
    const sessionLang = (session.language || 'de') as 'de' | 'en'
    const moduleDef = getModuleDef(targetModuleId)
    const moduleName = moduleDef ? (sessionLang === 'de' ? moduleDef.nameDE : moduleDef.name) : targetModuleId
    const revisitInput = sessionLang === 'de'
      ? `Ich möchte das Modul "${moduleName}" erneut bearbeiten. Zeige mir die bisherigen Ergebnisse und frag mich, was ich ändern oder vertiefen möchte.`
      : `I want to revisit the "${moduleName}" module. Show me the previous results and ask what I'd like to change or deepen.`
    sendToOrchestrator(revisitInput, false, 'revisit', targetModuleId)
  }

  // Zum weitesten Fortschritt zurückkehren
  async function handleReturnToFurthest() {
    if (sending || !session) return
    const sessionLang = (session.language || 'de') as 'de' | 'en'
    const moduleDef = getModuleDef(furthestModule)
    const moduleName = moduleDef ? (sessionLang === 'de' ? moduleDef.nameDE : moduleDef.name) : furthestModule
    const returnInput = sessionLang === 'de'
      ? `Zurück zum aktuellen Fortschritt: "${moduleName}". Fasse den bisherigen Stand zusammen und lass uns weitermachen.`
      : `Return to current progress: "${moduleName}". Summarize the current state and let's continue.`
    sendToOrchestrator(returnInput, false, 'revisit', furthestModule)
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
    // Nutze echte Daten: ein Modul ist complete wenn es im Context Store ist
    return completedModules.includes(moduleId)
  }

  // Prüfe ob User gerade "hinter" dem Fortschritt ist (revisiting)
  function isRevisiting(): boolean {
    if (!session) return false
    const currentIdx = MODULES.findIndex(m => m.id === session.currentModule)
    const furthestIdx = MODULES.findIndex(m => m.id === furthestModule)
    return currentIdx < furthestIdx
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
              {cluster.modules.filter(mod => mod.status !== 'coming_soon').map(mod => {
                const complete = isModuleComplete(mod.id)
                const current = isCurrentModule(mod.id)
                // Kann klicken wenn: (completed ODER im revisit-Bereich) UND nicht schon dort
                const canClick = (complete || (isRevisiting() && MODULES.findIndex(m => m.id === mod.id) <= MODULES.findIndex(m => m.id === furthestModule))) && !sending && !current
                return (
                  <div
                    key={mod.id}
                    onClick={() => {
                      if (canClick) handleRevisit(mod.id)
                    }}
                    title={canClick ? (lang === 'de' ? 'Klicke um dieses Modul erneut zu bearbeiten' : 'Click to revisit this module') : undefined}
                    style={{
                      padding: '8px 16px 8px 24px',
                      fontSize: 13,
                      color: current ? 'var(--text-primary)' : complete ? cluster.color : 'var(--text-muted)',
                      fontWeight: current ? 600 : 400,
                      background: current ? 'var(--bg-card)' : 'transparent',
                      borderLeft: current ? `3px solid ${cluster.color}` : '3px solid transparent',
                      cursor: canClick ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (canClick) (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'
                    }}
                    onMouseLeave={e => {
                      if (canClick && !current) (e.currentTarget as HTMLElement).style.background = 'transparent'
                    }}
                  >
                    <span style={{ fontSize: 10 }}>
                      {complete ? '✓' : current ? '●' : '○'}
                    </span>
                    <span>{lang === 'de' ? mod.nameDE : mod.name}</span>
                    {canClick && <span style={{ fontSize: 9, marginLeft: 'auto', color: 'var(--text-muted)' }}>↩</span>}
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
          {/* Analyse-Start-Indikator wenn noch keine Messages */}
          {messages.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '80px 40px',
              color: 'var(--text-muted)',
            }}>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                {sending ? 'Analyse läuft…' : 'Analyse wird vorbereitet…'}
              </p>
            </div>
          )}

          {/* Mini-Summary Block: Completed Modules */}
          {completedModules.length > 0 && (
            <div style={{
              background: '#1a1a1a',
              padding: '8px 16px',
              borderRadius: 8,
              marginBottom: 24,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
            }}>
              {completedModules.map(moduleId => {
                const moduleDef = getModuleDef(moduleId)
                const cluster = getClusterForModule(moduleId)
                if (!moduleDef) return null
                return (
                  <button
                    key={moduleId}
                    onClick={() => handleRevisit(moduleId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 4,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.color = cluster?.color || 'var(--text-primary)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                    }}
                  >
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: cluster?.color || 'var(--text-muted)',
                    }} />
                    <span>{lang === 'de' ? moduleDef.nameDE : moduleDef.name}</span>
                    <span>✓</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Message List — filtere Auto-Messages raus, transformiere Revisit-Messages */}
          {messages
            .filter(msg => {
              // Only show messages for the current module
              if (msg.moduleId && msg.moduleId !== session?.currentModule) return false
              // Auto-Start-Messages verstecken (User hat sie nicht getippt)
              if (msg.role === 'user' && msg.content.startsWith('Analysiere die Marke ')) return false
              // "Weiter"-Klick-Messages verstecken
              if (msg.role === 'user' && msg.content === 'Weiter zum nächsten Schritt.') return false
              // Revisit- und Return-Messages verstecken (werden als System-Marker gezeigt)
              if (msg.role === 'user' && msg.content.startsWith('Ich möchte das Modul "')) return false
              if (msg.role === 'user' && msg.content.startsWith('Zurück zum aktuellen Fortschritt:')) return false
              if (msg.role === 'user' && msg.content.startsWith('I want to revisit the "')) return false
              if (msg.role === 'user' && msg.content.startsWith('Return to current progress:')) return false
              return true
            })
            .map((msg, idx, arr) => {
              return (
              <div key={msg.id}>
              <div
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
                    __html: streaming && msg.id === streamMsgIdRef.current
                      ? (streamingHtml || '<span style="opacity:0.4">▍</span>')
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
            </div>
          )})}

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

          {/* Action Bar: Immer sichtbar wenn nicht streaming — kontextabhängig */}
          {!sending && !streaming && messages.length > 0 && (
            <div style={{
              margin: '24px auto 8px',
              maxWidth: 600,
              padding: '16px 20px',
              borderRadius: 16,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}>
              {/* Aktuelles Modul + Status */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 12,
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: currentCluster?.color || 'var(--accent-teal)',
                  textTransform: 'uppercase', letterSpacing: 1,
                }}>
                  {currentModuleDef
                    ? (lang === 'de' ? currentModuleDef.nameDE : currentModuleDef.name)
                    : session.currentModule}
                </div>
                {isRevisiting() && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: 'var(--accent-coral)',
                    padding: '2px 8px', borderRadius: 4,
                    background: 'rgba(232, 116, 97, 0.15)',
                  }}>
                    {lang === 'de' ? 'Überarbeitung' : 'Revisiting'}
                  </span>
                )}
              </div>

              {/* Download-Optionen — kompakt inline */}
              <div style={{
                display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12,
              }}>
                {[
                  { format: 'pdf', label: 'PDF' },
                  { format: 'pptx', label: 'PPTX' },
                  { format: 'docx', label: 'DOCX' },
                ].map(({ format, label }) => (
                  <a
                    key={format}
                    href={`/api/export?sessionId=${sessionId}&format=${format}`}
                    download
                    style={{
                      padding: '5px 12px', borderRadius: 6,
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      fontSize: 11, fontWeight: 500,
                      textDecoration: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-teal)'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                    }}
                  >
                    <span style={{ fontSize: 12 }}>↓</span> {label}
                  </a>
                ))}
              </div>

              {/* Debug entfernt — Selection funktioniert jetzt mit JSON-FIRST */}

              {/* Selection Panel (wenn verfügbar) */}
              {selectionConfig && selectionItems.length > 0 && (
                <SelectionPanel
                  config={selectionConfig}
                  items={selectionItems}
                  defaultSelected={selectionDefaults}
                  language={lang}
                  onConfirm={handleSelectionConfirm}
                />
              )}

              {/* Navigation Buttons */}
              <div style={{
                paddingTop: 12,
                borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
              }}>
                {/* Links: Zurück zum Fortschritt (nur wenn revisiting) */}
                <div>
                  {isRevisiting() && (
                    <button
                      onClick={handleReturnToFurthest}
                      style={{
                        padding: '8px 16px', borderRadius: 8,
                        background: 'transparent',
                        color: 'var(--accent-coral)',
                        fontSize: 12, fontWeight: 600,
                        border: '1px solid var(--accent-coral)',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(232, 116, 97, 0.1)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent'
                      }}
                    >
                      ↗ {lang === 'de' ? 'Zurück zum Fortschritt' : 'Return to progress'}
                    </button>
                  )}
                </div>

                {/* Rechts: Weiter-Button (nächstes Modul in der Sequenz) */}
                {hasNextModule() && (
                  <button
                    onClick={handleAdvance}
                    style={{
                      padding: '8px 22px', borderRadius: 8,
                      background: 'var(--accent-teal)',
                      color: 'white', fontSize: 13, fontWeight: 600,
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      boxShadow: '0 2px 8px rgba(74,158,142,0.3)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                    }}
                  >
                    {lang === 'de' ? 'Weiter' : 'Continue'} →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Copyright Notice */}
          <div style={{
            padding: '16px 0',
            marginTop: 24,
            fontSize: 11,
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.25)',
            lineHeight: 1.4,
          }}>
            Die 17solutions Methode, einschliesslich aller Analyse-Frameworks, Modul-Strukturen und strategischen Prozesse, ist geistiges Eigentum. Jegliche Reproduktion, Weitergabe oder kommerzielle Nutzung ohne ausdrueckliche Genehmigung ist untersagt.
          </div>

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
