'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/Button'

function Content() {
  const params = useSearchParams()
  const router = useRouter()
  const [state, setState] = useState<'loading'|'success'|'error'|'pending'>('loading')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const success = params.get('success')
    const error = params.get('error')
    const token = params.get('token')

    if (success) { setState('success'); setTimeout(() => router.push('/dashboard'), 2500); return }
    if (error) { setState('error'); setMsg('This link is invalid or has expired.'); return }
    if (token) {
      fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
        .then(r => r.json())
        .then(d => {
          if (d.success) { setState('success'); setTimeout(() => router.push('/dashboard'), 2500) }
          else { setState('error'); setMsg(d.error ?? 'Verification failed.') }
        })
        .catch(() => { setState('error'); setMsg('Network error.') })
      return
    }
    setState('pending')
  }, [params, router])

  if (state === 'loading') return (
    <AuthCard title="Verifying…">
      <div className="flex justify-center py-8">
        <div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin" />
      </div>
    </AuthCard>
  )

  if (state === 'success') return (
    <AuthCard title="Email verified! 🎉">
      <div className="text-center py-6">
        <div className="text-5xl mb-4">✅</div>
        <p className="text-muted text-sm mb-1">Your account is now active.</p>
        <p className="text-muted text-xs">Redirecting to dashboard…</p>
      </div>
    </AuthCard>
  )

  if (state === 'error') return (
    <AuthCard title="Verification failed">
      <div className="text-center py-6">
        <div className="text-5xl mb-4">❌</div>
        <p className="text-muted text-sm mb-6">{msg}</p>
        <Link href="/auth/login"><Button full>Back to Login</Button></Link>
      </div>
    </AuthCard>
  )

  return (
    <AuthCard title="Verify your email" subtitle="We sent a verification link. Check your inbox and spam folder.">
      <div className="text-center py-6">
        <div className="text-5xl mb-4">✉️</div>
        <p className="text-muted text-sm mb-6">Click the link in your email to activate your account. It expires in 24 hours.</p>
        <Link href="/auth/login"><Button variant="ghost" full>Back to Sign In</Button></Link>
      </div>
    </AuthCard>
  )
}

export default function VerifyEmailPage() {
  return <Suspense><Content /></Suspense>
}
