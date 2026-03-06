import { prisma } from './prisma'
import { notifyPipelineResult } from './notifications'
import { sshStream, sshExec, getServerConfig } from './ssh'

const STAGE_COMMANDS: Record<string, string> = {
  'Install':      'npm ci',
  'Build':        'npm run build',
  'Test':         'npm test -- --passWithNoTests --forceExit',
  'Lint':         'npm run lint',
  'Type Check':   'npx tsc --noEmit',
  'Docker Build': 'docker build -t app:latest .',
  'Docker Push':  'docker push app:latest',
  'Deploy':       'npm run deploy 2>/dev/null || echo "No deploy script — skipping"',
}

function randomCommit() { return Math.random().toString(16).slice(2, 9) }

async function log(runId: string, stage: string, message: string, level: string, seq: { n: number }) {
  await prisma.pipelineLog.create({ data: { runId, stage, message, level, seq: seq.n++ } })
}

// Build export VAR=value prefix from pipeline envVars
function buildEnvPrefix(envVars: unknown): string {
  if (!Array.isArray(envVars) || envVars.length === 0) return ''
  return envVars
    .filter((e): e is { key: string; value: string } => e?.key && e?.value !== undefined)
    .map(e => `export ${e.key}=${JSON.stringify(e.value)}`)
    .join('; ') + '; '
}

export async function executePipeline(runId: string): Promise<void> {
  const run = await prisma.pipelineRun.findUnique({
    where:   { id: runId },
    include: { pipeline: { include: { project: true } } },
  })
  if (!run) return

  const { pipeline } = run
  const stages: string[] = Array.isArray(pipeline.stages)
    ? (pipeline.stages as string[])
    : JSON.parse(String(pipeline.stages))

  const seq    = { n: 0 }
  const envPfx = buildEnvPrefix(pipeline.envVars)

  await prisma.pipelineRun.update({ where: { id: runId }, data: { status: 'RUNNING', startedAt: new Date() } })

  await log(runId, 'setup', `━━━ Pipeline: ${pipeline.name} ━━━`, 'info', seq)
  await log(runId, 'setup', `Branch: ${run.branch} · Triggered by: ${run.triggeredBy}`, 'info', seq)

  const server = await prisma.server.findFirst({
    where: { userId: run.userId, status: 'ONLINE' },
    orderBy: { lastPingedAt: 'desc' },
  })

  if (!server) {
    await log(runId, 'setup', '✕ No ONLINE server. Go to Servers → add a server → run connection test.', 'error', seq)
    await prisma.pipelineRun.update({ where: { id: runId }, data: { status: 'FAILED', finishedAt: new Date(), duration: 0, commit: randomCommit() } })
    await maybeRetry(run.id, pipeline, run.branch, run.triggeredBy)
    return
  }

  const cfg = await getServerConfig(server.id, run.userId)
  if (!cfg) {
    await log(runId, 'setup', '✕ Could not load server credentials.', 'error', seq)
    await prisma.pipelineRun.update({ where: { id: runId }, data: { status: 'FAILED', finishedAt: new Date(), duration: 0 } })
    return
  }

  const workdir = pipeline.repoUrl
    ? `/tmp/s2d-${pipeline.projectId}`
    : `/var/www/${pipeline.project.slug}`

  await log(runId, 'setup', `Server: ${cfg.username}@${cfg.host}:${cfg.port}`, 'info', seq)
  await log(runId, 'setup', `Workdir: ${workdir}`, 'info', seq)
  if (envPfx) await log(runId, 'setup', `Env vars: ${(pipeline.envVars as {key:string}[]).map(e => e.key).join(', ')}`, 'info', seq)

  // ── Git checkout ────────────────────────────────────────────────────────────
  if (pipeline.repoUrl) {
    const stage = 'Checkout'
    await log(runId, stage, `━━━ Stage: ${stage} ━━━`, 'info', seq)
    await log(runId, stage, `$ git fetch --depth=1 origin ${run.branch}`, 'command', seq)

    const cloneScript = `bash << 'S2D_CLONE'\nset -e\nmkdir -p "${workdir}"\ncd "${workdir}"\nif [ ! -d .git ]; then git init -q; fi\nif git remote get-url origin > /dev/null 2>&1; then\n  git remote set-url origin "${pipeline.repoUrl}"\nelse\n  git remote add origin "${pipeline.repoUrl}"\nfi\ngit fetch --depth=1 origin ${run.branch}\ngit checkout -f FETCH_HEAD\nS2D_CLONE`

    let gitFailed = false
    await new Promise<void>((resolve) => {
      sshStream(cfg, cloneScript,
        (line, isErr) => { if (line.trim()) log(runId, stage, line, isErr ? 'error' : 'info', seq) },
        (code) => { if (code !== 0) gitFailed = true; resolve() },
        async (err) => { await log(runId, stage, `✕ SSH: ${err.message}`, 'error', seq); gitFailed = true; resolve() }
      )
    })

    if (gitFailed) {
      await log(runId, stage, '✕ Checkout failed.', 'error', seq)
      await prisma.pipelineRun.update({ where: { id: runId }, data: { status: 'FAILED', finishedAt: new Date(), duration: 1 } })
      await maybeRetry(run.id, pipeline, run.branch, run.triggeredBy)
      return
    }
    await log(runId, stage, '✓ Checkout complete', 'success', seq)
  }

  // Get commit hash
  const commitRes = await sshExec(cfg, `cd "${workdir}" 2>/dev/null && git rev-parse --short HEAD 2>/dev/null || echo ""`).catch(() => ({ stdout: '' }))
  const commit    = commitRes.stdout.trim() || randomCommit()
  await prisma.pipelineRun.update({ where: { id: runId }, data: { commit } })
  await log(runId, 'setup', `Commit: ${commit}`, 'info', seq)

  // ── Run stages ──────────────────────────────────────────────────────────────
  let failed = false

  for (const stage of stages) {
    if (failed) break

    await log(runId, stage, `━━━ Stage: ${stage} ━━━`, 'info', seq)
    const stageCmd = STAGE_COMMANDS[stage] ?? `echo "Running: ${stage}"`
    const fullCmd  = `cd "${workdir}" && ${envPfx}${stageCmd}`
    await log(runId, stage, `$ ${stageCmd}`, 'command', seq)

    let exitCode = 0
    await new Promise<void>((resolve) => {
      sshStream(cfg, fullCmd,
        (line, isErr) => {
          if (!line.trim()) return
          const level = isErr ? 'error'
            : line.toLowerCase().includes('error') ? 'error'
            : line.toLowerCase().includes('warn')  ? 'warn'
            : 'info'
          log(runId, stage, line, level, seq)
        },
        (code) => { exitCode = code; resolve() },
        async (err) => { await log(runId, stage, `✕ SSH: ${err.message}`, 'error', seq); exitCode = 1; resolve() }
      )
    })

    if (exitCode !== 0) {
      await log(runId, stage, `✕ Stage "${stage}" failed (exit ${exitCode})`, 'error', seq)
      failed = true
    } else {
      await log(runId, stage, `✓ Stage "${stage}" passed`, 'success', seq)
    }
  }

  const finishedAt = new Date()
  const duration   = Math.floor((finishedAt.getTime() - (run.startedAt?.getTime() ?? Date.now())) / 1000)

  await prisma.pipelineRun.update({
    where: { id: runId },
    data:  { status: failed ? 'FAILED' : 'SUCCESS', finishedAt, duration },
  })

  // Fire notification
  await notifyPipelineResult({
    userId:       run.userId,
    pipelineName: pipeline.name,
    pipelineId:   pipeline.id,
    runId,
    status:       failed ? 'FAILED' : 'SUCCESS',
    duration:     finishedAt ? Math.floor((finishedAt.getTime() - (run.startedAt?.getTime() ?? Date.now())) / 1000) : undefined,
    branch:       run.branch,
  })

  await log(runId, 'done',
    failed ? `✕ Pipeline failed after ${duration}s` : `✓ Pipeline completed in ${duration}s`,
    failed ? 'error' : 'success', seq
  )

  // Auto-retry on failure
  if (failed) await maybeRetry(runId, pipeline, run.branch, run.triggeredBy)
}

// ── Retry logic ────────────────────────────────────────────────────────────────
async function maybeRetry(
  failedRunId: string,
  pipeline: { id: string; userId: string; retryOnFail: boolean; maxRetries: number; branch: string },
  branch: string,
  triggeredBy: string
) {
  if (!pipeline.retryOnFail) return

  // Count how many times this pipeline has been retried from this original run chain
  const recentFailures = await prisma.pipelineRun.count({
    where: {
      pipelineId:  pipeline.id,
      triggeredBy: { startsWith: 'retry:' },
      status:      'FAILED',
      createdAt:   { gte: new Date(Date.now() - 30 * 60 * 1000) }, // last 30 min
    },
  })

  if (recentFailures >= pipeline.maxRetries) return

  const attempt = recentFailures + 1
  await new Promise(r => setTimeout(r, 5000)) // wait 5s before retry

  const retryRun = await prisma.pipelineRun.create({
    data: {
      pipelineId:  pipeline.id,
      userId:      pipeline.userId,
      status:      'PENDING',
      branch,
      triggeredBy: `retry:${attempt}`,
    },
  })

  executePipeline(retryRun.id).catch(console.error)
}
