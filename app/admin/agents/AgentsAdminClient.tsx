'use client'

import { useState } from 'react'

interface Agent {
  id: string
  name: string
  email: string
  api_key: string
  is_active: boolean
  created_at: string
}

export default function AgentsAdminClient({ agents: initial }: { agents: Agent[] }) {
  const [agents, setAgents] = useState(initial)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  async function createAgent() {
    if (!newName.trim() || !newEmail.trim()) return
    setCreating(true)
    const res = await fetch('/api/admin/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), email: newEmail.trim() })
    })
    const data = await res.json()
    if (data.agent) {
      setAgents(a => [data.agent, ...a])
      setNewName('')
      setNewEmail('')
    }
    setCreating(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch('/api/admin/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !current })
    })
    setAgents(a => a.map(x => x.id === id ? { ...x, is_active: !current } : x))
  }

  async function regenerateKey(id: string) {
    if (!confirm('Regenerate API key? The old key will stop working immediately.')) return
    const res = await fetch('/api/admin/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, regenerate_key: true })
    })
    const data = await res.json()
    if (data.api_key) {
      setAgents(a => a.map(x => x.id === id ? { ...x, api_key: data.api_key } : x))
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const inputClass = "border border-[#E8E2DA] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] transition-colors bg-white"

  return (
    <div className="flex flex-col gap-5">

      {/* BLM endpoint info */}
      <div className="bg-[#1B2E4B] rounded-2xl p-5 text-white">
        <div className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#D3755A' }}>Feed endpoint</div>
        <div className="font-mono text-sm bg-white/10 rounded-lg px-4 py-2 mb-3">
          POST {process.env.NEXT_PUBLIC_SITE_URL || 'https://nestlondon.co.uk'}/api/feed/blm
        </div>
        <div className="text-xs text-white/60 leading-relaxed">
          Agents should configure their CRM (Reapit, Jupix, Alto, etc.) to POST their BLM file to this endpoint.
          Include their API key in the <span className="font-mono bg-white/10 px-1 rounded">x-agent-key</span> header.
          Listings are automatically created, updated and deactivated based on the feed.
        </div>
      </div>

      {/* Create new agent */}
      <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-[#1B2E4B] mb-4">Add new agent</h2>
        <div className="flex gap-3 flex-wrap">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            className={inputClass + ' flex-1'} placeholder="Agency name" />
          <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
            type="email" className={inputClass + ' flex-1'} placeholder="Contact email" />
          <button onClick={createAgent} disabled={creating || !newName || !newEmail}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: '#D3755A' }}>
            {creating ? 'Creating…' : 'Create agent'}
          </button>
        </div>
      </div>

      {/* Agent list */}
      {agents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-[#E8E2DA]">
          <p className="text-sm text-[#9B928E]">No agents yet. Add one above.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {agents.map(a => (
            <div key={a.id} className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-medium text-[#1B2E4B]">{a.name}</div>
                  <div className="text-xs text-[#9B928E]">{a.email}</div>
                  <div className="text-xs text-[#9B928E]">Added {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (a.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
                    {a.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => toggleActive(a.id, a.is_active)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[#E8E2DA] text-[#9B928E] hover:border-[#D3755A] hover:text-[#D3755A] transition-colors">
                    {a.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>

              {/* API Key */}
              <div className="bg-[#F5F0EB] rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-[#9B928E] uppercase tracking-wide mb-0.5">API Key</div>
                  <div className="font-mono text-xs text-[#1B2E4B] truncate">{a.api_key}</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => copyKey(a.api_key)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[#E8E2DA] text-[#9B928E] hover:text-[#D3755A] transition-colors bg-white">
                    {copied === a.api_key ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={() => regenerateKey(a.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[#E8E2DA] text-[#9B928E] hover:text-red-500 transition-colors bg-white">
                    Regenerate
                  </button>
                </div>
              </div>

              {/* Integration instructions */}
              <details className="mt-3">
                <summary className="text-xs text-[#D3755A] cursor-pointer hover:underline">Show integration instructions</summary>
                <div className="mt-2 text-xs text-[#9B928E] leading-relaxed bg-[#F5F0EB] rounded-xl p-3 font-mono whitespace-pre-wrap">{`# CRM Configuration
Feed URL: ${typeof window !== 'undefined' ? window.location.origin : 'https://nestlondon.co.uk'}/api/feed/blm
Method: POST
Header: x-agent-key: ${a.api_key}
Content-Type: text/plain (or multipart/form-data with field "file")
Format: BLM v2.5+

# Test your connection
curl -X GET \\
  -H "x-agent-key: ${a.api_key}" \\
  ${typeof window !== 'undefined' ? window.location.origin : 'https://nestlondon.co.uk'}/api/feed/blm`}</div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
