'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface SavedProperty {
  id: string
  created_at: string
  listing_id: string
  folder_id: string | null
  listings: {
    id: string
    address: string
    price: number
    bedrooms: number | null
    bathrooms: number | null
    property_type: string | null
    borough: string | null
    images: string
    is_active: boolean
  } | null
}

interface Folder {
  id: string
  name: string
}

function getImg(images: string): string | null {
  try {
    const imgs = typeof images === 'string' ? JSON.parse(images) : (images || [])
    return Array.isArray(imgs) ? imgs.find((u: string) => u?.startsWith('http')) || null : null
  } catch { return null }
}

export default function SavedPropertiesClient({ savedProperties }: { savedProperties: SavedProperty[] }) {
  const [props, setProps] = useState(savedProperties)
  const [folders, setFolders] = useState<Folder[]>([])
  const [activeFolder, setActiveFolder] = useState<string | null>(null) // null = all
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [movingId, setMovingId] = useState<string | null>(null)
  const moveRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/saved/folders')
      .then(r => r.json())
      .then(d => setFolders(d.folders || []))
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moveRef.current && !moveRef.current.contains(e.target as Node)) setMovingId(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function unsave(savedId: string) {
    await fetch('/api/saved/property', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saved_id: savedId })
    })
    setProps(p => p.filter(x => x.id !== savedId))
  }

  async function createFolder() {
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    const res = await fetch('/api/saved/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim() })
    })
    const data = await res.json()
    if (data.folder) {
      setFolders(f => [...f, data.folder])
      setActiveFolder(data.folder.id)
    }
    setNewFolderName('')
    setShowNewFolder(false)
    setCreatingFolder(false)
  }

  async function renameFolder(id: string) {
    if (!renameVal.trim()) return
    await fetch('/api/saved/folders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: renameVal.trim() })
    })
    setFolders(f => f.map(x => x.id === id ? { ...x, name: renameVal.trim() } : x))
    setRenamingId(null)
  }

  async function deleteFolder(id: string) {
    if (!confirm('Delete this folder? Properties will move to Uncategorised.')) return
    await fetch('/api/saved/folders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    setFolders(f => f.filter(x => x.id !== id))
    setProps(p => p.map(x => x.folder_id === id ? { ...x, folder_id: null } : x))
    if (activeFolder === id) setActiveFolder(null)
  }

  async function moveToFolder(savedId: string, folderId: string | null) {
    await fetch('/api/saved/property/move', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saved_id: savedId, folder_id: folderId })
    })
    setProps(p => p.map(x => x.id === savedId ? { ...x, folder_id: folderId } : x))
    setMovingId(null)
  }

  const displayed = activeFolder === null
    ? props
    : props.filter(p => p.folder_id === activeFolder)

  const uncategorised = props.filter(p => !p.folder_id)

  if (props.length === 0) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E2DA]">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(211,117,90,0.10)' }}>
        <svg className="w-7 h-7" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{ fontFamily: 'Georgia,serif' }}>No saved properties yet</h2>
      <p className="text-sm text-[#9B928E] mb-6">Heart a property on the search or listing page to save it here.</p>
      <Link href="/search" className="px-6 py-3 rounded-xl text-white text-sm no-underline" style={{ background: '#D3755A' }}>Browse properties →</Link>
    </div>
  )

  return (
    <div className="flex flex-col gap-5">

      {/* Folder tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveFolder(null)}
          className={'px-4 py-2 rounded-xl text-sm font-medium transition-colors ' + (activeFolder === null ? 'text-white' : 'bg-white border border-[#E8E2DA] text-[#3D3A38] hover:bg-[#F5EBE0]')}
          style={activeFolder === null ? { background: '#1B2E4B' } : {}}>
          All ({props.length})
        </button>

        {folders.map(f => (
          <div key={f.id} className="relative flex items-center gap-1">
            {renamingId === f.id ? (
              <div className="flex items-center gap-1">
                <input
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') renameFolder(f.id); if (e.key === 'Escape') setRenamingId(null) }}
                  autoFocus
                  className="border border-[#D3755A] rounded-lg px-3 py-1.5 text-sm outline-none bg-white w-40"
                />
                <button onClick={() => renameFolder(f.id)} className="text-xs px-2 py-1.5 rounded-lg text-white" style={{ background: '#D3755A' }}>Save</button>
                <button onClick={() => setRenamingId(null)} className="text-xs px-2 py-1.5 rounded-lg border border-[#E8E2DA] text-[#9B928E]">×</button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveFolder(f.id)}
                  className={'px-4 py-2 rounded-xl text-sm font-medium transition-colors ' + (activeFolder === f.id ? 'text-white' : 'bg-white border border-[#E8E2DA] text-[#3D3A38] hover:bg-[#F5EBE0]')}
                  style={activeFolder === f.id ? { background: '#D3755A' } : {}}>
                  {f.name} ({props.filter(p => p.folder_id === f.id).length})
                </button>
                <button onClick={() => { setRenamingId(f.id); setRenameVal(f.name) }}
                  className="text-[#9B928E] hover:text-[#D3755A] transition-colors p-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <button onClick={() => deleteFolder(f.id)}
                  className="text-[#9B928E] hover:text-red-500 transition-colors p-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}

        {/* New folder */}
        {showNewFolder ? (
          <div className="flex items-center gap-1">
            <input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
              autoFocus
              placeholder="e.g. Dream home search, Holiday flat..."
              className="border border-[#D3755A] rounded-lg px-3 py-1.5 text-sm outline-none bg-white w-44"
            />
            <button onClick={createFolder} disabled={creatingFolder}
              className="text-xs px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
              style={{ background: '#D3755A' }}>
              {creatingFolder ? '…' : 'Create'}
            </button>
            <button onClick={() => setShowNewFolder(false)}
              className="text-xs px-2 py-1.5 rounded-lg border border-[#E8E2DA] text-[#9B928E]">×</button>
          </div>
        ) : (
          <button onClick={() => setShowNewFolder(true)}
            className="px-4 py-2 rounded-xl text-sm border border-dashed border-[#D3755A] text-[#D3755A] hover:bg-[#F5EBE0] transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            New folder
          </button>
        )}
      </div>

      {/* Property grid */}
      {displayed.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-[#E8E2DA]">
          <p className="text-sm text-[#9B928E]">No properties in this folder yet.</p>
          <button onClick={() => setActiveFolder(null)} className="text-xs text-[#D3755A] hover:underline mt-2">View all properties</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayed.map(p => {
            const l = p.listings
            if (!l) return null
            const img = getImg(l.images)
            const folder = folders.find(f => f.id === p.folder_id)
            return (
              <div key={p.id} className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden">
                <Link href={'/listings/' + l.id} className="no-underline block">
                  <div className="h-40 bg-[#F5EBE0] overflow-hidden relative">
                    {img ? <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      : <div className="w-full h-full flex items-center justify-center text-[#9B928E]">
                          <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5"/></svg>
                        </div>}
                    {folder && (
                      <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white bg-black/40 backdrop-blur-sm">
                        {folder.name}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="font-medium text-[#1B2E4B] text-sm truncate">{l.address}</div>
                    <div className="text-xs text-[#9B928E] mt-0.5">
                      £{l.price?.toLocaleString()}/mo · {l.bedrooms === 0 ? 'Studio' : (l.bedrooms || '?') + ' bed'} · {l.property_type}
                    </div>
                  </div>
                </Link>
                <div className="px-4 pb-4 flex items-center justify-between">
                  <span className="text-xs text-[#9B928E]">Saved {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  <div className="flex items-center gap-2">
                    {/* Move to folder */}
                    <div className="relative" ref={movingId === p.id ? moveRef : null}>
                      <button onClick={() => setMovingId(movingId === p.id ? null : p.id)}
                        className="text-xs text-[#9B928E] hover:text-[#D3755A] transition-colors flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {folder ? folder.name : 'Move to folder'}
                      </button>
                      {movingId === p.id && (
                        <div className="absolute bottom-full right-0 mb-1 bg-white border border-[#E8E2DA] rounded-xl shadow-xl z-50 py-1 w-48">
                          <button onClick={() => moveToFolder(p.id, null)}
                            className={'w-full text-left text-xs px-4 py-2 transition-colors ' + (!p.folder_id ? 'text-[#D3755A] font-medium' : 'text-[#3D3A38] hover:bg-[#F5EBE0]')}>
                            Uncategorised
                          </button>
                          {folders.map(f => (
                            <button key={f.id} onClick={() => moveToFolder(p.id, f.id)}
                              className={'w-full text-left text-xs px-4 py-2 transition-colors ' + (p.folder_id === f.id ? 'text-[#D3755A] font-medium' : 'text-[#3D3A38] hover:bg-[#F5EBE0]')}>
                              {f.name}
                            </button>
                          ))}
                          <div className="border-t border-[#E8E2DA] mt-1 pt-1">
                            <button onClick={() => { setMovingId(null); setShowNewFolder(true) }}
                              className="w-full text-left text-xs px-4 py-2 text-[#D3755A] hover:bg-[#F5EBE0] transition-colors">
                              + New folder
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <button onClick={() => unsave(p.id)} className="text-xs text-[#9B928E] hover:text-red-500 transition-colors">Remove ×</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
