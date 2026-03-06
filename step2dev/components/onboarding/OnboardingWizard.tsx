'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Step {
  icon:  string
  title: string
  desc:  string
  cta:   string
  href:  string
  tip:   string
}

const STEPS: Step[] = [
  {
    icon:  '🖥️',
    title: 'Add your first server',
    desc:  'Connect any Linux VPS via SSH. Step2Dev will monitor it and run your pipelines on it.',
    cta:   'Add Server',
    href:  '/dashboard/servers',
    tip:   'You need: IP address, SSH port (22), username, and password or private key.',
  },
  {
    icon:  '📁',
    title: 'Create a project',
    desc:  'Organise your work into projects. Each project can have multiple pipelines.',
    cta:   'Create Project',
    href:  '/dashboard/projects',
    tip:   'Projects are like folders — use them to group related pipelines (e.g. "my-saas-app").',
  },
  {
    icon:  '⚡',
    title: 'Build your first pipeline',
    desc:  'Set up a CI/CD pipeline that installs, tests, and deploys your code automatically.',
    cta:   'Create Pipeline',
    href:  '/dashboard/pipelines',
    tip:   'Start with: Install → Build → Deploy. Add your repo URL and set trigger to PUSH.',
  },
  {
    icon:  '🔔',
    title: 'Set up alerts',
    desc:  'Get notified when CPU spikes, disk is full, or a pipeline fails.',
    cta:   'Go to Monitoring',
    href:  '/dashboard/monitoring',
    tip:   'Create a rule: CPU > 80% → Warning. You\'ll get a notification automatically.',
  },
  {
    icon:  '🤖',
    title: 'Try the AI Assistant',
    desc:  'Ask the AI to analyze failed pipelines, diagnose server issues, or generate configs.',
    cta:   'Open AI Assistant',
    href:  '/dashboard/ai',
    tip:   'Try: "Why did my build fail?" or "Generate a pipeline for a Node.js app with Docker."',
  },
]

interface Props {
  onDismiss: () => void
}

export default function OnboardingWizard({ onDismiss }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)

  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1

  function goTo(href: string) {
    onDismiss()
    router.push(href)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-fade-up fill-both">

        {/* Progress bar */}
        <div className="h-1 bg-surface-2">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-sm">Welcome to Step2Dev</span>
            <span className="text-[10px] text-muted border border-border rounded px-1.5 py-0.5 font-mono">
              {step + 1} / {STEPS.length}
            </span>
          </div>
          <button onClick={onDismiss} className="text-muted hover:text-white transition-colors text-lg leading-none">×</button>
        </div>

        {/* Step content */}
        <div className="px-6 py-8 text-center">
          <div className="text-5xl mb-4">{current.icon}</div>
          <h2 className="font-display font-black text-2xl mb-2">{current.title}</h2>
          <p className="text-muted text-sm leading-relaxed mb-6">{current.desc}</p>

          {/* Tip box */}
          <div className="bg-surface-2 border border-border rounded-xl px-4 py-3 text-left mb-6">
            <div className="flex gap-2">
              <span className="text-accent-2 flex-shrink-0 text-sm">💡</span>
              <p className="text-xs text-muted leading-relaxed">{current.tip}</p>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => goTo(current.href)}
            className="w-full py-4 bg-accent hover:bg-accent-2 text-white font-display font-bold text-sm rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(37,99,235,0.3)] mb-3"
          >
            {current.cta} →
          </button>
        </div>

        {/* Step dots + navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-xs text-muted hover:text-white disabled:opacity-30 transition-colors font-mono"
          >
            ← Back
          </button>

          {/* Dots */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  'rounded-full transition-all',
                  i === step ? 'w-4 h-2 bg-accent' : 'w-2 h-2 bg-surface-2 hover:bg-border'
                )}
              />
            ))}
          </div>

          {isLast ? (
            <button
              onClick={onDismiss}
              className="text-xs text-success hover:text-success/80 transition-colors font-mono"
            >
              Done ✓
            </button>
          ) : (
            <button
              onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
              className="text-xs text-muted hover:text-white transition-colors font-mono"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
