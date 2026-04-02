import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { askClaude } from '@/lib/ai'
import { ok, err } from '@/lib/utils'

#hello
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)

  const { runId } = await req.json()
  if (!runId) return err('runId required', 400)

  // Fetch the run + its logs
  const run = await prisma.pipelineRun.findFirst({
    where:   { id: runId, userId: user.id },
    include: {
      pipeline: { select: { name: true, stages: true } },
      logs:     { orderBy: { seq: 'asc' }, take: 300 },
    },
  })
  if (!run) return err('Run not found', 404)

  // Format logs as a single text block
  const logText = run.logs
    .map(l => `[${l.stage}] ${l.level.toUpperCase()}: ${l.message}`)
    .join('\n')

  const pipelineName = run.pipeline.name
  const status       = run.status
  const duration     = run.duration ? `${run.duration}s` : 'N/A'

  const prompt = `Analyze this CI/CD pipeline run and provide a clear diagnosis.

Pipeline: ${pipelineName}
Status: ${status}
Duration: ${duration}
Branch: ${run.branch}
Commit: ${run.commit ?? 'unknown'}

Full logs:
\`\`\`
${logText.slice(0, 8000)}
\`\`\`

${status === 'FAILED'
  ? 'The pipeline FAILED. Identify: (1) the exact error, (2) which stage failed and why, (3) the specific fix with the exact commands to run.'
  : status === 'SUCCESS'
  ? 'The pipeline succeeded. Note: anything that looks slow, any warnings to address, and overall health assessment.'
  : 'The pipeline is still running or in an unknown state. Describe what has happened so far.'
}

Be specific — reference the actual error messages from the logs above.`

  try {
    const analysis = await askClaude(
      [{ role: 'user', content: prompt }],
      undefined,
      1500
    )
    return ok({ analysis, runId, status })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'AI analysis failed', 500)
  }
}
