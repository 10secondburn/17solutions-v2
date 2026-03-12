'use client'

import { useState, useEffect } from 'react'
import type { SelectionConfig } from '@/lib/orchestrator/selection-config'

interface SelectionPanelProps {
  config: SelectionConfig
  items: any[]
  defaultSelected: (string | number)[]
  language: 'de' | 'en'
  onConfirm: (selectedIds: (string | number)[]) => void
}

export default function SelectionPanel({
  config,
  items,
  defaultSelected,
  language,
  onConfirm,
}: SelectionPanelProps) {
  const [selected, setSelected] = useState<Set<string | number>>(new Set(defaultSelected))
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    setSelected(new Set(defaultSelected))
    setConfirmed(false)
  }, [defaultSelected])

  const toggleItem = (id: string | number) => {
    const next = new Set(selected)
    if (next.has(id)) {
      next.delete(id)
    } else {
      if (config.mode === 'single') {
        next.clear()
      }
      if (config.maxSelections > 0 && next.size >= config.maxSelections) {
        return // Max erreicht
      }
      next.add(id)
    }
    setSelected(next)
  }

  const handleConfirm = () => {
    setConfirmed(true)
    onConfirm(Array.from(selected))
  }

  const handleUseDefault = () => {
    setConfirmed(true)
    onConfirm(defaultSelected)
  }

  if (confirmed) {
    return (
      <div style={{
        padding: '10px 14px',
        borderRadius: 10,
        background: 'rgba(74, 158, 142, 0.08)',
        border: '1px solid rgba(74, 158, 142, 0.2)',
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--accent-teal)',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 4,
        }}>
          {language === 'de' ? 'Auswahl gespeichert' : 'Selection saved'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {selected.size} {language === 'de' ? 'ausgewählt' : 'selected'}
        </div>
      </div>
    )
  }

  const prompt = language === 'de' ? config.promptDE : config.promptEN

  return (
    <div style={{
      marginBottom: 12,
      borderRadius: 12,
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
          {prompt}
        </span>
        {config.maxSelections > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            max. {config.maxSelections}
          </span>
        )}
      </div>

      {/* Items */}
      <div style={{
        padding: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        maxHeight: 320,
        overflowY: 'auto',
      }}>
        {items.map((item, idx) => {
          const id = item[config.itemId]
          const label = item[config.itemLabel]
          const desc = config.itemDescription ? item[config.itemDescription] : null
          const score = config.itemScore ? item[config.itemScore] : null
          const score2 = config.itemScoreSecondary ? item[config.itemScoreSecondary] : null
          const isSelected = selected.has(id)
          const isDefault = defaultSelected.includes(id)

          return (
            <button
              key={`${id}-${idx}`}
              onClick={() => toggleItem(id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                border: isSelected
                  ? '1.5px solid var(--accent-teal)'
                  : '1px solid var(--border)',
                background: isSelected
                  ? 'rgba(74, 158, 142, 0.06)'
                  : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s',
              }}
            >
              {/* Checkbox / Radio */}
              <div style={{
                width: 18,
                height: 18,
                minWidth: 18,
                borderRadius: config.mode === 'single' ? '50%' : 4,
                border: isSelected
                  ? '2px solid var(--accent-teal)'
                  : '2px solid var(--border)',
                background: isSelected ? 'var(--accent-teal)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 1,
                transition: 'all 0.15s',
              }}>
                {isSelected && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: desc ? 3 : 0,
                }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    lineHeight: 1.3,
                  }}>
                    {label}
                  </span>
                  {isDefault && (
                    <span style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: 'var(--accent-teal)',
                      padding: '1px 5px',
                      borderRadius: 3,
                      background: 'rgba(74, 158, 142, 0.12)',
                      whiteSpace: 'nowrap',
                    }}>
                      {language === 'de' ? 'Empfehlung' : 'Recommended'}
                    </span>
                  )}
                </div>
                {desc && (
                  <div style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {desc}
                  </div>
                )}
              </div>

              {/* Scores */}
              {(score !== null || score2 !== null) && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 2,
                  minWidth: 60,
                }}>
                  {score !== null && (
                    <div style={{
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      <span>{config.scoreLabel}</span>
                      <span style={{
                        fontWeight: 700,
                        color: scoreColor(score),
                        fontSize: 12,
                      }}>
                        {score}
                      </span>
                    </div>
                  )}
                  {score2 !== null && (
                    <div style={{
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      <span>{config.scoreLabelSecondary}</span>
                      <span style={{
                        fontWeight: 700,
                        color: scoreColor(score2),
                        fontSize: 12,
                      }}>
                        {score2}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Footer Actions */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
      }}>
        <button
          onClick={handleUseDefault}
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 0',
            textDecoration: 'underline',
            textUnderlineOffset: 2,
          }}
        >
          {language === 'de' ? 'KI-Empfehlung nutzen' : 'Use AI recommendation'}
        </button>
        <button
          onClick={handleConfirm}
          disabled={selected.size === 0}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            background: selected.size > 0 ? 'var(--accent-teal)' : 'var(--border)',
            color: selected.size > 0 ? 'white' : 'var(--text-muted)',
            fontSize: 12,
            fontWeight: 600,
            border: 'none',
            cursor: selected.size > 0 ? 'pointer' : 'default',
            transition: 'all 0.15s',
          }}
        >
          {selected.size} {language === 'de' ? 'ausgewählt' : 'selected'}
        </button>
      </div>
    </div>
  )
}

/** Score-abhaengige Farbe (0-10 Skala) */
function scoreColor(score: number): string {
  if (score >= 8) return '#4a9e8e'
  if (score >= 5) return '#e8a94f'
  return '#e87461'
}
