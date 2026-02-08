"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import casesData from "@/data/cases.json";

interface Message { id: string; role: "user" | "assistant"; content: string; }
interface SessionState { currentStep: number; brandName: string; selectedSDGs: number[]; mode: "creative" | "inspiration"; }
interface CaseItem { id: string; name: string; brand: string; agency: string; year: number; award: string; sdgs: number[]; type: string; industry: string; region: string; context: string; insight: string; solution: string; results: string; source: string; }

const SDG_COLORS: Record<number, string> = { 1:"#E5243B",2:"#DDA63A",3:"#4C9F38",4:"#C5192D",5:"#FF3A21",6:"#26BDE2",7:"#FCC30B",8:"#A21942",9:"#FD6925",10:"#DD1367",11:"#FD9D24",12:"#BF8B2E",13:"#3F7E44",14:"#0A97D9",15:"#56C02B",16:"#00689D",17:"#19486A" };

const STEPS = [
  { num: 1, name: "Brand Entry" }, { num: 2, name: "SDG Mapping" }, { num: 3, name: "SDG Selection" },
  { num: 4, name: "Reality Check" }, { num: 5, name: "Target Research" }, { num: 6, name: "Data Research" },
  { num: 7, name: "Springboards" }, { num: 8, name: "Partnerships" }, { num: 9, name: "Idea Development" },
  { num: 10, name: "Business Impact" }, { num: 11, name: "ROI Estimation" }, { num: 12, name: "Case Board" },
];

const cases: CaseItem[] = casesData as CaseItem[];

function LogoIcon({ size = 80 }: { size?: number }) {
  const cx = 50, cy = 50, outerR = 44, innerR = 26, pts = 17;
  const d: string[] = [];
  for (let i = 0; i < pts * 2; i++) {
    const a = (Math.PI * 2 * i) / (pts * 2) - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    d.push(`${i === 0 ? "M" : "L"}${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  d.push("Z");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e87461"/><stop offset="100%" stopColor="#d45a48"/>
        </linearGradient>
        <filter id="gl"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <path d={d.join("")} fill="url(#lg)" filter="url(#gl)"/>
      <text x="50" y="56" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff" fontFamily="Inter,system-ui,sans-serif">17</text>
    </svg>
  );
}

function SmallLogo({ size = 32 }: { size?: number }) {
  const cx = 50, cy = 50, outerR = 44, innerR = 26, pts = 17;
  const d: string[] = [];
  for (let i = 0; i < pts * 2; i++) {
    const a = (Math.PI * 2 * i) / (pts * 2) - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    d.push(`${i === 0 ? "M" : "L"}${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  d.push("Z");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <path d={d.join("")} fill="#e87461"/>
      <text x="50" y="56" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff" fontFamily="Inter,system-ui,sans-serif">17</text>
    </svg>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [session, setSession] = useState<SessionState>({ currentStep: 1, brandName: "", selectedSDGs: [], mode: "creative" });
  const [showCases, setShowCases] = useState(false);
  const [caseFilter, setCaseFilter] = useState("");
  const [sdgFilter, setSdgFilter] = useState<number | null>(null);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const filteredCases = useMemo(() => cases.filter(c => {
    const mt = !caseFilter || c.brand.toLowerCase().includes(caseFilter.toLowerCase()) || c.name.toLowerCase().includes(caseFilter.toLowerCase());
    return mt && (!sdgFilter || c.sdgs.includes(sdgFilter));
  }), [caseFilter, sdgFilter]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (inputRef.current) { inputRef.current.style.height = "auto"; inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + "px"; } }, [input]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return;
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    let s = { ...session };
    if (s.currentStep === 1 && !s.brandName) { s.brandName = input.trim(); setSession(s); }
    const adv = ["continue","next","weiter","go","proceed","let's go","mach weiter"];
    if (adv.some(k => input.trim().toLowerCase().includes(k)) && s.currentStep < 12) { s = { ...s, currentStep: s.currentStep + 1 }; setSession(s); }
    const newMsgs = [...messages, userMessage];
    setMessages(newMsgs); setInput(""); setIsStreaming(true);
    const aId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aId, role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: newMsgs.map(m => ({ role: m.role, content: m.content })), currentStep: s.currentStep, brandName: s.brandName, selectedSDGs: s.selectedSDGs, mode: s.mode }) });
      if (!res.ok) throw new Error("API error");
      const reader = res.body?.getReader(); const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");
      let acc = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6); if (data === "[DONE]") continue;
            try { const p = JSON.parse(data); if (p.text) { acc += p.text; setMessages(prev => prev.map(m => m.id === aId ? { ...m, content: acc } : m)); } } catch(_e) { void _e; }
          }
        }
      }
    } catch(_e) { void _e; setMessages(prev => prev.map(m => m.id === aId ? { ...m, content: "Connection error. Please check your API key and try again." } : m)); }
    finally { setIsStreaming(false); }
  }, [input, isStreaming, messages, session]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const hasStarted = messages.length > 0;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <SmallLogo size={36} />
          <span style={{ fontSize: "20px", letterSpacing: "-0.02em" }}>
            <span style={{ fontWeight: 300, color: "#ccc" }}>17</span>
            <span style={{ fontWeight: 600, color: "#e8e8e8" }}>solutions</span>
          </span>
        </div>
        <nav className="sidebar-nav">
          {STEPS.map(step => {
            const isActive = step.num === session.currentStep;
            const isDone = step.num < session.currentStep;
            return (
              <div key={step.num} className={`sidebar-nav-item ${isActive ? "active" : ""} ${isDone ? "completed" : ""}`}>
                <span className={`step-num ${isActive ? "active" : isDone ? "done" : "future"}`}>{isDone ? "\u2713" : step.num}</span>
                <span>{step.name}</span>
              </div>
            );
          })}
        </nav>
        <div style={{ flex: 1 }} />
        <div className="sidebar-info">
          17solutions is a strategic innovation engine powered by{" "}
          <a href="https://insurgent.co" target="_blank" rel="noopener noreferrer">Insurgent.co</a>,
          helping brands align profit with purpose and turn SDG strategy into pitch-ready concepts.
          <br /><button className="sidebar-cta" onClick={() => setShowCases(!showCases)}>{showCases ? "Close Cases" : "Browse Case Library"}</button>
        </div>
        <div className="mode-toggle">
          <button className={session.mode === "creative" ? "active" : ""} onClick={() => setSession(s => ({ ...s, mode: "creative" }))}>Creative Path</button>
          <button className={session.mode === "inspiration" ? "active" : ""} onClick={() => setSession(s => ({ ...s, mode: "inspiration" }))}>Inspiration</button>
        </div>
      </div>

      {/* MAIN */}
      <div className="chat-area">
        {hasStarted && (
          <div className="chat-header">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {session.brandName && <span style={{ fontSize: "14px", fontWeight: 600, color: "#fff", padding: "6px 16px", background: "var(--accent-coral)", borderRadius: "20px" }}>{session.brandName}</span>}
            </div>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Step {session.currentStep} of 12 — {STEPS[session.currentStep - 1]?.name}</span>
          </div>
        )}
        <div className="chat-messages">
          {!hasStarted ? (
            <div className="landing">
              <div style={{ marginBottom: "24px" }}><LogoIcon size={88} /></div>
              <h1 className="landing-title"><strong>17</strong>solutions</h1>
              <p className="landing-subtitle">Every brand has an untold SDG story. We find it, shape it into strategy, and craft pitch-ready innovation concepts — in 11 steps.</p>
              <p className="landing-question">Which brand do you want to transform?</p>
              <div className="landing-brands">
                {[{n:"Nike",d:"Sport & culture"},{n:"IKEA",d:"Home & living"},{n:"Siemens",d:"Tech & industry"},{n:"Patagonia",d:"Outdoor & activism"},{n:"Unilever",d:"FMCG & purpose"}].map(b => (
                  <div key={b.n} className="brand-card" onClick={() => setInput(b.n)}>
                    <div className="brand-card-name">{b.n}</div>
                    <div className="brand-card-industry">{b.d}</div>
                  </div>
                ))}
              </div>
              <p className="landing-hint">Click a brand above to get started, or type your own below</p>
            </div>
          ) : (
            <>{messages.map(msg => msg.role === "user" ? (
              <div key={msg.id} className="msg-user"><div className="msg-user-bubble">{msg.content}</div></div>
            ) : (
              <div key={msg.id} className="msg-bot">
                <div className="msg-bot-icon"><SmallLogo size={32} /></div>
                <div className="msg-bot-content" dangerouslySetInnerHTML={{ __html: msg.content ? fmtMd(msg.content) : '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>' }} />
              </div>
            ))}<div ref={messagesEndRef} /></>
          )}
        </div>
        <div className="input-area">
          <div className="input-wrap">
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={!hasStarted ? "Enter a brand name to start..." : "Reply to 17solutions"} rows={1} className="input-field" disabled={isStreaming} />
            <button className={`send-btn ${input.trim() ? "ready" : ""}`} onClick={sendMessage} disabled={isStreaming || !input.trim()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* CASES */}
      {showCases && (
        <div className="cases-panel">
          <div style={{ padding: "18px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 600 }}>Case Library</h2>
              <button onClick={() => setShowCases(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "20px" }}>×</button>
            </div>
            <input type="text" placeholder="Search brands..." value={caseFilter} onChange={e => setCaseFilter(e.target.value)} style={{ width: "100%", fontSize: "13px", padding: "10px 14px", borderRadius: "10px", background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none", fontFamily: "inherit", marginBottom: "10px", boxSizing: "border-box" as const }} />
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "5px" }}>
              {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17].map(s => (
                <button key={s} onClick={() => setSdgFilter(sdgFilter === s ? null : s)} className="sdg-dot" style={{ background: sdgFilter === s ? SDG_COLORS[s] : "var(--bg-input)", color: sdgFilter === s ? "#fff" : "var(--text-muted)", border: `1px solid ${sdgFilter === s ? SDG_COLORS[s] : "var(--border)"}`, cursor: "pointer" }}>{s}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" as const, padding: "10px" }}>
            {filteredCases.map(c => (
              <div key={c.id} className={`case-card ${expandedCase === c.id ? "expanded" : ""}`} onClick={() => setExpandedCase(expandedCase === c.id ? null : c.id)}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div><div style={{ fontSize: "13px", fontWeight: 600 }}>{c.brand}</div><div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{c.name}</div></div>
                  <div style={{ display: "flex", gap: "3px" }}>{c.sdgs.slice(0,3).map(s => <span key={s} className="sdg-dot" style={{ background: SDG_COLORS[s], width: "18px", height: "18px", fontSize: "8px" }}>{s}</span>)}</div>
                </div>
                {expandedCase === c.id && (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                    {[{l:"Context",t:c.context},{l:"Insight",t:c.insight},{l:"Solution",t:c.solution},{l:"Results",t:c.results}].map(x => (
                      <div key={x.l} style={{ marginBottom: "8px" }}><div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase" as const, color: "var(--text-muted)", marginBottom: "3px" }}>{x.l}</div><div style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--text-secondary)" }}>{x.t}</div></div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function fmtMd(t: string): string {
  if (!t) return "";
  if (t.startsWith("<")) return t;
  let h = t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>")
    .replace(/`(.*?)`/g,"<code>$1</code>")
    .replace(/^### (.*$)/gm,"<h3>$1</h3>").replace(/^## (.*$)/gm,"<h2>$1</h2>").replace(/^# (.*$)/gm,"<h1>$1</h1>")
    .replace(/^---$/gm,"<hr>").replace(/^- (.*$)/gm,"<li>$1</li>").replace(/^\d+\. (.*$)/gm,"<li>$1</li>")
    .replace(/\n\n/g,"</p><p>").replace(/\n/g,"<br>");
  h = "<p>" + h + "</p>";
  h = h.replace(/<p><\/p>/g,"").replace(/<p>(<h[123]>)/g,"$1").replace(/(<\/h[123]>)<\/p>/g,"$1");
  return h;
}
