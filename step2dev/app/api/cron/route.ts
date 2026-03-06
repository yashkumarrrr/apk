import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { executePipeline } from '@/lib/pipeline-runner'

// Called by Vercel Cron every minute: GET /api/cron
// Configure in vercel.json:
// { "crons": [{ "path": "/api/cron", "schedule": "* * * * *" }] }
//
// Also callable manually for testing: GET /api/cron?secret=<CRON_SECRET>

function matchesCron(cron: string, now: Date): boolean {
  // Parse standard 5-part cron: minute hour dom month dow
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return false

  const [minStr, hourStr, domStr, monStr, dowStr] = parts

  const minute = now.getUTCMinutes()
  const hour   = now.getUTCHours()
  const dom    = now.getUTCDate()
  const month  = now.getUTCMonth() + 1
  const dow    = now.getUTCDay()

  function matchField(field: string, value: number): boolean {
    if (field === '*') return true
    if (field.includes('/')) {
      const [, step] = field.split('/')
      return value % parseInt(step) === 0
    }
    if (field.includes('-')) {
      const [lo, hi] = field.split('-').map(Number)
      return value >= lo && value <= hi
    }
    if (field.includes(',')) {
      return field.split(',').map(Number).includes(value)
    }
    return parseInt(field) === value
  }

  return (
    matchField(minStr,  minute) &&
    matchField(hourStr, hour)   &&
    matchField(domStr,  dom)    &&
    matchField(monStr,  month)  &&
    matchField(dowStr,  dow)
  )
}

export async function GET(req: NextRequest) {
  // Protect the endpoint
  const secret      = req.nextUrl.searchParams.get('secret')
  const cronSecret  = process.env.CRON_SECRET
  const isVercel    = req.headers.get('x-vercel-cron') === '1'

  if (!isVercel && cronSecret && secret !== cronSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const now = new Date()

  // Find all enabled pipelines with a schedule that haven't run in this minute
  const pipelines = await prisma.pipeline.findMany({
    where: {
      enabled:  true,
      trigger:  'SCHEDULE',
      schedule: { not: null },
    },
  })

  const triggered: string[] = []
  const skipped:   string[] = []

  for (const pipeline of pipelines) {
    if (!pipeline.schedule) continue

    // Check if this cron expression matches now
    if (!matchesCron(pipeline.schedule, now)) {
      skipped.push(pipeline.name)
      continue
    }

    // Avoid double-triggering: check if already ran in this minute
    const thisMinute = new Date(now)
    thisMinute.setUTCSeconds(0, 0)
    const nextMinute = new Date(thisMinute.getTime() + 60_000)

    const recentRun = await prisma.pipelineRun.findFirst({
      where: {
        pipelineId:  pipeline.id,
        triggeredBy: 'schedule',
        createdAt:   { gte: thisMinute, lt: nextMinute },
      },
    })

    if (recentRun) {
      skipped.push(`${pipeline.name} (already ran this minute)`)
      continue
    }

    // Create run and fire async
    const run = await prisma.pipelineRun.create({
      data: {
        pipelineId:  pipeline.id,
        userId:      pipeline.userId,
        status:      'PENDING',
        branch:      pipeline.branch,
        triggeredBy: 'schedule',
      },
    })

    // Update lastScheduled
    await prisma.pipeline.update({
      where: { id: pipeline.id },
      data:  { lastScheduled: now },
    })

    executePipeline(run.id).catch(console.error)
    triggered.push(`${pipeline.name} → run ${run.id}`)
  }

  return Response.json({
    ok:        true,
    time:      now.toISOString(),
    triggered,
    skipped,
  })
}
