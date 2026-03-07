'use client'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div className={cn(
        'relative z-10 w-full bg-surface-2 border border-border rounded-2xl p-7 shadow-[0_32px_64px_rgba(0,0,0,0.6)]',
        'animate-fade-up fill-both',
        widths[size]
      )}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-bold text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-white text-xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-surface-3 transition-colors"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
