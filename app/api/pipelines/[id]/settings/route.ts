import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { ok, err } from '@/lib/utils'
import { z } from 'zod'
import crypto from 'crypto'

type Ctx = { params: Promise<{ id: string }> }

const settingsSchema = z.object({
  // Auto-trigger
  trigger:       z.enum(['MANUAL', 'PUSH', 'SCHEDULE']).optional(),
  schedule:      z.string().nullable().optional(),
  repoUrl:       z.string().url().optional().or(z.literal('')).nullable(),
  branch:        z.string().optional(),

  // Retry
  retryOnFail:   z.boolean().optional(),
  maxRetries:    z.number().int().min(1).max(10).optional(),

  // Env vars
  envVars:       z.array(z.object({
    key:    z.string().min(1),
    value:  z.string(),
    secret: z.boolean().default(false),
  })).optional(),

  // Webhook secret — pass 'generate' to auto-generate a new one, null to clear
  webhookSecret: z.string().nullable().optional(),
})

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params

  const pipeline = await prisma.pipeline.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true, name: true, trigger: true, repoUrl: true, branch: true,
      schedule: true, lastScheduled: true,
      retryOnFail: true, maxRetries: true,
      webhookSecret: true,
      envVars: true,
      enabled: true,
    },
  })
  if (!pipeline) return err('Pipeline not found', 404)

  // Mask secret values in env vars before sending to client
  const maskedEnvVars = Array.isArray(pipeline.envVars)
    ? (pipeline.envVars as { key: string; value: string; secret: boolean }[]).map(e => ({
        key:    e.key,
        value:  e.secret ? '••••••••' : e.value,
        secret: e.secret,
      }))
    : []

  return ok({ settings: { ...pipeline, envVars: maskedEnvVars } })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params

  const existing = await prisma.pipeline.findFirst({ where: { id, userId: user.id } })
  if (!existing) return err('Pipeline not found', 404)

  const body   = await req.json()
  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) return err('Validation failed', 422, parsed.error.flatten().fieldErrors)

  const updates: Record<string, unknown> = {}

  if (parsed.data.trigger    !== undefined) updates.trigger    = parsed.data.trigger
  if (parsed.data.schedule   !== undefined) updates.schedule   = parsed.data.schedule
  if (parsed.data.repoUrl    !== undefined) updates.repoUrl    = parsed.data.repoUrl || null
  if (parsed.data.branch     !== undefined) updates.branch     = parsed.data.branch
  if (parsed.data.retryOnFail !== undefined) updates.retryOnFail = parsed.data.retryOnFail
  if (parsed.data.maxRetries !== undefined) updates.maxRetries = parsed.data.maxRetries

  // Handle webhook secret
  if (parsed.data.webhookSecret === 'generate') {
    updates.webhookSecret = crypto.randomBytes(32).toString('hex')
  } else if (parsed.data.webhookSecret === null) {
    updates.webhookSecret = null
  }

  // Handle env vars — preserve existing secret values if the masked placeholder is sent
  if (parsed.data.envVars !== undefined) {
    const existingEnvVars = Array.isArray(existing.envVars)
      ? (existing.envVars as { key: string; value: string; secret: boolean }[])
      : []

    updates.envVars = parsed.data.envVars.map(e => {
      // If it's a secret and value is the mask placeholder, keep existing value
      if (e.secret && e.value === '••••••••') {
        const prev = existingEnvVars.find(x => x.key === e.key)
        return { key: e.key, value: prev?.value ?? '', secret: true }
      }
      return e
    })
  }

  const updated = await prisma.pipeline.update({
    where: { id },
    data:  updates,
    select: {
      id: true, name: true, trigger: true, repoUrl: true, branch: true,
      schedule: true, lastScheduled: true,
      retryOnFail: true, maxRetries: true,
      webhookSecret: true,
      envVars: true,
    },
  })

  const maskedEnvVars = Array.isArray(updated.envVars)
    ? (updated.envVars as { key: string; value: string; secret: boolean }[]).map(e => ({
        key:    e.key,
        value:  e.secret ? '••••••••' : e.value,
        secret: e.secret,
      }))
    : []

  return ok({ settings: { ...updated, envVars: maskedEnvVars } })
}
