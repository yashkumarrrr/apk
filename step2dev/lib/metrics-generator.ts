// Simulated metrics engine — generates realistic time-series data
// In production: pull from Prometheus, CloudWatch, Datadog, etc.

import type { MetricType, MetricPoint } from '@/types'

// Smooth random walk with mean reversion
function walk(prev: number, min: number, max: number, volatility = 3): number {
  const range = max - min
  const mean  = min + range * 0.45
  const drift = (mean - prev) * 0.05           // pull toward mean
  const noise = (Math.random() - 0.5) * volatility
  return Math.max(min, Math.min(max, prev + drift + noise))
}

// Per-metric state for continuity
const state: Record<MetricType, number> = {
  CPU:         35,
  MEMORY:      55,
  DISK:        38,
  NETWORK_IN:  12,
  NETWORK_OUT: 8,
  REQUESTS:    420,
  ERROR_RATE:  1.2,
  LATENCY:     95,
}

const RANGES: Record<MetricType, [number, number, number]> = {
  // [min, max, volatility]
  CPU:         [5,   95,  8],
  MEMORY:      [20,  90,  3],
  DISK:        [10,  95,  0.5],
  NETWORK_IN:  [0,   500, 30],
  NETWORK_OUT: [0,   300, 20],
  REQUESTS:    [10,  2000,150],
  ERROR_RATE:  [0,   15,  1],
  LATENCY:     [10,  800, 40],
}

export function getNextMetricValue(type: MetricType): number {
  const [min, max, vol] = RANGES[type]
  state[type] = walk(state[type], min, max, vol)
  return Math.round(state[type] * 10) / 10
}

// Generate historical data for the last N minutes
export function generateHistory(type: MetricType, minutes = 30): MetricPoint[] {
  const now  = Date.now()
  const step = 60_000 // 1 point per minute
  const points: MetricPoint[] = []

  // Reset to a reasonable start
  let v = state[type]
  for (let i = minutes; i >= 0; i--) {
    const [min, max, vol] = RANGES[type]
    v = walk(v, min, max, vol)
    points.push({ t: now - i * step, v: Math.round(v * 10) / 10 })
  }

  return points
}

// Spike simulation — 10% chance of a metric spike
export function maybeSpike(type: MetricType): void {
  if (Math.random() < 0.10) {
    const [, max] = RANGES[type]
    state[type] = max * (0.8 + Math.random() * 0.2)
  }
}
