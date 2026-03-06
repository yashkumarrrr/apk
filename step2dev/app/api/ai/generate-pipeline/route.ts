import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { askClaude } from '@/lib/ai'
import { ok, err } from '@/lib/utils'

const VALID_STAGES = ['Install', 'Lint', 'Type Check', 'Test', 'Build', 'Docker Build', 'Docker Push', 'Deploy']

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)

  const { description } = await req.json()
  if (!description?.trim()) return err('description required', 400)

  // Get user's projects for context
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, slug: true },
    take: 10,
  })

  const prompt = `You are helping generate a CI/CD pipeline configuration for a step2dev dashboard.

The user wants: "${description}"

Available pipeline stages (use ONLY these exact names):
${VALID_STAGES.map(s => `- ${s}`).join('\n')}

Available triggers: MANUAL, PUSH, SCHEDULE

User's projects:
${projects.map(p => `- ${p.name} (id: ${p.id})`).join('\n') || '- (none yet)'}

Generate a pipeline configuration as JSON. Return ONLY valid JSON, no markdown, no explanation, just the JSON object:

{
  "name": "descriptive pipeline name",
  "projectId": "project id from list above, or empty string if none match",
  "repoUrl": "https://github.com/... if mentioned, otherwise null",
  "branch": "main",
  "trigger": "MANUAL or PUSH or SCHEDULE",
  "stages": ["stage1", "stage2"],
  "schedule": "cron expression if SCHEDULE trigger, otherwise null",
  "retryOnFail": true or false,
  "envVars": [{"key": "KEY", "value": "value", "secret": false}],
  "explanation": "2-3 sentence explanation of what this pipeline does and why these stages were chosen"
}`

  try {
    const raw = await askClaude(
      [{ role: 'user', content: prompt }],
      undefined,
      800
    )

    // Parse the JSON out of the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return err('AI returned invalid response', 500)

    const config = JSON.parse(jsonMatch[0])

    // Validate stages
    const validatedStages = (config.stages as string[])?.filter(s => VALID_STAGES.includes(s)) ?? ['Install', 'Build']
    if (validatedStages.length === 0) validatedStages.push('Install', 'Build')

    return ok({
      pipeline: {
        name:        config.name ?? 'Generated Pipeline',
        projectId:   config.projectId ?? '',
        repoUrl:     config.repoUrl ?? null,
        branch:      config.branch ?? 'main',
        trigger:     ['MANUAL', 'PUSH', 'SCHEDULE'].includes(config.trigger) ? config.trigger : 'MANUAL',
        stages:      validatedStages,
        schedule:    config.schedule ?? null,
        retryOnFail: config.retryOnFail ?? false,
        envVars:     config.envVars ?? [],
      },
      explanation: config.explanation ?? '',
    })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Generation failed', 500)
  }
}
