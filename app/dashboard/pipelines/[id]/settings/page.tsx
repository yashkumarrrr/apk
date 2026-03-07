'use client'
import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { CRON_PRESETS, type EnvVar } from '@/types'

interface Settings {
  id: string; name: string
  trigger:       'MANUAL' | 'PUSH' | 'SCHEDULE'
  repoUrl:       string | null
  branch:        string
  schedule:      string | null
  lastScheduled: string | null
  retryOnFail:   boolean
  maxRetries:    number
  webhookSecret: string | null
  envVars:       EnvVar[]
}

interface WebhookEvent {
  id: string; source: string; event: string
  branch: string; commit: string | null; actor: string | null
  processed: boolean; createdAt: string
}

export default function PipelineSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router  = useRouter()
  const { toast } = useToast()

  const [settings,  setSettings]  = useState<Settings | null>(null)
  const [events,    setEvents]    = useState<WebhookEvent[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [activeTab, setActiveTab] = useState<'trigger'|'env'|'retry'|'webhook'>('trigger')

  // Local form state
  const [trigger,      setTrigger]      = useState<'MANUAL'|'PUSH'|'SCHEDULE'>('MANUAL')
  const [schedule,     setSchedule]     = useState('')
  const [customCron,   setCustomCron]   = useState(false)
  const [retryOnFail,  setRetryOnFail]  = useState(false)
  const [maxRetries,   setMaxRetries]   = useState(3)
  const [envVars,      setEnvVars]      = useState<EnvVar[]>([])
  const [newKey,       setNewKey]       = useState('')
  const [newValue,     setNewValue]     = useState('')
  const [newSecret,    setNewSecret]    = useState(false)
  const [generatingSecret, setGenerating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [sRes, eRes] = await Promise.all([
      fetch(`/api/pipelines/${id}/settings`),
      fetch(`/api/pipelines/${id}/webhooks`),
    ])
    const [sData, eData] = await Promise.all([sRes.json(), eRes.json()])
    if (sData.success) {
      const s = sData.data.settings as Settings
      setSettings(s)
      setTrigger(s.trigger)
      setSchedule(s.schedule ?? '')
      setRetryOnFail(s.retryOnFail)
      setMaxRetries(s.maxRetries)
      setEnvVars(s.envVars ?? [])
      const isPreset = CRON_PRESETS.some(p => p.cron === s.schedule)
      setCustomCron(!isPreset && !!s.schedule)
    }
    if (eData.success) setEvents(eData.data.events)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function save(patch: Record<string, unknown>) {
    setSaving(true)
    try {
      const res  = await fetch(`/api/pipelines/${id}/settings`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch),
      })
      const data = await res.json()
      if (!data.success) { toast(data.error ?? 'Save failed', 'error'); return }
      setSettings(prev => prev ? { ...prev, ...data.data.settings } : data.data.settings)
      toast('Settings saved', 'success')
    } finally {
      setSaving(false)
    }
  }

  async function generateWebhookSecret() {
    setGenerating(true)
    try {
      const res  = await fetch(`/api/pipelines/${id}/settings`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ webhookSecret: 'generate' }),
      })
      const data = await res.json()
      if (data.success) {
        setSettings(prev => prev ? { ...prev, webhookSecret: data.data.settings.webhookSecret } : prev)
        toast('New webhook secret generated', 'success')
      }
    } finally {
      setGenerating(false)
    }
  }

  async function revokeWebhookSecret() {
    await save({ webhookSecret: null })
    setSettings(prev => prev ? { ...prev, webhookSecret: null } : prev)
  }

  function saveTrigger() {
    save({
      trigger,
      schedule: trigger === 'SCHEDULE' ? (schedule || null) : null,
    })
  }

  function addEnvVar() {
    if (!newKey.trim()) return
    setEnvVars(p => [...p, { key: newKey.trim(), value: newValue, secret: newSecret }])
    setNewKey(''); setNewValue(''); setNewSecret(false)
  }

  function removeEnvVar(i: number) {
    setEnvVars(p => p.filter((_, idx) => idx !== i))
  }

  function saveEnvVars() { save({ envVars }) }
  function saveRetry()   { save({ retryOnFail, maxRetries }) }

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/github`
    : '/api/webhooks/github'

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="text-muted font-mono text-sm animate-pulse">Loading settings…</span>
    </div>
  )

  if (!settings) return (
    <div className="text-center py-20 text-muted">Pipeline not found.</div>
  )

  const TABS = [
    { key: 'trigger', label: '⚡ Trigger',    desc: 'When to run' },
    { key: 'env',     label: '🔐 Env Vars',   desc: 'Environment variables' },
    { key: 'retry',   label: '🔁 Retry',      desc: 'Failure handling' },
    { key: 'webhook', label: '🪝 Webhooks',   desc: 'Recent events' },
  ] as const

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/pipelines/${id}`}
          className="text-muted hover:text-white transition-colors text-sm font-mono"
        >
          ← {settings.name}
        </Link>
        <span className="text-border">/</span>
        <span className="text-sm font-mono text-white">Settings</span>
      </div>

      <div>
        <h1 className="font-display text-2xl font-black">Pipeline Settings</h1>
        <p className="text-muted text-sm mt-1">Configure auto-triggers, env vars, and retry behaviour.</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'flex-1 px-3 py-2 rounded-lg text-xs font-mono transition-all',
              activeTab === t.key
                ? 'bg-accent text-white font-bold'
                : 'text-muted hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TRIGGER TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'trigger' && (
        <div className="space-y-6">
          <Section title="Trigger Mode" desc="Choose how this pipeline gets started.">
            <div className="grid grid-cols-3 gap-3">
              {(['MANUAL', 'PUSH', 'SCHEDULE'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTrigger(t)}
                  className={cn(
                    'relative p-4 rounded-xl border text-left transition-all',
                    trigger === t
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-surface hover:border-accent/40'
                  )}
                >
                  <div className="text-xl mb-2">
                    {t === 'MANUAL' ? '🖱️' : t === 'PUSH' ? '🚀' : '⏰'}
                  </div>
                  <div className="font-mono text-sm font-bold">{t}</div>
                  <div className="text-muted text-xs mt-1">
                    {t === 'MANUAL'   && 'Click to run'}
                    {t === 'PUSH'     && 'On git push'}
                    {t === 'SCHEDULE' && 'On a schedule'}
                  </div>
                  {trigger === t && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />
                  )}
                </button>
              ))}
            </div>
          </Section>

          {trigger === 'PUSH' && (
            <Section title="GitHub Webhook Setup" desc="Copy this URL into your GitHub repo → Settings → Webhooks.">
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted font-mono mb-1.5 block">Payload URL</label>
                  <CopyField value={webhookUrl} mono />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted font-mono mb-1.5 block">Content type</label>
                    <CopyField value="application/json" mono />
                  </div>
                  <div>
                    <label className="text-xs text-muted font-mono mb-1.5 block">Which events?</label>
                    <CopyField value="Just the push event" mono />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted font-mono mb-1.5 block">Secret (optional but recommended)</label>
                  {settings.webhookSecret ? (
                    <div className="flex gap-2 items-center">
                      <CopyField value={settings.webhookSecret} mono secret />
                      <Button variant="ghost" size="sm" onClick={revokeWebhookSecret} className="text-danger/70 hover:text-danger shrink-0">Revoke</Button>
                    </div>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={generateWebhookSecret} disabled={generatingSecret}>
                      {generatingSecret ? 'Generating…' : '+ Generate Secret'}
                    </Button>
                  )}
                </div>

                <InfoBox icon="ℹ️">
                  This webhook fires whenever anyone pushes to <code className="text-accent-2 font-mono text-xs">{settings.branch}</code> in your repo.
                  The pipeline will auto-run on the server that is currently ONLINE.
                </InfoBox>
              </div>
            </Section>
          )}

          {trigger === 'SCHEDULE' && (
            <Section title="Cron Schedule" desc="Uses UTC. Runs are triggered by the Vercel cron job (every minute).">
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted font-mono mb-2 block">Quick presets</label>
                  <div className="flex flex-wrap gap-2">
                    {CRON_PRESETS.map(p => (
                      <button
                        key={p.cron}
                        onClick={() => { setSchedule(p.cron); setCustomCron(false) }}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-xs font-mono transition-all',
                          schedule === p.cron && !customCron
                            ? 'border-accent bg-accent/10 text-white'
                            : 'border-border text-muted hover:text-white hover:border-accent/40'
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setCustomCron(true)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg border text-xs font-mono transition-all',
                        customCron
                          ? 'border-accent bg-accent/10 text-white'
                          : 'border-border text-muted hover:text-white hover:border-accent/40'
                      )}
                    >
                      Custom…
                    </button>
                  </div>
                </div>

                {customCron && (
                  <div>
                    <label className="text-xs text-muted font-mono mb-1.5 block">Custom cron expression</label>
                    <Input
                      value={schedule}
                      onChange={e => setSchedule(e.target.value)}
                      placeholder="0 2 * * *"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted mt-1">
                      Format: minute hour day month weekday &nbsp;·&nbsp;
                      <a href="https://crontab.guru" target="_blank" rel="noopener" className="text-accent-2 hover:underline">crontab.guru</a>
                    </p>
                  </div>
                )}

                {schedule && (
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="text-success">✓</span>
                    Schedule: <code className="font-mono text-accent-2">{schedule}</code>
                    {settings.lastScheduled && (
                      <span>· Last ran {timeAgoStr(settings.lastScheduled)}</span>
                    )}
                  </div>
                )}

                <InfoBox icon="⚠️">
                  Add this to <code className="font-mono text-xs text-accent-2">vercel.json</code> to enable cron (already included in the zip):
                  <pre className="mt-2 text-xs bg-surface-2 rounded p-2 overflow-x-auto">{`{"crons":[{"path":"/api/cron","schedule":"* * * * *"}]}`}</pre>
                </InfoBox>
              </div>
            </Section>
          )}

          <div className="flex justify-end">
            <Button onClick={saveTrigger} disabled={saving}>
              {saving ? 'Saving…' : 'Save Trigger Settings'}
            </Button>
          </div>
        </div>
      )}

      {/* ── ENV VARS TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'env' && (
        <div className="space-y-6">
          <Section
            title="Environment Variables"
            desc="Injected into every pipeline run as shell exports. Secret values are masked in the UI."
          >
            {/* Existing vars */}
            {envVars.length > 0 && (
              <div className="space-y-2 mb-4">
                {envVars.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 py-2.5 group">
                    <span className="font-mono text-xs text-accent-2 w-40 truncate">{v.key}</span>
                    <span className="flex-1 font-mono text-xs text-muted truncate">
                      {v.secret ? '••••••••' : v.value}
                    </span>
                    {v.secret && (
                      <span className="text-[10px] border border-warning/30 text-warning rounded px-1.5 py-0.5 shrink-0">secret</span>
                    )}
                    <button
                      onClick={() => removeEnvVar(i)}
                      className="text-muted/30 hover:text-danger transition-colors opacity-0 group-hover:opacity-100 shrink-0 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new */}
            <div className="border border-dashed border-border rounded-xl p-4 space-y-3">
              <p className="text-xs text-muted font-mono">Add variable</p>
              <div className="flex gap-2">
                <Input
                  placeholder="KEY"
                  value={newKey}
                  onChange={e => setNewKey(e.target.value.toUpperCase().replace(/\s/g, '_'))}
                  className="font-mono flex-1"
                />
                <Input
                  placeholder="value"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  type={newSecret ? 'password' : 'text'}
                  className="font-mono flex-[2]"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newSecret}
                    onChange={e => setNewSecret(e.target.checked)}
                    className="rounded accent-accent"
                  />
                  Mark as secret (masked in UI + logs)
                </label>
                <Button variant="secondary" size="sm" onClick={addEnvVar} disabled={!newKey.trim()}>
                  + Add
                </Button>
              </div>
            </div>

            <InfoBox icon="🔐">
              Variables are exported before each stage runs: <code className="font-mono text-xs text-accent-2">export KEY="value"</code>.
              Secret values are never shown in logs.
            </InfoBox>
          </Section>

          <div className="flex justify-end">
            <Button onClick={saveEnvVars} disabled={saving}>
              {saving ? 'Saving…' : 'Save Env Vars'}
            </Button>
          </div>
        </div>
      )}

      {/* ── RETRY TAB ───────────────────────────────────────────────────────── */}
      {activeTab === 'retry' && (
        <div className="space-y-6">
          <Section title="Retry on Failure" desc="Automatically re-run the pipeline when it fails.">
            <div className="space-y-5">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-mono font-bold">Auto-retry on failure</p>
                  <p className="text-xs text-muted mt-0.5">Re-runs the full pipeline after a 5 second delay.</p>
                </div>
                <Toggle value={retryOnFail} onChange={setRetryOnFail} />
              </label>

              {retryOnFail && (
                <div>
                  <label className="text-xs text-muted font-mono mb-2 block">
                    Max retries (per 30 minute window)
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setMaxRetries(n)}
                        className={cn(
                          'w-12 h-10 rounded-lg border font-mono text-sm transition-all',
                          maxRetries === n
                            ? 'border-accent bg-accent/10 text-white font-bold'
                            : 'border-border text-muted hover:text-white hover:border-accent/40'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <InfoBox icon="🔁">
                Retries are labeled <code className="font-mono text-xs text-accent-2">retry:1</code>,&nbsp;
                <code className="font-mono text-xs text-accent-2">retry:2</code>, etc. in the run history.
                Retries stop once the pipeline succeeds or the max is reached.
              </InfoBox>
            </div>
          </Section>

          <div className="flex justify-end">
            <Button onClick={saveRetry} disabled={saving}>
              {saving ? 'Saving…' : 'Save Retry Settings'}
            </Button>
          </div>
        </div>
      )}

      {/* ── WEBHOOK EVENTS TAB ──────────────────────────────────────────────── */}
      {activeTab === 'webhook' && (
        <div className="space-y-4">
          <Section title="Recent Webhook Events" desc="The last 20 events received for this pipeline.">
            {events.length === 0 ? (
              <div className="text-center py-10 text-muted">
                <div className="text-3xl mb-3">🪝</div>
                <p className="text-sm font-mono">No webhook events yet.</p>
                <p className="text-xs mt-1">Configure a GitHub webhook to start seeing events here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map(e => (
                  <div key={e.id} className="flex items-center gap-3 bg-surface-2 rounded-lg px-3 py-2.5">
                    <span className="text-lg">{e.source === 'github' ? '🐙' : '🦊'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-white">{e.event}</span>
                        <span className="font-mono text-xs text-accent-2">→ {e.branch}</span>
                        {e.commit && (
                          <span className="font-mono text-xs text-muted">{e.commit}</span>
                        )}
                        {e.actor && (
                          <span className="text-xs text-muted">by {e.actor}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted/50 mt-0.5">{timeAgoStr(e.createdAt)}</div>
                    </div>
                    <span className={cn(
                      'text-[10px] font-mono rounded px-1.5 py-0.5 border',
                      e.processed
                        ? 'text-success border-success/30 bg-success/5'
                        : 'text-muted border-border'
                    )}>
                      {e.processed ? 'triggered' : 'ignored'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
      <div>
        <h3 className="font-display font-bold text-sm">{title}</h3>
        <p className="text-xs text-muted mt-0.5">{desc}</p>
      </div>
      {children}
    </div>
  )
}

function InfoBox({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-surface-2 rounded-lg px-3 py-2.5 text-xs text-muted">
      <span className="shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-10 h-6 rounded-full transition-colors shrink-0',
        value ? 'bg-accent' : 'bg-surface-2 border border-border'
      )}
    >
      <span className={cn(
        'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
        value ? 'translate-x-5' : 'translate-x-1'
      )} />
    </button>
  )
}

function CopyField({ value, mono, secret }: { value: string; mono?: boolean; secret?: boolean }) {
  const [copied, setCopied] = useState(false)
  const [show, setShow] = useState(false)

  function copy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const display = secret && !show ? '••••••••••••••••' : value

  return (
    <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-lg px-3 py-2 group">
      <span className={cn('flex-1 text-xs text-white truncate', mono && 'font-mono')}>{display}</span>
      {secret && (
        <button onClick={() => setShow(s => !s)} className="text-muted hover:text-white text-xs shrink-0">
          {show ? '🙈' : '👁️'}
        </button>
      )}
      <button onClick={copy} className="text-muted hover:text-accent-2 text-xs shrink-0 transition-colors">
        {copied ? '✓' : '⎘'}
      </button>
    </div>
  )
}

function timeAgoStr(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000)  return 'just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return `${Math.floor(diff / 86400_000)}d ago`
}
