import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateToken(length = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < length; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

export function tokenExpiry(hours = 24): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

export function isExpired(date: Date | null | undefined): boolean {
  if (!date) return true
  return date < new Date()
}

export function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
}

export function getUA(request: Request): string {
  return request.headers.get('user-agent') ?? 'unknown'
}

export function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status })
}

export function err(message: string, status = 400, details?: unknown) {
  return Response.json(
    { success: false, error: message, ...(details ? { details } : {}) },
    { status }
  )
}
