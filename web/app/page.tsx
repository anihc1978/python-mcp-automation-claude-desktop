'use client'

import { useState } from 'react'
import {
  Play, Sparkles, CheckCircle2, XCircle, Loader2,
  ChevronDown, ChevronUp, Send, Copy, Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface Analysis {
  worth_watching: boolean
  verdict: string
  summary: string
  key_points: string[]
  target_audience: string
  estimated_value: 'high' | 'medium' | 'low'
  topics: string[]
}

interface ChatMsg { role: 'user' | 'assistant'; content: string; streaming?: boolean }

const VALUE_COLOR: Record<string, string> = {
  high: '#2ecc71', medium: '#f39c12', low: '#e74c3c'
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [videoId, setVideoId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [step, setStep] = useState<'idle' | 'fetching' | 'analyzing' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [showTranscript, setShowTranscript] = useState(false)
  const [copied, setCopied] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)

  const handleAnalyze = async () => {
    if (!url.trim()) return
    setStep('fetching')
    setError('')
    setAnalysis(null)
    setTranscript('')
    setVideoId(null)
    setChat([])

    try {
      // Step 1: fetch transcript
      const tRes = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const tData = await tRes.json()
      if (!tRes.ok || tData.error) throw new Error(tData.error ?? 'Failed to fetch transcript')
      setVideoId(tData.videoId)
      setTranscript(tData.transcript)

      // Step 2: analyze
      setStep('analyzing')
      const aRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: tData.transcript }),
      })
      const aData = await aRes.json()
      if (!aRes.ok || aData.error) throw new Error(aData.error ?? 'Failed to analyze')
      setAnalysis(aData)
      setStep('done')
    } catch (e) {
      setError(String(e))
      setStep('error')
    }
  }

  const sendChat = async () => {
    const q = chatInput.trim()
    if (!q || chatLoading || !transcript) return
    const history = chat.filter(m => !m.streaming).map(({ role, content }) => ({ role, content }))
    setChat(prev => [...prev, { role: 'user', content: q }, { role: 'assistant', content: '', streaming: true }])
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, question: q, history }),
      })
      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') continue
          try {
            const { text } = JSON.parse(raw)
            setChat(prev => { const u = [...prev]; u[u.length-1] = {...u[u.length-1], content: u[u.length-1].content + text}; return u })
          } catch { /* ignore */ }
        }
      }
      setChat(prev => { const u = [...prev]; u[u.length-1] = {...u[u.length-1], streaming: false}; return u })
    } catch (e) {
      setChat(prev => { const u = [...prev]; u[u.length-1] = { role: 'assistant', content: 'Error: ' + String(e) }; return u })
    } finally { setChatLoading(false) }
  }

  const copyTranscript = () => {
    navigator.clipboard.writeText(transcript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center gap-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <Play className="h-6 w-6" style={{ color: 'var(--red)' }} />
        <div>
          <h1 className="font-bold text-base leading-tight">YouTube Transcript Analyzer</h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Powered by Claude AI · MCP-ready</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* URL input */}
        <div className="rounded-xl p-5 border space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <label className="text-sm font-medium block">YouTube URL</label>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <button
              onClick={handleAnalyze}
              disabled={!url.trim() || step === 'fetching' || step === 'analyzing'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 transition-opacity"
              style={{ background: 'var(--red)', color: '#fff' }}
            >
              {(step === 'fetching' || step === 'analyzing')
                ? <><Loader2 className="h-4 w-4 animate-spin" />{step === 'fetching' ? 'Fetching…' : 'Analyzing…'}</>
                : <><Sparkles className="h-4 w-4" />Analyze</>}
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Paste any YouTube URL · Claude reads the transcript so you don&apos;t have to watch it
          </p>
        </div>

        {step === 'error' && (
          <div className="rounded-xl px-4 py-3 border flex items-center gap-2 text-sm"
            style={{ background: 'rgba(231,76,60,0.1)', borderColor: 'rgba(231,76,60,0.3)', color: '#e74c3c' }}>
            <XCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        {/* Video thumbnail + analysis */}
        {analysis && videoId && (
          <div className="space-y-4">
            {/* Thumbnail + verdict */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <div className="relative aspect-video w-full bg-black">
                <Image
                  src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                  alt="Video thumbnail"
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                  <div className="flex items-center gap-2">
                    {analysis.worth_watching
                      ? <CheckCircle2 className="h-6 w-6 shrink-0" style={{ color: 'var(--green)' }} />
                      : <XCircle className="h-6 w-6 shrink-0" style={{ color: 'var(--red)' }} />}
                    <span className="font-bold text-white text-base">{analysis.verdict}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Worth Watching', value: analysis.worth_watching ? 'YES' : 'NO', color: analysis.worth_watching ? '#2ecc71' : '#e74c3c' },
                { label: 'Estimated Value', value: analysis.estimated_value.toUpperCase(), color: VALUE_COLOR[analysis.estimated_value] },
                { label: 'Topics', value: analysis.topics.length + ' found', color: '#4b89ff' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{s.label}</p>
                  <p className="font-bold text-sm" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-semibold mb-2">Summary</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{analysis.summary}</p>
            </div>

            {/* Key points */}
            <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-semibold mb-3">Key Points</h2>
              <ul className="space-y-2">
                {analysis.key_points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                      style={{ background: 'var(--red-dim)', color: 'var(--red)' }}>{i+1}</span>
                    <span style={{ color: 'var(--muted)' }}>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Topics + audience */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <h2 className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>TOPICS</h2>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.topics.map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--red-dim)', color: 'var(--red)' }}>{t}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <h2 className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>TARGET AUDIENCE</h2>
                <p className="text-sm" style={{ color: 'var(--text)' }}>{analysis.target_audience}</p>
              </div>
            </div>

            {/* Transcript toggle */}
            {transcript && (
              <div className="rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <button onClick={() => setShowTranscript(p => !p)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm hover:opacity-80 transition-opacity">
                  <span className="font-medium">Full Transcript</span>
                  <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); copyTranscript() }}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                      style={{ background: 'var(--bg-input)', color: 'var(--muted)' }}>
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    {showTranscript ? <ChevronUp className="h-4 w-4" style={{ color: 'var(--muted)' }} /> : <ChevronDown className="h-4 w-4" style={{ color: 'var(--muted)' }} />}
                  </div>
                </button>
                {showTranscript && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-xs leading-relaxed mt-3 whitespace-pre-wrap" style={{ color: 'var(--muted)' }}>{transcript}</p>
                  </div>
                )}
              </div>
            )}

            {/* Chat */}
            <div className="rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <h2 className="text-sm font-semibold">Ask Claude about this video</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Ask anything — Claude has read the full transcript</p>
              </div>

              {chat.length > 0 && (
                <div className="px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
                  {chat.map((m, i) => (
                    <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-sm text-sm px-3 py-2 rounded-xl leading-relaxed',
                        m.role === 'user' ? 'rounded-tr-sm' : cn('rounded-tl-sm', m.streaming && m.content === '' && 'cursor'))}
                        style={{ background: m.role === 'user' ? 'var(--red)' : 'var(--bg-input)', color: '#fff' }}>
                        <span className={cn(m.streaming && m.content !== '' && 'cursor')}>
                          {m.content || (m.streaming ? '' : '…')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="px-4 py-3 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder="Is this video worth watching for a beginner?"
                  className="flex-1 text-sm rounded-lg px-3 py-2 outline-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                  className="p-2 rounded-lg disabled:opacity-40"
                  style={{ background: 'var(--red)', color: '#fff' }}>
                  {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
