import { prisma } from './prisma'

interface NotifInput {
  userId: string
  type:   string
  title:  string
  body:   string
  link?:  string
  icon?:  string
}

export async function createNotification(input: NotifInput): Promise<void> {
  try {
    await prisma.notification.create({ data: input })
  } catch {
    // Never let notification failures break the caller
  }
}

// ── Convenience helpers ───────────────────────────────────────────────────────

export async function notifyPipelineResult(opts: {
  userId:       string
  pipelineName: string
  pipelineId:   string
  runId:        string
  status:       'SUCCESS' | 'FAILED'
  duration?:    number
  branch?:      string
}) {
  const isOk   = opts.status === 'SUCCESS'
  const dur    = opts.duration ? ` in ${opts.duration}s` : ''
  const branch = opts.branch ? ` (${opts.branch})` : ''

  await createNotification({
    userId: opts.userId,
    type:   isOk ? 'pipeline_success' : 'pipeline_fail',
    title:  isOk ? `✓ ${opts.pipelineName} passed` : `✕ ${opts.pipelineName} failed`,
    body:   isOk
      ? `Build completed successfully${branch}${dur}.`
      : `Build failed${branch}. Check logs for details.`,
    link:   `/dashboard/pipelines/${opts.pipelineId}`,
    icon:   isOk ? '✅' : '❌',
  })
}

export async function notifyServerOffline(opts: {
  userId:     string
  serverId:   string
  serverName: string
}) {
  await createNotification({
    userId: opts.userId,
    type:   'server_offline',
    title:  `🔴 ${opts.serverName} is offline`,
    body:   'The server stopped responding. Check your connection and server status.',
    link:   `/dashboard/servers/${opts.serverId}`,
    icon:   '🔴',
  })
}

export async function notifyAlertFired(opts: {
  userId:    string
  alertName: string
  metric:    string
  value:     number
  threshold: number
}) {
  await createNotification({
    userId: opts.userId,
    type:   'alert_fired',
    title:  `⚠️ Alert: ${opts.alertName}`,
    body:   `${opts.metric} reached ${opts.value.toFixed(1)} (threshold: ${opts.threshold}).`,
    link:   '/dashboard/monitoring',
    icon:   '⚠️',
  })
}
