'use client'
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'info'
interface Toast { id: string; message: string; type: ToastType }
interface ToastCtx { toast: (message: string, type?: ToastType) => void }

const Ctx = createContext<ToastCtx>({ toast: () => {} })
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={() => setToasts(p => p.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </Ctx.Provider>
  )
}

function ToastItem({ toast: t, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => { const timer = setTimeout(onRemove, 3500); return () => clearTimeout(timer) }, [onRemove])
  const styles = {
    success: 'border-l-4 border-l-success',
    error:   'border-l-4 border-l-danger',
    info:    'border-l-4 border-l-accent',
  }
  const icons = { success: '✓', error: '✕', info: 'ℹ' }
  const iconColors = { success: 'text-success', error: 'text-danger', info: 'text-accent-2' }

  return (
    <div className={cn(
      'pointer-events-auto bg-surface-2 border border-border rounded-xl px-4 py-3',
      'flex items-center gap-3 shadow-xl min-w-[260px] max-w-[340px]',
      'animate-fade-up fill-both',
      styles[t.type]
    )}>
      <span className={cn('text-sm font-bold flex-shrink-0', iconColors[t.type])}>{icons[t.type]}</span>
      <p className="text-sm text-white flex-1">{t.message}</p>
      <button onClick={onRemove} className="text-muted hover:text-white text-xs ml-2">✕</button>
    </div>
  )
}
