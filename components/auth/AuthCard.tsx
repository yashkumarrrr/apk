import Link from 'next/link'

interface Props {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthCard({ title, subtitle, children, footer }: Props) {
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-bg overflow-hidden px-4 py-12">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[440px] bg-surface border border-border rounded-2xl p-10 shadow-[0_32px_64px_rgba(0,0,0,0.5)] animate-fade-up fill-both">
        <Link href="/" className="block mb-8 font-display font-black text-xl tracking-tight hover:text-accent-2 transition-colors">
          Step2Dev
        </Link>

        <div className="mb-7">
          <h2 className="font-display font-bold text-2xl mb-1.5">{title}</h2>
          {subtitle && <p className="text-muted text-sm leading-relaxed">{subtitle}</p>}
        </div>

        <div>{children}</div>

        {footer && <div className="mt-6 pt-6 border-t border-border">{footer}</div>}
      </div>
    </main>
  )
}
