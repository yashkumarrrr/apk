import { getTokenFromCookie, clearAuthCookie, invalidateSession } from '@/lib/auth'
import { ok } from '@/lib/utils'

export async function POST() {
  const token = await getTokenFromCookie()
  if (token) await invalidateSession(token)
  await clearAuthCookie()
  return ok({ message: 'Logged out.' })
}
