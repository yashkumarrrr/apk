'use client'
import { useMemo } from 'react'
import type { MetricPoint } from '@/types'

interface Props {
  points:  MetricPoint[]
  color:   string
  height?: number
  width?:  number
  fill?:   boolean
  showGrid?: boolean
  threshold?: number
}

export function MetricChart({
  points, color,
  height = 80, width = 300,
  fill = true, showGrid = false,
  threshold,
}: Props) {
  const { path, fillPath, thresholdY } = useMemo(() => {
    if (points.length < 2) return { path: '', fillPath: '', thresholdY: null }

    const vals  = points.map(p => p.v)
    const min   = Math.min(...vals) * 0.9
    const max   = Math.max(...vals) * 1.1 || 1
    const range = max - min || 1
    const pad   = 4

    const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (width - pad * 2))
    const ys = points.map(p => height - pad - ((p.v - min) / range) * (height - pad * 2))

    // Smooth bezier
    const segments = xs.map((x, i) => {
      if (i === 0) return `M ${x},${ys[i]}`
      const cpx1 = xs[i - 1] + (x - xs[i - 1]) * 0.5
      return `C ${cpx1},${ys[i - 1]} ${cpx1},${ys[i]} ${x},${ys[i]}`
    })

    const p    = segments.join(' ')
    const last = xs[xs.length - 1]
    const fp   = `${p} L ${last},${height - pad} L ${pad},${height - pad} Z`

    const ty = threshold !== undefined
      ? height - pad - ((threshold - min) / range) * (height - pad * 2)
      : null

    return { path: p, fillPath: fp, thresholdY: ty }
  }, [points, width, height, threshold])

  const id = `grad-${color.replace('#', '')}`

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {showGrid && [0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={0} x2={width} y1={height * f} y2={height * f}
          stroke="#30363d" strokeWidth="1" />
      ))}

      {fill && fillPath && (
        <path d={fillPath} fill={`url(#${id})`} />
      )}

      {path && (
        <path d={path} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      )}

      {thresholdY !== null && (
        <line x1={0} x2={width} y1={thresholdY} y2={thresholdY}
          stroke="#ef4444" strokeWidth="1" strokeDasharray="4,3" opacity="0.7" />
      )}
    </svg>
  )
}
