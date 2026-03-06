import { NextResponse } from 'next/server'

interface Check {
  name:     string
  ok:       boolean
  message:  string
  fix?:     string
  optional?: boolean
}

export async function GET() {
  const checks: Check[] = []

  // ── 1. DATABASE_URL ────────────────────────────────────────────────────────
  const dbUrl = process.env.DATABASE_URL
  checks.push({
    name:    'DATABASE_URL',
    ok:      !!dbUrl,
    message: dbUrl ? 'Environment variable is set' : 'Not set in .env',
    fix:     !dbUrl ? 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/step2dev"' : undefined,
  })

  // ── 2. Database connection ─────────────────────────────────────────────────
  if (dbUrl) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.$queryRaw`SELECT 1`
      checks.push({ name: 'Database connection', ok: true, message: 'Connected successfully' })

      // ── 3. Schema ──────────────────────────────────────────────────────────
      try {
        await prisma.user.count()
        checks.push({ name: 'Database schema', ok: true, message: 'Tables exist and are ready' })
      } catch {
        checks.push({
          name:    'Database schema',
          ok:      false,
          message: 'Tables missing — run prisma db push to create them',
          fix:     'npx prisma db push',
        })
      }
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e)
      // Trim verbose Prisma error to just the useful part
      const msg = raw.split('\n')[0].slice(0, 140)
      checks.push({
        name:    'Database connection',
        ok:      false,
        message: `Cannot connect: ${msg}`,
        fix:     'Make sure PostgreSQL is running and DATABASE_URL is correct',
      })
      checks.push({ name: 'Database schema', ok: false, message: 'Skipped — database unreachable' })
    }
  } else {
    checks.push({ name: 'Database connection', ok: false, message: 'Skipped — DATABASE_URL not set' })
    checks.push({ name: 'Database schema',     ok: false, message: 'Skipped — DATABASE_URL not set' })
  }

  // ── 4. JWT_SECRET ──────────────────────────────────────────────────────────
  const jwt = process.env.JWT_SECRET
  const jwtOk = !!jwt && jwt.length >= 32
  checks.push({
    name:    'JWT_SECRET',
    ok:      jwtOk,
    message: !jwt
      ? 'Not set — auth will use an insecure default'
      : jwt.length < 32
      ? `Too short (${jwt.length} chars, need 32+)`
      : 'Set and valid',
    fix: !jwtOk
      ? 'node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"  → paste into .env as JWT_SECRET'
      : undefined,
  })

  // ── Optional: ANTHROPIC_API_KEY ────────────────────────────────────────────
  const ak = process.env.ANTHROPIC_API_KEY
  checks.push({
    name:     'ANTHROPIC_API_KEY',
    ok:       !!ak && ak.startsWith('sk-ant-'),
    message:  !ak ? 'Not set — AI Assistant disabled' : ak.startsWith('sk-ant-') ? 'Set and valid' : 'Invalid format (should start with sk-ant-)',
    fix:      !ak ? 'Get a free key at console.anthropic.com — paste into .env as ANTHROPIC_API_KEY' : undefined,
    optional: true,
  })

  // ── Optional: RESEND_API_KEY ───────────────────────────────────────────────
  const rk = process.env.RESEND_API_KEY
  checks.push({
    name:     'RESEND_API_KEY',
    ok:       !!rk,
    message:  rk ? 'Set — email verification enabled' : 'Not set — email verification skipped (users auto-verified)',
    fix:      !rk ? 'Get a free key at resend.com — paste into .env as RESEND_API_KEY' : undefined,
    optional: true,
  })

  const criticalOk = checks.filter(c => !c.optional).every(c => c.ok)

  return NextResponse.json({
    ok:     criticalOk,
    ready:  criticalOk,
    checks,
    env:    process.env.NODE_ENV ?? 'development',
  })
}
