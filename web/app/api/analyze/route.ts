import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const SYSTEM_PROMPT = `You are a helpful YouTube video analyst. Given a video transcript, provide a structured analysis.

Always respond with this exact JSON structure:
{
  "worth_watching": true | false,
  "verdict": "One punchy sentence explaining your worth-watching decision",
  "summary": "3-5 sentence summary of what the video covers",
  "key_points": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "target_audience": "Who this video is best suited for",
  "estimated_value": "high" | "medium" | "low",
  "topics": ["topic1", "topic2", "topic3"]
}

Return ONLY valid JSON, no markdown, no explanation.`

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { transcript, question, history = [] } = await req.json()
  if (!transcript) {
    return new Response(JSON.stringify({ error: 'No transcript provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const client = new Anthropic({ apiKey })

  // If a follow-up question is asked, stream a conversational answer
  if (question) {
    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: `You are a helpful assistant. Answer questions about the following YouTube video transcript.\n\nTranscript:\n${transcript.slice(0, 12000)}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        ...history,
        { role: 'user', content: question },
      ],
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            )
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  // Initial analysis — return JSON
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Analyze this YouTube video transcript:\n\n${transcript.slice(0, 12000)}`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  try {
    const analysis = JSON.parse(text)
    return new Response(JSON.stringify(analysis), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to parse AI response', raw: text }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
