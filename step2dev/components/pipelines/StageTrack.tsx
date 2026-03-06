import { cn } from '@/lib/utils'
import type { RunStatus } from '@/types'

interface Props {
  stages: string[]
  status: RunStatus
  logs?: { stage: string; level: string }[]
}

export function StageTrack({ stages, status, logs = [] }: Props) {
  // Determine which stages have finished based on logs
  const stagesWithSuccess = new Set(
    logs.filter(l => l.level === 'success' && l.message.startsWith('✓ Stage')).map(l => l.stage)
  )
  const stagesWithError = new Set(
    logs.filter(l => l.level === 'error').map(l => l.stage)
  )
  const activeStage = logs.length > 0 ? logs[logs.length - 1]?.stage : null

  return (
    <div className="flex items-center gap-0">
      {stages.map((stage, i) => {
        const done    = stagesWithSuccess.has(stage)
        const failed  = stagesWithError.has(stage)
        const running = !done && !failed && stage === activeStage && status === 'RUNNING'

        return (
          <div key={stage} className="flex items-center">
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all',
              done    ? 'text-success bg-success/10 border border-success/20'  :
              failed  ? 'text-danger bg-danger/10 border border-danger/20'     :
              running ? 'text-accent-2 bg-accent/10 border border-accent/20'   :
                        'text-muted bg-surface-2 border border-border'
            )}>
              <span>
                {done ? '✓' : failed ? '✕' : running ? '◉' : '○'}
              </span>
              {stage}
            </div>
            {i < stages.length - 1 && (
              <div className={cn(
                'w-6 h-px mx-1',
                done ? 'bg-success/40' : 'bg-border'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
