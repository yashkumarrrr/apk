import { prisma } from './prisma'
import { sshExec, getServerConfig } from './ssh'

export interface RealMetrics {
  CPU:         number
  MEMORY:      number
  DISK:        number
  NETWORK_IN:  number
  NETWORK_OUT: number
  REQUESTS:    number
  ERROR_RATE:  number
  LATENCY:     number
  uptime:      number
  serverId:    string
  serverName:  string
}

// All metrics collected in a single SSH round-trip using a heredoc
// so there are zero quoting/escaping issues
const METRICS_SCRIPT = `
bash << 'STEP2DEV_METRICS'
# CPU (0.3s sample)
idle1=$(awk '/^cpu /{print $5+$6}' /proc/stat)
tot1=$(awk '/^cpu /{s=0;for(i=2;i<=NF;i++)s+=$i;print s}' /proc/stat)
sleep 0.3
idle2=$(awk '/^cpu /{print $5+$6}' /proc/stat)
tot2=$(awk '/^cpu /{s=0;for(i=2;i<=NF;i++)s+=$i;print s}' /proc/stat)
dt=$((tot2-tot1)); di=$((idle2-idle1))
CPU=$([ "$dt" -gt 0 ] && awk "BEGIN{printf \"%.1f\",100*($dt-$di)/$dt}" || echo 0)

# Memory
MEM=$(awk '/MemTotal/{t=$2}/MemAvailable/{a=$2}END{printf "%.1f",100*(t-a)/t}' /proc/meminfo 2>/dev/null || echo 0)

# Disk root
DISK=$(df / 2>/dev/null | awk 'NR==2{gsub(/%/,"",$5);print $5}' || echo 0)

# Uptime
UPTIME=$(awk '{printf "%d",$1}' /proc/uptime 2>/dev/null || echo 0)

# Network MB/s (1s sample)
rx1=$(awk 'NR>2{s+=$2}END{print s+0}' /proc/net/dev)
tx1=$(awk 'NR>2{s+=$10}END{print s+0}' /proc/net/dev)
sleep 1
rx2=$(awk 'NR>2{s+=$2}END{print s+0}' /proc/net/dev)
tx2=$(awk 'NR>2{s+=$10}END{print s+0}' /proc/net/dev)
NET_IN=$(awk "BEGIN{printf \"%.3f\",($rx2-$rx1)/1048576}")
NET_OUT=$(awk "BEGIN{printf \"%.3f\",($tx2-$tx1)/1048576}")

# Nginx requests/s and error rate (last 100 lines of access log)
if [ -f /var/log/nginx/access.log ]; then
  STATS=$(tail -n 100 /var/log/nginx/access.log | awk '
    BEGIN{t=0;e=0;latsum=0;latcnt=0}
    {
      t++
      if($9+0>=500) e++
      # Try to get request time from last field if numeric
      v=$NF+0
      if(v>0 && v<100){latsum+=v*1000;latcnt++}
    }
    END{
      printf "%.0f|%.1f|%.0f",t/60,t>0?100*e/t:0,latcnt>0?latsum/latcnt:0
    }
  ')
  REQUESTS=$(echo "$STATS" | cut -d'|' -f1)
  ERROR_RATE=$(echo "$STATS" | cut -d'|' -f2)
  LATENCY=$(echo "$STATS" | cut -d'|' -f3)
else
  REQUESTS=0; ERROR_RATE=0; LATENCY=0
fi

printf "%s|%s|%s|%s|%s|%s|%s|%s|%s\n" \
  "$CPU" "$MEM" "$DISK" "$UPTIME" \
  "$NET_IN" "$NET_OUT" \
  "$REQUESTS" "$ERROR_RATE" "$LATENCY"
STEP2DEV_METRICS
`.trim()

export async function collectRealMetrics(userId: string): Promise<RealMetrics | null> {
  const server = await prisma.server.findFirst({
    where:   { userId, status: 'ONLINE' },
    orderBy: { lastPingedAt: 'desc' },
  })
  if (!server) return null

  const cfg = await getServerConfig(server.id, userId)
  if (!cfg) return null

  try {
    const result = await sshExec(cfg, METRICS_SCRIPT)
    if (result.code !== 0 || !result.stdout.trim()) return null

    const parts = result.stdout.trim().split('|')
    if (parts.length < 9) return null

    return {
      CPU:         parseFloat(parts[0]) || 0,
      MEMORY:      parseFloat(parts[1]) || 0,
      DISK:        parseInt(parts[2])   || 0,
      uptime:      parseInt(parts[3])   || 0,
      NETWORK_IN:  parseFloat(parts[4]) || 0,
      NETWORK_OUT: parseFloat(parts[5]) || 0,
      REQUESTS:    parseFloat(parts[6]) || 0,
      ERROR_RATE:  parseFloat(parts[7]) || 0,
      LATENCY:     parseFloat(parts[8]) || 0,
      serverId:    server.id,
      serverName:  server.name,
    }
  } catch {
    return null
  }
}

export async function updateServerStats(userId: string, metrics: RealMetrics): Promise<void> {
  await prisma.server.update({
    where: { id: metrics.serverId },
    data: {
      cpuUsage:    metrics.CPU,
      memUsage:    metrics.MEMORY,
      diskUsage:   metrics.DISK,
      uptime:      metrics.uptime,
      lastPingedAt: new Date(),
    },
  }).catch(() => {})
}
