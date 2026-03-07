'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('[Step2Dev Error]', error)
  }, [error])

  const isDbError =
    error.message?.toLowerCase().includes('prisma') ||
    error.message?.toLowerCase().includes('database') ||
    error.message?.toLowerCase().includes('connect') ||
    error.message?.toLowerCase().includes('p1001') ||
    error.message?.toLowerCase().includes('p1003')

  return (
    <html lang="en">
      <body className="bg-[#080c10] text-[#e6edf3] font-mono min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-6">{isDbError ? '🗄️' : '💥'}</div>
          <h1 className="text-2xl font-bold mb-2">
            {isDbError ? 'Database Error' : 'Something went wrong'}
          </h1>
          <p className="text-[#8b949e] text-sm mb-2 leading-relaxed">
            {isDbError
              ? 'Step2Dev cannot connect to the database. Check your DATABASE_URL and make sure PostgreSQL is running.'
              : error.message || 'An unexpected error occurred.'}
          </p>
          {error.digest && (
            <p className="text-[10px] text-[#8b949e]/40 mb-6">Error ID: {error.digest}</p>
          )}
          <div className="flex gap-3 justify-center mt-6">
            {isDbError && (
              <button
                onClick={() => router.push('/setup')}
                className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm rounded-xl transition-all"
              >
                Open Setup Guide
              </button>
            )}
            <button
              onClick={reset}
              className="px-5 py-2.5 bg-[#21262d] border border-[#30363d] hover:border-[#8b949e] text-[#e6edf3] text-sm rounded-xl transition-all"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-5 py-2.5 border border-[#30363d] hover:border-[#8b949e] text-[#8b949e] hover:text-white text-sm rounded-xl transition-all"
            >
              Home
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
