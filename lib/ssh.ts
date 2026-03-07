import { Client, type ConnectConfig, type ClientChannel } from 'ssh2'
import { prisma } from './prisma'

export interface SshConfig {
  host:        string
  port:        number
  username:    string
  authType:    string
  password?:   string | null
  privateKey?: string | null
}

export interface SshExecResult {
  stdout:   string
  stderr:   string
  code:     number
  duration: number
}

function buildConfig(cfg: SshConfig): ConnectConfig {
  const base: ConnectConfig = {
    host:              cfg.host,
    port:              cfg.port,
    username:          cfg.username,
    readyTimeout:      15000,
    keepaliveInterval: 0,
    // Accept any host key for now — in production store & verify fingerprints
    hostVerifier:      () => true,
  }
  if (cfg.authType === 'key' && cfg.privateKey) {
    return { ...base, privateKey: cfg.privateKey }
  }
  return { ...base, password: cfg.password ?? undefined }
}

// ── Run a command and collect all output ─────────────────────────────────────
export function sshExec(cfg: SshConfig, command: string): Promise<SshExecResult> {
  return new Promise((resolve, reject) => {
    const conn  = new Client()
    const start = Date.now()
    let out = '', err = ''

    conn.on('ready', () => {
      conn.exec(command, (e, stream) => {
        if (e) { conn.end(); return reject(e) }
        stream.on('close', (code: number) => {
          conn.end()
          resolve({ stdout: out, stderr: err, code: code ?? 0, duration: Date.now() - start })
        })
        stream.on('data',          (d: Buffer) => { out += d.toString() })
        stream.stderr.on('data',   (d: Buffer) => { err += d.toString() })
      })
    })
    conn.on('error', reject)
    conn.connect(buildConfig(cfg))
  })
}

// ── Stream a command's output line-by-line ────────────────────────────────────
export function sshStream(
  cfg:     SshConfig,
  command: string,
  onLine:  (line: string, isErr: boolean) => void,
  onClose: (code: number) => void,
  onError: (err: Error) => void,
): () => void {
  const conn = new Client()
  let done   = false

  conn.on('ready', () => {
    conn.exec(command, (e, stream) => {
      if (e) { conn.end(); return onError(e) }

      let outBuf = '', errBuf = ''

      function flush(buf: string, isErr: boolean): string {
        const lines = buf.split('\n')
        for (let i = 0; i < lines.length - 1; i++) onLine(lines[i], isErr)
        return lines[lines.length - 1]
      }

      stream.on('data',        (d: Buffer) => { outBuf = flush(outBuf + d.toString(), false) })
      stream.stderr.on('data', (d: Buffer) => { errBuf = flush(errBuf + d.toString(), true) })
      stream.on('close', (code: number) => {
        if (outBuf) onLine(outBuf, false)
        if (errBuf) onLine(errBuf, true)
        if (!done) { done = true; conn.end(); onClose(code ?? 0) }
      })
    })
  })

  conn.on('error', (e) => { if (!done) { done = true; onError(e) } })
  conn.connect(buildConfig(cfg))

  return () => { if (!done) { done = true; conn.end() } }
}

// ── Test connectivity and collect system stats in one round-trip ──────────────
// Uses a heredoc to avoid all quoting issues
export async function sshTestConnection(cfg: SshConfig): Promise<{
  success:  boolean
  latency:  number
  error?:   string
  stats?: { cpu: number; mem: number; disk: number; uptime: number; os: string }
}> {
  const start = Date.now()

  // Write script to a temp file via heredoc, run it, then delete it
  // This avoids ALL shell-escaping problems
  const command = `
bash << 'STEP2DEV_SCRIPT'
# CPU usage over 0.3s sample
cpu_idle1=$(awk '/^cpu /{print $5+$6}' /proc/stat)
cpu_total1=$(awk '/^cpu /{s=0; for(i=2;i<=NF;i++) s+=$i; print s}' /proc/stat)
sleep 0.3
cpu_idle2=$(awk '/^cpu /{print $5+$6}' /proc/stat)
cpu_total2=$(awk '/^cpu /{s=0; for(i=2;i<=NF;i++) s+=$i; print s}' /proc/stat)
dt=$((cpu_total2 - cpu_total1))
di=$((cpu_idle2 - cpu_idle1))
if [ "$dt" -gt 0 ]; then
  CPU=$(awk "BEGIN{printf \"%.1f\", 100*($dt-$di)/$dt}")
else
  CPU=0
fi

# Memory
MEM=$(awk '/MemTotal/{t=$2} /MemAvailable/{a=$2} END{printf "%.1f", 100*(t-a)/t}' /proc/meminfo 2>/dev/null || echo 0)

# Disk
DISK=$(df / 2>/dev/null | awk 'NR==2{gsub(/%/,"",$5); print $5}' || echo 0)

# Uptime seconds
UPTIME=$(awk '{printf "%d",$1}' /proc/uptime 2>/dev/null || echo 0)

# OS
OS=$(grep PRETTY_NAME /etc/os-release 2>/dev/null | sed 's/PRETTY_NAME=//;s/"//g' || uname -sr)

printf "%s|%s|%s|%s|%s\n" "$CPU" "$MEM" "$DISK" "$UPTIME" "$OS"
STEP2DEV_SCRIPT
`.trim()

  try {
    const result  = await sshExec(cfg, command)
    const latency = Date.now() - start

    if (result.code !== 0 || !result.stdout.trim()) {
      return {
        success: false,
        latency: 0,
        error:   result.stderr.trim() || `Exit code ${result.code}`,
      }
    }

    const [cpuStr, memStr, diskStr, uptimeStr, ...osParts] = result.stdout.trim().split('|')
    return {
      success: true,
      latency,
      stats: {
        cpu:    parseFloat(cpuStr)  || 0,
        mem:    parseFloat(memStr)  || 0,
        disk:   parseInt(diskStr)   || 0,
        uptime: parseInt(uptimeStr) || 0,
        os:     osParts.join('|').trim() || 'Linux',
      },
    }
  } catch (e: unknown) {
    return { success: false, latency: 0, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── Get server credentials from DB ───────────────────────────────────────────
export async function getServerConfig(serverId: string, userId: string): Promise<SshConfig | null> {
  return prisma.server.findFirst({
    where:  { id: serverId, userId },
    select: { host: true, port: true, username: true, authType: true, password: true, privateKey: true },
  })
}
