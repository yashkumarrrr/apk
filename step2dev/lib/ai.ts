// Anthropic API helpers for Part 7 AI features

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL         = 'claude-sonnet-4-20250514'

export interface AiMessage {
  role:    'user' | 'assistant'
  content: string
}

// System prompt for the DevOps assistant
export const DEVOPS_SYSTEM = `You are an expert DevOps engineer and AI assistant built into step2dev, a CI/CD and server management platform. You help developers:

- Diagnose and fix failing pipelines (npm, docker, node.js, git issues)
- Analyze server metrics (CPU, memory, disk, network) and identify problems
- Write shell scripts, Dockerfiles, nginx configs, systemd services
- Explain error messages from build logs clearly and concisely
- Suggest infrastructure improvements and best practices
- Generate pipeline configurations based on project type

Your responses are:
- Concise and actionable — developers need solutions, not essays
- Code-first — always include working code/commands when relevant
- Direct — start with the solution, explain after
- Formatted with markdown — use \`\`\`bash for shell, \`\`\`yaml for configs, etc.

You have access to real data from the user's dashboard when provided. Use it to give specific, not generic, advice.`

// Non-streaming: call Claude and get full response
export async function askClaude(
  messages:   AiMessage[],
  systemExtra?: string,
  maxTokens = 1000,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const system = systemExtra
    ? `${DEVOPS_SYSTEM}\n\n${systemExtra}`
    : DEVOPS_SYSTEM

  const res = await fetch(ANTHROPIC_API, {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// Streaming: returns a ReadableStream of SSE text chunks
export function streamClaude(
  messages:    AiMessage[],
  systemExtra?: string,
  maxTokens = 2000,
): ReadableStream {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify({ type: 'error', error: 'ANTHROPIC_API_KEY is not set. Add it to your .env file.' })}\n\n`
        ))
        c.close()
      },
    })
  }

  const system = systemExtra
    ? `${DEVOPS_SYSTEM}\n\n${systemExtra}`
    : DEVOPS_SYSTEM

  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) }
        catch { /* closed */ }
      }

      try {
        const res = await fetch(ANTHROPIC_API, {
          method:  'POST',
          headers: {
            'Content-Type':      'application/json',
            'x-api-key':         apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model:      MODEL,
            max_tokens: maxTokens,
            system,
            messages,
            stream:     true,
          }),
        })

        if (!res.ok || !res.body) {
          const err = await res.text()
          send({ type: 'error', error: `API error ${res.status}: ${err}` })
          controller.close()
          return
        }

        const reader  = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (raw === '[DONE]') continue
            try {
              const evt = JSON.parse(raw)
              if (evt.type === 'content_block_delta' && evt.delta?.text) {
                send({ type: 'delta', text: evt.delta.text })
              }
              if (evt.type === 'message_stop') {
                send({ type: 'done' })
              }
            } catch { /* skip malformed */ }
          }
        }
      } catch (e: unknown) {
        send({ type: 'error', error: e instanceof Error ? e.message : String(e) })
      }

      try { controller.close() } catch { /* ok */ }
    },
  })
}
