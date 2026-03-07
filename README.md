# Step2Dev — DevOps Platform

A full-stack DevOps platform with real SSH pipelines, live monitoring, AI assistance, and auto-deploy.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (local, Docker, or Neon/Supabase free tier)

### 1. Clone and install
```bash
git clone <your-repo>
cd step2dev
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Required
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/step2dev"
JWT_SECRET="run: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""

# Optional — enables AI features
ANTHROPIC_API_KEY="sk-ant-..."

# Optional — enables email verification
RESEND_API_KEY="re_..."
FROM_EMAIL="noreply@yourdomain.com"
```

### 3. Start PostgreSQL (if local)
```bash
docker run -d \
  --name step2dev-db \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=step2dev \
  postgres:16-alpine
```

### 4. Create database tables
```bash
npx prisma db push
```

### 5. Run
```bash
npm run dev
# → http://localhost:3000
```

If you see a Setup Required page, follow the on-screen guide.

---

## What's included

| Feature | Status |
|---|---|
| Auth (register, login, sessions, email verify) | ✅ |
| Projects (CRUD, environments) | ✅ |
| CI/CD Pipelines with live log streaming | ✅ |
| Real SSH execution (ssh2) | ✅ |
| Push trigger (GitHub webhooks) | ✅ |
| Schedule trigger (Vercel Cron) | ✅ |
| Auto-retry on failure | ✅ |
| Environment variables per pipeline | ✅ |
| Server management with SSH terminal | ✅ |
| Real-time monitoring (CPU, RAM, disk, network) | ✅ |
| Alert rules + notifications | ✅ |
| AI Assistant (Claude Sonnet) | ✅ |
| AI pipeline analysis on failure | ✅ |
| AI server diagnosis | ✅ |
| Onboarding wizard for new users | ✅ |
| Setup wizard with env check | ✅ |

---

## Deploy to Vercel + Neon (free)

1. Push to GitHub
2. Create a Neon account → create a database → copy connection string
3. Import repo on Vercel → add env vars
4. Add to `vercel.json` for scheduled pipelines (already included)

```json
{
  "crons": [{ "path": "/api/cron", "schedule": "* * * * *" }]
}
```

---

## Adding a server

1. Go to **Servers → Add Server**
2. Enter: IP, SSH port (22), username, password or private key
3. Click **Test Connection** — Step2Dev SSHes in and reads real metrics
4. Server is now available for pipelines and monitoring

---

## Setting up a pipeline

1. Create a project
2. Go to **Pipelines → New Pipeline**
3. Pick stages: Install → Build → Test → Deploy
4. Set trigger:
   - **Manual** — click Run button
   - **Push** — copy webhook URL to GitHub → auto-runs on every git push
   - **Schedule** — pick a cron expression (daily, hourly, etc.)
5. Optionally add env vars and enable auto-retry
6. Click **▶ Run Pipeline**

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET/PATCH | `/api/auth/me` | Profile |
| GET/POST | `/api/projects` | Projects |
| GET/POST | `/api/pipelines` | Pipelines |
| POST | `/api/pipelines/:id/run` | Trigger run |
| GET/PATCH | `/api/pipelines/:id/settings` | Pipeline settings |
| GET/POST | `/api/servers` | Servers |
| POST | `/api/servers/:id/test` | Test SSH connection |
| GET | `/api/metrics/stream` | SSE metrics stream |
| POST | `/api/webhooks/github` | GitHub push webhook |
| GET | `/api/cron` | Scheduled pipeline trigger |
| POST | `/api/ai/chat` | AI chat (streaming SSE) |
| POST | `/api/ai/analyze-pipeline` | AI analyze run logs |
| POST | `/api/ai/analyze-server` | AI analyze server health |
| GET | `/api/notifications` | List notifications |
| GET | `/api/setup` | Check environment config |
| GET | `/api/health` | Health check |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Min 32 chars for signing tokens |
| `ANTHROPIC_API_KEY` | Optional | Enables AI features |
| `RESEND_API_KEY` | Optional | Enables email verification |
| `FROM_EMAIL` | Optional | Sender address for emails |
| `CRON_SECRET` | Optional | Protects the cron endpoint |
| `RATE_LIMIT_MAX` | Optional | API rate limit per minute (default 100) |

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT + HTTP-only cookies + bcrypt
- **SSH:** ssh2 (real connections)
- **AI:** Anthropic Claude Sonnet
- **Email:** Resend
- **Styling:** Tailwind CSS
- **Streaming:** Server-Sent Events (SSE)

---

Built with Step2Dev · [github.com/your-repo](https://github.com)
