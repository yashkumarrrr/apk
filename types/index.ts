// Shared types — Part 1, 2, 3

export type ProjectEnv    = 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION'
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'PAUSED'
export type PipelineTrigger = 'MANUAL' | 'PUSH' | 'SCHEDULE'
export type RunStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'

export interface Project {
  id: string; userId: string; name: string; slug: string
  description: string | null; env: ProjectEnv; status: ProjectStatus
  color: string; icon: string; createdAt: string; updatedAt: string
}

export interface Pipeline {
  id: string; projectId: string; userId: string; name: string
  repoUrl: string | null; branch: string; trigger: PipelineTrigger
  stages: string[]; enabled: boolean; createdAt: string; updatedAt: string
  // Part 6 auto-trigger fields
  webhookSecret?: string | null
  schedule?:      string | null
  lastScheduled?: string | null
  retryOnFail?:   boolean
  maxRetries?:    number
  envVars?:       EnvVar[]
  project?: { name: string; icon: string; color: string }
  lastRun?: PipelineRun | null
}

export interface PipelineRun {
  id: string; pipelineId: string; userId: string; status: RunStatus
  branch: string; commit: string | null; triggeredBy: string
  duration: number | null; startedAt: string | null
  finishedAt: string | null; createdAt: string
  pipeline?: { name: string }
}

export interface PipelineLog {
  id: string; runId: string; stage: string; message: string
  level: string; seq: number; createdAt: string
}

export interface AuthUser {
  id: string; name: string; email: string
  emailVerified: boolean; plan: string; avatarUrl: string | null
  createdAt?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean; data?: T; error?: string
  details?: Record<string, string[]>
}

export const ENV_LABELS: Record<ProjectEnv, string> = {
  DEVELOPMENT: 'Development', STAGING: 'Staging', PRODUCTION: 'Production',
}
export const ENV_COLORS: Record<ProjectEnv, string> = {
  DEVELOPMENT: '#3b82f6', STAGING: '#f59e0b', PRODUCTION: '#22c55e',
}
export const STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: 'Active', ARCHIVED: 'Archived', PAUSED: 'Paused',
}
export const RUN_STATUS_COLORS: Record<RunStatus, string> = {
  PENDING: '#7d8590', RUNNING: '#3b82f6', SUCCESS: '#22c55e',
  FAILED: '#ef4444', CANCELLED: '#f59e0b',
}
export const DEFAULT_STAGES = ['Install', 'Build', 'Test', 'Deploy']
export const PROJECT_ICONS  = ['⚡','🚀','🛠️','🔧','📦','🌐','🔥','💎','🎯','🖥️','☁️','🤖']
export const PROJECT_COLORS = ['#2563eb','#7c3aed','#059669','#dc2626','#d97706','#0891b2','#db2777','#65a30d']

export function slugify(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').slice(0,50)
}
export function formatDuration(s: number | null): string {
  if (!s) return '—'
  return s < 60 ? `${s}s` : `${Math.floor(s/60)}m ${s%60}s`
}
export function timeAgo(date: string | null): string {
  if (!date) return '—'
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d/60)}m ago`
  if (d < 86400) return `${Math.floor(d/3600)}h ago`
  return `${Math.floor(d/86400)}d ago`
}

// ── Part 4: Server types ──────────────────────────────────────────────────────

export type ServerStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN'
export type ServerOs     = 'UBUNTU' | 'DEBIAN' | 'CENTOS' | 'FEDORA' | 'ALPINE' | 'WINDOWS' | 'OTHER'
export type AuthType     = 'password' | 'key'

export interface Server {
  id:           string
  userId:       string
  name:         string
  host:         string
  port:         number
  username:     string
  authType:     AuthType
  os:           ServerOs
  status:       ServerStatus
  tags:         string[]
  lastPingedAt: string | null
  cpuUsage:     number | null
  memUsage:     number | null
  diskUsage:    number | null
  uptime:       number | null
  createdAt:    string
  updatedAt:    string
}

export const OS_ICONS: Record<ServerOs, string> = {
  UBUNTU:  '🟠', DEBIAN: '🔴', CENTOS: '🟣',
  FEDORA:  '🔵', ALPINE: '⛰️', WINDOWS: '🪟', OTHER: '🖥️',
}

export const OS_LABELS: Record<ServerOs, string> = {
  UBUNTU: 'Ubuntu', DEBIAN: 'Debian', CENTOS: 'CentOS',
  FEDORA: 'Fedora', ALPINE: 'Alpine', WINDOWS: 'Windows', OTHER: 'Other',
}

export function formatUptime(seconds: number | null): string {
  if (!seconds) return '—'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// ── Part 5: Monitoring types ──────────────────────────────────────────────────

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'
export type AlertState    = 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED'
export type MetricType    = 'CPU' | 'MEMORY' | 'DISK' | 'NETWORK_IN' | 'NETWORK_OUT' | 'REQUESTS' | 'ERROR_RATE' | 'LATENCY'

export interface MetricPoint { t: number; v: number }

export interface MetricSeries {
  type:   MetricType
  label:  string
  unit:   string
  color:  string
  points: MetricPoint[]
  current: number
}

export interface AlertRule {
  id:         string
  userId:     string
  name:       string
  metric:     MetricType
  serverId:   string | null
  threshold:  number
  comparator: 'gt' | 'lt' | 'eq'
  severity:   AlertSeverity
  enabled:    boolean
  createdAt:  string
  updatedAt:  string
}

export interface Alert {
  id:         string
  userId:     string
  ruleId:     string | null
  title:      string
  message:    string
  severity:   AlertSeverity
  state:      AlertState
  metric:     MetricType | null
  value:      number | null
  threshold:  number | null
  resolvedAt: string | null
  createdAt:  string
  rule?:      { name: string } | null
}

export const METRIC_META: Record<MetricType, { label: string; unit: string; color: string; max: number }> = {
  CPU:         { label: 'CPU Usage',      unit: '%',    color: '#3b82f6', max: 100 },
  MEMORY:      { label: 'Memory Usage',   unit: '%',    color: '#22c55e', max: 100 },
  DISK:        { label: 'Disk Usage',     unit: '%',    color: '#f59e0b', max: 100 },
  NETWORK_IN:  { label: 'Network In',     unit: 'MB/s', color: '#06b6d4', max: 1000 },
  NETWORK_OUT: { label: 'Network Out',    unit: 'MB/s', color: '#8b5cf6', max: 1000 },
  REQUESTS:    { label: 'Requests/s',     unit: 'req/s',color: '#ec4899', max: 10000 },
  ERROR_RATE:  { label: 'Error Rate',     unit: '%',    color: '#ef4444', max: 100 },
  LATENCY:     { label: 'Response Time',  unit: 'ms',   color: '#f97316', max: 5000 },
}

export const SEVERITY_CFG: Record<AlertSeverity, { label: string; color: string; bg: string; icon: string }> = {
  INFO:     { label: 'Info',     color: 'text-accent-2',  bg: 'bg-accent/10 border-accent/30',      icon: 'ℹ️' },
  WARNING:  { label: 'Warning',  color: 'text-warning',   bg: 'bg-warning/10 border-warning/30',    icon: '⚠️' },
  CRITICAL: { label: 'Critical', color: 'text-danger',    bg: 'bg-danger/10 border-danger/30',      icon: '🔴' },
}

// ── Part 6: Auto CI/CD types ──────────────────────────────────────────────────

export interface EnvVar {
  key:    string
  value:  string
  secret: boolean  // if true, value is masked in UI
}

export interface WebhookEvent {
  id:         string
  pipelineId: string
  source:     string
  event:      string
  branch:     string
  commit:     string | null
  actor:      string | null
  processed:  boolean
  createdAt:  string
}

// Cron presets
export const CRON_PRESETS = [
  { label: 'Every hour',        cron: '0 * * * *'    },
  { label: 'Every 6 hours',     cron: '0 */6 * * *'  },
  { label: 'Every day at 2am',  cron: '0 2 * * *'    },
  { label: 'Every day at midnight', cron: '0 0 * * *' },
  { label: 'Every Monday 9am',  cron: '0 9 * * 1'    },
  { label: 'Every Sunday 1am',  cron: '0 1 * * 0'    },
]
