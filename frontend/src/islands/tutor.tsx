import { createRoot } from 'react-dom/client'
import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import Editor from '@monaco-editor/react'

// Simple in-file ChatPanel used for milestone 3. Messages persist to localStorage
// so students can continue a session.

type Message = {
  id: string
  role: 'user' | 'tutor'
  text: string
  ts: number
}
function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 9)
}
function ChatPanel({
  code,
  language,
}: {
  code: string
  language: string
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState<string>('')
  const [sessionName, setSessionName] = useState<string>('')
  const [savedSessions, setSavedSessions] = useState<Array<{id:string;name:string;ts:number}>>([])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Load messages from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('tutor:messages')
      if (raw) setMessages(JSON.parse(raw))
    } catch (e) {
      // ignore
    }
    // load saved sessions meta
    try {
      const meta = localStorage.getItem('tutor:sessions_meta')
      if (meta) setSavedSessions(JSON.parse(meta))
    } catch (e) {}
  }, [])

  // Persist messages
  useEffect(() => {
    try {
      localStorage.setItem('tutor:messages', JSON.stringify(messages))
    } catch (e) {
      // ignore
    }
    // scroll to bottom
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  function pushMessage(role: Message['role'], text: string) {
    const msg: Message = { id: uid('m_'), role, text, ts: Date.now() }
    setMessages((s) => [...s, msg])
  }

  function persistSessionMeta(meta: Array<{id:string;name:string;ts:number}>) {
    try { localStorage.setItem('tutor:sessions_meta', JSON.stringify(meta)) } catch (e) {}
  }

  function saveCurrentSession() {
    const id = uid('s_')
    const name = sessionName || `Session ${new Date().toLocaleString()}`
    const ts = Date.now()
    const meta = [{ id, name, ts }, ...savedSessions]
    setSavedSessions(meta)
    persistSessionMeta(meta)
    try {
      localStorage.setItem(`tutor:session:${id}`, JSON.stringify({ name, ts, messages }))
    } catch (e) {}
  }

  function loadSession(id: string) {
    try {
      const raw = localStorage.getItem(`tutor:session:${id}`)
      if (!raw) return
      const obj = JSON.parse(raw)
      if (obj?.messages) setMessages(obj.messages)
    } catch (e) {}
  }

  function deleteSession(id: string) {
    const meta = savedSessions.filter((s) => s.id !== id)
    setSavedSessions(meta)
    persistSessionMeta(meta)
    try { localStorage.removeItem(`tutor:session:${id}`) } catch (e) {}
  }

  function exportCurrentSession() {
    try {
      const data = JSON.stringify({ name: sessionName || 'export', ts: Date.now(), messages })
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tutor-session-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {}
  }

  function importSessionFile(file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result || '{}'))
        if (obj?.messages) setMessages(obj.messages)
        // optionally save as session
      } catch (e) {}
    }
    reader.readAsText(file)
  }

  async function handleStart() {
    pushMessage('user', 'Start session')
    try {
      const resp = await axios.post('/api/socratic', {
        code,
        language,
        history: [],
      })
      const reply = resp.data?.reply
      const error = resp.data?.error
      const message = resp.data?.message

      if (reply) {
        pushMessage('tutor', reply)
      } else if (error === 'socratic_policy') {
        pushMessage('tutor', 'The tutor tried to answer directly. Please try again to get a guiding question.')
      } else {
        pushMessage('tutor', message || 'Sorry, no reply.')
      }
    } catch (e) {
      pushMessage('tutor', 'Error: failed to contact tutor service.')
    }
  }

  function handleReset() {
    setMessages([])
    setInput('')
    try {
      localStorage.removeItem('tutor:messages')
    } catch (e) {}
  }

  async function handleSend() {
      const text = input.trim()
      if (!text) return
      pushMessage('user', text)
      setInput('')

      // call backend Socratic API
      try {
        // build short history mapping to API format
        const historyForApi = messages.map((m) => ({ role: m.role === 'tutor' ? 'assistant' : 'user', text: m.text }))
        const resp = await axios.post('/api/socratic', {
          code,
          language,
          history: historyForApi,
        })
        const reply = resp.data?.reply
        const error = resp.data?.error
        const message = resp.data?.message

        if (reply) {
          pushMessage('tutor', reply)
        } else if (error === 'socratic_policy') {
          pushMessage('tutor', 'The tutor tried to answer directly. Please try again to get a guiding question.')
        } else {
          pushMessage('tutor', message || 'Sorry, the tutor did not respond.')
        }
      } catch (e) {
        pushMessage('tutor', 'Error: failed to contact tutor service.')
      }
    }

    return (
      <>
        <div ref={containerRef} className="flex-1 overflow-auto mb-3 p-2 border border-gray-50 rounded bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-sm text-gray-600">No conversation yet. Click "Start" to begin.</div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={m.role === 'tutor' ? 'text-left' : 'text-right'}>
                  <div
                    className={`inline-block px-3 py-2 rounded-md text-sm ${
                      m.role === 'tutor' ? 'bg-indigo-50 text-indigo-800' : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
            <button onClick={handleStart} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-500">Start</button>
            <button onClick={handleReset} className="px-3 py-2 border rounded text-sm text-gray-600">Reset</button>
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(e) => importSessionFile(e.target.files?.[0] || null)} />
            <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 border rounded text-sm text-gray-600">Import</button>
            <button onClick={exportCurrentSession} className="px-3 py-2 border rounded text-sm text-gray-600">Export</button>
            <input value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="Session name (optional)" className="ml-2 rounded border-gray-200 p-1 text-sm" />
            <button onClick={saveCurrentSession} className="px-3 py-2 bg-yellow-500 text-white rounded text-sm">Save</button>

            <div className="flex-1 flex items-center ml-2 gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                placeholder="Your reply to the tutor..."
                className="flex-1 rounded border-gray-200 p-2 text-sm"
              />
              <button onClick={handleSend} className="px-3 py-2 bg-green-600 text-white rounded text-sm">Send</button>
            </div>

            <div className="ml-auto text-xs text-gray-400">Local-only for now</div>
          </div>
              {/* Saved sessions list */}
              {savedSessions.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  <div className="mb-1 font-semibold">Saved Sessions</div>
                  <div className="space-y-2">
                    {savedSessions.map((s) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <button onClick={() => loadSession(s.id)} className="text-left text-sm text-indigo-600">{s.name}</button>
                        <div className="text-xs text-gray-400">{new Date(s.ts).toLocaleString()}</div>
                        <button onClick={() => deleteSession(s.id)} className="ml-auto text-xs text-red-500">Delete</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

      </>
    )
  }


function TutorIslandComponent() {
  const [code, setCode] = useState<string>('')
  const [language, setLanguage] = useState<string>('cpp')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tutor:code')
      if (saved) setCode(saved)
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('tutor:code', code)
    } catch (e) {
      // ignore
    }
  }, [code])

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Socratic Code Tutor</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Editor Panel */}
        <section className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm p-4 min-h-[320px]">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-600">Editor</div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="rounded border-gray-200 text-sm p-1"
              >
                <option value="cpp">C++</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
              </select>
            </div>
          </div>

          <div className="w-full">
            <Editor
              height="40vh"
              defaultLanguage={language}
              language={language}
              value={code}
              onChange={(v) => setCode(v || '')}
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                folding: true,
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
              theme="vs-light"
            />

            <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
              <div>Paste code for the tutor to ask questions about.</div>
              <div>Characters: {code.length}</div>
            </div>
          </div>
        </section>

        {/* Right: Chat Panel */}
        <aside className="w-full lg:w-1/2 bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col">
          <div className="mb-3">
            <div className="text-sm text-gray-600">Socratic Tutor</div>
            <div className="text-xs text-gray-500">The tutor asks guiding questions only — no direct answers.</div>
          </div>

          {/* Chat state and UI */}
          <ChatPanel
            code={code}
            language={language}
          />
        </aside>
      </div>
    </div>
  )
}

export function mount(element: HTMLElement, _props: unknown): void {
  element.innerHTML = ''
  const root = createRoot(element)
  root.render(<TutorIslandComponent />)
}
