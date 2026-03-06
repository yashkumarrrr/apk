import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { executePipeline } from '@/lib/pipeline-runner'
import crypto from 'crypto'

// Verify GitHub HMAC-SHA256 signature
function verifySignature(secret: string, body: string, signature: string): boolean {
  if (!signature.startsWith('sha256=')) return false
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const event     = req.headers.get('x-github-event') ?? ''
  const signature = req.headers.get('x-hub-signature-256') ?? ''
  const deliveryId = req.headers.get('x-github-delivery') ?? ''

  // We need the raw body for signature verification
  const rawBody = await req.text()
  let payload: Record<string, unknown>

  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Only handle push events for now
  if (event !== 'push' && event !== 'ping') {
    return new Response('Event not handled', { status: 200 })
  }

  if (event === 'ping') {
    return Response.json({ ok: true, message: 'Webhook connected!' })
  }

  // Extract push info
  const ref    = (payload.ref as string) ?? ''
  const branch = ref.replace('refs/heads/', '')
  const commit = (payload.after as string)?.slice(0, 7) ?? null
  const actor  = (payload.pusher as { name?: string })?.name ?? null
  const repoUrl = (payload.repository as { clone_url?: string })?.clone_url ?? null

  // Find ALL pipelines that match this repo + branch
  // Match by repoUrl (strip .git suffix for comparison) and branch
  const normalizeUrl = (u: string) => u?.replace(/\.git$/, '').toLowerCase().trim()
  const incomingRepo = normalizeUrl(repoUrl ?? '')

  const pipelines = await prisma.pipeline.findMany({
    where: {
      enabled: true,
      trigger: { in: ['PUSH', 'SCHEDULE'] }, // PUSH or any enabled
    },
  })

  const matched = pipelines.filter(p => {
    if (!p.repoUrl) return false
    const repoMatch   = normalizeUrl(p.repoUrl) === incomingRepo
    const branchMatch = p.branch === branch || p.branch === '*'
    return repoMatch && branchMatch
  })

  if (matched.length === 0) {
    return Response.json({ ok: true, message: 'No matching pipelines', branch, repo: incomingRepo })
  }

  const results: string[] = []

  for (const pipeline of matched) {
    // Verify HMAC signature if webhook secret is set
    if (pipeline.webhookSecret) {
      if (!verifySignature(pipeline.webhookSecret, rawBody, signature)) {
        results.push(`${pipeline.id}: signature mismatch — skipped`)
        continue
      }
    }

    // Log the webhook event
    await prisma.webhookEvent.create({
      data: {
        userId:     pipeline.userId,
        pipelineId: pipeline.id,
        source:     'github',
        event,
        branch,
        commit,
        actor,
        payload:    payload as Record<string, unknown>,
        processed:  true,
      },
    })

    // Create a pipeline run
    const run = await prisma.pipelineRun.create({
      data: {
        pipelineId:  pipeline.id,
        userId:      pipeline.userId,
        status:      'PENDING',
        branch,
        commit,
        triggeredBy: actor ? `github:${actor}` : 'github:push',
      },
    })

    // Fire async — don't await so webhook returns fast
    executePipeline(run.id).catch(console.error)

    results.push(`${pipeline.name}: run ${run.id} started`)
  }

  return Response.json({
    ok:      true,
    delivery: deliveryId,
    branch,
    commit,
    triggered: results,
  })
}
