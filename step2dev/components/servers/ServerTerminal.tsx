'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface Line { text: string; type: 'cmd' | 'out' | 'err' | 'sys' | 'exit' }

interface Props {
  serverId:   string
  serverName: string
  username:   string
  host:       string
}

export function ServerTerminal({ serverId, serverName, username, host }: Props) {
  const [lines, setLines]   = useState<Line[]>([
    { text: `Connected to ${serverName} (${host})`, type: 'sys' },
    { text: 'Type any shell command and press Enter.', type: 'sys' },
    { text: '', type: 'sys' },
  ])
  const [input,   setInput]   = useState('')
  const [busy,    setBusy]    = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const esRef     = useRef<EventSource | null>(null)

  const addLine = useCallback((text: string, type: Line['type']) => {
    setLines(p => [...p, { text, type }])
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  // Cleanup SSE on unmount
  useEffect(() => () => { esRef.current?.close() }, [])

  const runCommand = useCallback((cmd: string) => {
    if (!cmd.trim() || busy) return
    setBusy(true)
    setHistory(h => [cmd, ...h.slice(0, 99)])
    setHistIdx(-1)

    if (cmd === 'clear') {
      setLines([{ text: '', type: 'sys' }])
      setBusy(false)
      return
    }

    addLine(`${username}@${host}:~$ ${cmd}`, 'cmd')

    // Close any existing stream
    esRef.current?.close()

    const url = `/api/servers/${serverId}/terminal?cmd=${encodeURIComponent(cmd)}`
    const es  = new EventSource(url)
    esRef.current = es

    // Timeout safety: 30 seconds max per command
    const timeout = setTimeout(() => {
      es.close()
      addLine('[timeout: command took too long]', 'err')
      setBusy(false)
    }, 30_000)

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)

        if (msg.line !== undefined && msg.line !== '') {
          // Split multi-line output
          const lines = msg.line.split('\n')
          for (const l of lines) {
            if (l !== '') addLine(l, msg.isErr ? 'err' : 'out')
          }
        }

        if (msg.exitCode !== undefined) {
          if (msg.exitCode !== 0) {
            addLine(`[exit ${msg.exitCode}]`, 'exit')
          }
          clearTimeout(timeout)
          es.close()
          setBusy(false)
        }
      } catch { /* skip bad frames */ }
    }

    es.onerror = () => {
      clearTimeout(timeout)
      es.close()
      setBusy(false)
    }
  }, [busy, serverId, username, host, addLine])

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !busy) {
      const cmd = input.trim()
      setInput('')
      if (cmd) runCommand(cmd)
      return
    }
    if (e.key === 'ArrowUp') {
      const idx = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(idx)
      setInput(history[idx] ?? '')
      e.preventDefault()
      return
    }
    if (e.key === 'ArrowDown') {
      const idx = Math.max(histIdx - 1, -1)
      setHistIdx(idx)
      setInput(idx === -1 ? '' : history[idx])
      e.preventDefault()
      return
    }
    if (e.key === 'c' && e.ctrlKey) {
      esRef.current?.close()
      addLine('^C', 'err')
      setBusy(false)
      setInput('')
      e.preventDefault()
      return
    }
    if (e.key === 'l' && e.ctrlKey) {
      setLines([{ text: '', type: 'sys' }])
      e.preventDefault()
    }
  }

  return (
    <div className="bg-[#010409] border border-border rounded-xl overflow-hidden flex flex-col" style={{ height: 520 }}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted">{username}@{host}</span>
          <span className="text-[10px] border border-success/30 text-success rounded px-1.5 py-0.5">SSH</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted font-mono">↑↓ history · Ctrl+C · Ctrl+L</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-danger/60" />
            <div className="w-3 h-3 rounded-full bg-warning/60" />
            <div className="w-3 h-3 rounded-full bg-success/60" />
          </div>
        </div>
      </div>

      {/* Output */}
      <div
        className="flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((l, i) => (
          <div key={i} className={cn(
            'whitespace-pre-wrap break-all select-text',
            l.type === 'cmd'  ? 'text-[#79c0ff]' :   // blue for commands
            l.type === 'err'  ? 'text-[#f85149]' :   // red for stderr
            l.type === 'sys'  ? 'text-[#8b949e] italic' :
            l.type === 'exit' ? 'text-[#f85149] opacity-60' :
            'text-[#e6edf3]'                          // white for stdout
          )}>
            {l.text || '\u00A0'}
          </div>
        ))}
        {busy && (
          <div className="text-muted/50 animate-pulse">▋</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-[#0d1117] flex-shrink-0">
        <span className="text-[#79c0ff] font-mono text-[12px] flex-shrink-0">{username}@{host}:~$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={busy}
          autoFocus
          className="flex-1 bg-transparent font-mono text-[12px] text-[#e6edf3] outline-none placeholder:text-muted/30 disabled:opacity-40"
          placeholder={busy ? '' : 'type a command…'}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
        />
        {busy && (
          <span className="w-3 h-3 border border-accent/40 border-t-accent rounded-full animate-spin flex-shrink-0" />
        )}
      </div>
    </div>
  )
}
