import { createRoot } from 'react-dom/client'
import React, { useEffect, useState, useRef } from 'react'
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

function generateInitialQuestion(code: string, language: string): string {
  const lines = code.trim().split('\n').filter(Boolean)
  if (!code.trim()) return 'Please paste a code snippet. What is the apparent purpose of this code?'
  if (lines.length === 1) return 'This looks like a short snippet — what do you think it does?'
  if (/return\b/.test(code)) return 'What does the return value represent in this code?'
  if (/for\b|while\b/.test(code)) return 'Can you explain the loop in this code? What is it iterating over?'
  return 'What do you think is the main responsibility of this code?'
}

function generateFollowUp(userText: string, code: string): string {
  const t = userText.toLowerCase()
  if (t.includes('error') || t.includes('bug') || t.includes('wrong')) {
    return 'What part of the code makes you suspect an error or bug?'
  }
  if (t.includes('return') || t.includes('output')) {
    return 'How does the code compute its return value or output? Can you trace the path?'
  }
  if (t.includes('loop') || t.includes('for') || t.includes('while')) {
    return 'What would happen if the loop iterates one extra time? How would that affect state?'
  }
  // Generic prompting: push the student to reason about inputs/outputs and invariants
  return 'What assumptions does this code make about its inputs or environment?'
}

function ChatPanel({ code }: { code: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState<string>('')
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Load messages from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('tutor:messages')
      if (raw) setMessages(JSON.parse(raw))
    } catch (e) {
      // ignore
    }
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

  async function handleStart() {
    pushMessage('user', 'Start session')
    try {
      const resp = await axios.post('/api/socratic', {
        code,
        language: 'cpp',
        history: [],
      })
      const reply = resp.data?.reply || 'Sorry, no reply.'
      pushMessage('tutor', reply)
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
      const reply = resp.data?.reply || 'Sorry, the tutor did not respond.'
      pushMessage('tutor', reply)
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
            onGenerateQuestion={(q) => {
              /* no-op; placeholder to allow future hooks */
            }}
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
