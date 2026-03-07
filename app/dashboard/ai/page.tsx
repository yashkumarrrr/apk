'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

interface Message {
  id:      string
  role:    'user' | 'assistant' | 'system'
  content: string
  loading?: boolean
}

interface QuickAction {
  icon:    string
  label:   string
  prompt:  string
  color:   string
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: '🔍', label: 'Analyze last pipeline',    prompt: 'Analyze my most recent pipeline run and tell me what happened.',              color: 'text-accent-2' },
  { icon: '🖥️', label: 'Check server health',       prompt: 'Check the health of my servers and tell me if anything needs attention.',     color: 'text-success' },
  { icon: '⚡', label: 'Generate pipeline',         prompt: 'Help me create a CI/CD pipeline for a Node.js web app with tests and Docker.', color: 'text-warning' },
  { icon: '🚀', label: 'Optimize my deploy',        prompt: 'How can I make my deployments faster and more reliable?',                     color: 'text-accent' },
  { icon: '🔐', label: 'Security audit',            prompt: 'Review my server configuration for common security issues and suggest fixes.', color: 'text-danger' },
  { icon: '📊', label: 'Explain my metrics',        prompt: 'Explain what my current server metrics mean and if they look normal.',         color: 'text-purple-400' },
]

function uid() { return Math.random().toString(36).slice(2) }

function MarkdownText({ text }: { text: string }) {
  // Simple markdown renderer: code blocks, inline code, bold, bullets
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`|\*\*[^*]+\*\*)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).split('\n')
          const lang  = lines[0].trim()
          const code  = lines.slice(lang ? 1 : 0).join('\n')
          return (
            <pre key={i} className="my-2 bg-[#0d1117] border border-border rounded-lg p-3 overflow-x-auto text-[12px] font-mono text-[#e6edf3] leading-relaxed">
              {lang && <div className="text-[10px] text-muted mb-2 font-sans">{lang}</div>}
              <code>{code}</code>
            </pre>
          )
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={i} className="font-mono text-[12px] bg-surface-2 border border-border rounded px-1.5 py-0.5 text-accent-2">{part.slice(1, -1)}</code>
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>
        }
        // Render line breaks and bullets
        return (
          <span key={i}>
            {part.split('\n').map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {line.startsWith('- ') || line.startsWith('• ')
                  ? <span className="flex gap-2 mt-1"><span className="text-accent shrink-0">›</span><span>{line.slice(2)}</span></span>
                  : line.match(/^\d+\. /)
                  ? <span className="flex gap-2 mt-1"><span className="text-accent shrink-0 font-mono text-xs">{line.match(/^\d+/)?.[0]}.</span><span>{line.replace(/^\d+\. /, '')}</span></span>
                  : line.startsWith('### ')
                  ? <span className="block mt-3 mb-1 font-display font-bold text-[13px] text-white">{line.slice(4)}</span>
                  : line.startsWith('## ')
                  ? <span className="block mt-3 mb-1 font-display font-bold text-[14px] text-white">{line.slice(3)}</span>
                  : line.startsWith('# ')
                  ? <span className="block mt-3 mb-1 font-display font-bold text-[15px] text-white">{line.slice(2)}</span>
                  : line}
              </span>
            ))}
          </span>
        )
      })}
    </span>
  )
}

export default function AiPage() {
  const { toast } = useToast()
  const [messages,  setMessages]  = useState<Message[]>([{
    id:      'welcome',
    role:    'assistant',
    content: "Hi! I'm your AI DevOps assistant. I can analyze your pipeline failures, diagnose server issues, generate pipeline configs, and answer any DevOps questions.\n\nWhat would you like help with?",
  }])
  const [input,     setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const [context,   setContext]   = useState<Record<string, unknown>>({})

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const esRef      = useRef<EventSource | null>(null)
  const abortRef   = useRef<AbortController | null>(null)

  // Load dashboard context (servers + pipelines) for the AI
  useEffect(() => {
    Promise.all([
      fetch('/api/servers').then(r => r.json()),
      fetch('/api/pipelines').then(r => r.json()),
    ]).then(([sData, pData]) => {
      setContext({
        servers:   sData.success  ? sData.data.servers   : [],
        pipelines: pData.success  ? pData.data.pipelines : [],
      })
    }).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Cleanup on unmount
  useEffect(() => () => {
    esRef.current?.close()
    abortRef.current?.abort()
  }, [])

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || streaming) return
    setInput('')
    setStreaming(true)

    const userMsg: Message = { id: uid(), role: 'user', content: userText }
    const asstId = uid()

    setMessages(prev => [
      ...prev,
      userMsg,
      { id: asstId, role: 'assistant', content: '', loading: true },
    ])

    // Build message history for API (exclude system + loading)
    const history = [...messages, userMsg]
      .filter(m => m.role !== 'system' && !m.loading)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    try {
      const abort = new AbortController()
      abortRef.current = abort

      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: history, context }),
        signal:  abort.signal,
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))
            if (evt.type === 'delta' && evt.text) {
              fullText += evt.text
              setMessages(prev => prev.map(m =>
                m.id === asstId ? { ...m, content: fullText, loading: false } : m
              ))
            }
            if (evt.type === 'error') {
              throw new Error(evt.error)
            }
          } catch (parseErr) { /* skip bad frames */ }
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === asstId ? { ...m, loading: false } : m
      ))
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') return
      const errMsg = e instanceof Error ? e.message : 'Failed to get response'
      setMessages(prev => prev.map(m =>
        m.id === asstId
          ? { ...m, content: `Error: ${errMsg}\n\nMake sure ANTHROPIC_API_KEY is set in your .env file.`, loading: false }
          : m
      ))
    } finally {
      setStreaming(false)
    }
  }, [messages, streaming, context])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function stopStreaming() {
    abortRef.current?.abort()
    setStreaming(false)
  }

  function clearChat() {
    setMessages([{
      id:      'welcome',
      role:    'assistant',
      content: "Chat cleared. What would you like help with?",
    }])
  }

  const hasContext = (context.servers as unknown[])?.length > 0 || (context.pipelines as unknown[])?.length > 0

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-accent/20 border border-purple-500/30 flex items-center justify-center text-lg">
            🤖
          </div>
          <div>
            <h1 className="font-display font-black text-[17px]">AI Assistant</h1>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" />
              <span className="text-[11px] text-muted">claude-sonnet · streaming</span>
              {hasContext && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-[11px] text-success">context loaded</span>
                </>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="text-xs text-muted hover:text-white transition-colors font-mono"
        >
          Clear chat
        </button>
      </div>

      {/* Quick actions — show only when just the welcome message */}
      {messages.length === 1 && (
        <div className="px-6 pt-5 flex-shrink-0">
          <p className="text-xs text-muted font-mono mb-3">Quick actions</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.label}
                onClick={() => sendMessage(a.prompt)}
                className="flex items-center gap-2.5 p-3 bg-surface border border-border rounded-xl hover:border-accent/40 hover:bg-surface-2 transition-all text-left group"
              >
                <span className="text-xl flex-shrink-0">{a.icon}</span>
                <span className={cn('text-[12px] font-mono font-medium group-hover:text-white transition-colors', a.color)}>
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
        {messages.map(msg => (
          <div key={msg.id} className={cn(
            'flex gap-3',
            msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
          )}>
            {/* Avatar */}
            <div className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-0.5',
              msg.role === 'user'
                ? 'bg-accent/20 border border-accent/30'
                : 'bg-purple-500/10 border border-purple-500/20'
            )}>
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>

            {/* Bubble */}
            <div className={cn(
              'max-w-[82%] rounded-xl px-4 py-3 text-[13px] leading-relaxed',
              msg.role === 'user'
                ? 'bg-accent/10 border border-accent/20 text-white'
                : 'bg-surface border border-border text-[#c9d1d9]'
            )}>
              {msg.loading ? (
                <span className="flex items-center gap-2 text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              ) : (
                <MarkdownText text={msg.content} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 pb-6 flex-shrink-0">
        {/* Analyze shortcuts when there's context */}
        {hasContext && messages.length > 1 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            <AnalyzeButton
              label="🔍 Analyze latest run"
              onClick={() => sendMessage('Analyze my most recent pipeline run and tell me what failed and how to fix it.')}
              disabled={streaming}
            />
            <AnalyzeButton
              label="🖥️ Diagnose servers"
              onClick={() => sendMessage('Check all my servers and tell me if any metrics are concerning.')}
              disabled={streaming}
            />
            <AnalyzeButton
              label="⚡ Suggest improvements"
              onClick={() => sendMessage('Based on my current setup, what are the most impactful improvements I could make?')}
              disabled={streaming}
            />
          </div>
        )}

        <div className="flex gap-3 items-end bg-surface border border-border rounded-xl p-3 focus-within:border-accent/40 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything… e.g. 'Why did my build fail?' or 'Generate a pipeline for a React app'"
            rows={1}
            className="flex-1 bg-transparent text-[13px] text-white placeholder:text-muted outline-none resize-none leading-relaxed"
            style={{ maxHeight: 120, overflowY: 'auto' }}
            disabled={streaming}
          />
          {streaming ? (
            <button
              onClick={stopStreaming}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-danger/20 border border-danger/30 text-danger hover:bg-danger/30 transition-colors flex-shrink-0"
              title="Stop"
            >
              ■
            </button>
          ) : (
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent text-white hover:bg-accent-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              title="Send (Enter)"
            >
              ↑
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted/40 text-center mt-2">
          Enter to send · Shift+Enter for newline · Context from your dashboard is included automatically
        </p>
      </div>

    </div>
  )
}

function AnalyzeButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 bg-surface border border-border rounded-lg text-[11px] text-muted hover:text-white hover:border-accent/40 transition-all disabled:opacity-40 font-mono"
    >
      {label}
    </button>
  )
}
