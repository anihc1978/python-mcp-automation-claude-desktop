import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'
import { extractVideoId } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url?.trim()) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }

    const videoId = extractVideoId(url.trim())
    if (!videoId) {
      return NextResponse.json({ error: 'Could not extract video ID from URL' }, { status: 400 })
    }

    const entries = await YoutubeTranscript.fetchTranscript(videoId)
    const text = entries.map((e) => e.text).join(' ')

    return NextResponse.json({ videoId, transcript: text, segments: entries.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
