"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type SortOption = "newest" | "oldest" | "price_high" | "price_low"

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  price_high: "Price: high to low",
  price_low: "Price: low to high",
}

function sortProperties(properties: SavedProp[], sort: SortOption): SavedProp[] {
  const copy = [...properties]
  switch (sort) {
    case "newest":
      return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    case "oldest":
      return copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    case "price_high":
      return copy.sort((a, b) => (b.listings?.price || 0) - (a.listings?.price || 0))
    case "price_low":
      return copy.sort((a, b) => (a.listings?.price || 0) - (b.listings?.price || 0))
  }
}

function SortDropdown({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-stone-500 hover:text-[#D3755A] flex items-center gap-1"
      >
        Sort: {SORT_LABELS[value]} ▾
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-20 bg-white border border-[#E8E2DA] rounded-lg shadow-lg p-1 min-w-[180px]">
          {(Object.keys(SORT_LABELS) as SortOption[]).map(k => (
            <button
              key={k}
              onClick={() => { onChange(k); setOpen(false) }}
              className={"w-full text-left px-2 py-1 text-[11px] rounded " + (k === value ? "bg-[#F5EBE0] text-[#D3755A] font-medium" : "text-[#1B2E4B] hover:bg-[#F5EBE0]")}
            >
              {SORT_LABELS[k]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface SavedProp {
  id: string
  created_at: string
  listing_id: string
  folder_id: string | null
  user_id: string
  listings: any
}

interface Member {
  user_id: string
  email: string | null
  name: string | null
  is_you: boolean
}

interface PendingInvite {
  id: string
  folder_id: string
  email: string | null
  expires_at: string
}

interface FolderWithDetails {
  id: string
  name: string
  user_id: string
  created_at: string
  is_shared: boolean
  archived_at: string | null
  isMine: boolean
  members: Member[]
  pendingInvites: PendingInvite[]
  properties: SavedProp[]
  previousVisitedAt: string | null
}

function getImg(images: any): string | null {
  try {
    const imgs = typeof images === "string" ? JSON.parse(images) : (images || [])
    return Array.isArray(imgs) ? imgs.find((u: string) => u?.startsWith("http")) || null : null
  } catch { return null }
}

/**
 * Derive 2-letter initials. Prefers a full name when available
 * (so "Christian Christensen" -> "CC"), otherwise falls back to email pattern.
 * "alex.smith@..." -> "AS"; "alex@..." -> "A"; nothing -> "??".
 */
function getInitials(member: { name?: string | null; email?: string | null } | string | null): string {
  // Backwards-compat: caller may still pass a bare email string
  let name: string | null = null
  let email: string | null = null
  if (typeof member === "string") {
    email = member
  } else if (member) {
    name = member.name || null
    email = member.email || null
  }
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase() || "??"
  }
  if (!email) return "??"
  const local = email.split("@")[0] || ""
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase() || "??"
}

export default function SavedFoldersClient({
  folders,
  allProperties,
  currentUserId,
}: {
  folders: FolderWithDetails[]
  allProperties: SavedProp[]
  currentUserId: string
}) {
  const router = useRouter()
  const folderSummaries = folders.map(f => ({ id: f.id, name: f.name, is_shared: f.is_shared }))
  const [creating, setCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creatingBusy, setCreatingBusy] = useState(false)

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return
    setCreatingBusy(true)
    try {
      const res = await fetch("/api/saved-folders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      })
      if (res.ok) {
        setNewFolderName("")
        setCreating(false)
        router.refresh()
      }
    } finally {
      setCreatingBusy(false)
    }
  }

  const hasContent = folders.length > 0 || allProperties.length > 0

  if (!hasContent && !creating) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E2DA]">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(211,117,90,0.10)" }}>
          <svg className="w-7 h-7" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{ fontFamily: "Georgia,serif" }}>No saved properties yet</h2>
        <p className="text-sm text-[#9B928E] mb-6">Heart a property to save it here, then organise into folders.</p>
        <Link href="/search" className="px-6 py-3 rounded-xl text-white text-sm no-underline" style={{ background: "#D3755A" }}>Browse properties →</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Create new folder */}
      {creating ? (
        <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name (e.g. Our 2026 move)"
            maxLength={100}
            autoFocus
            className="w-full text-sm border border-[#E8E2DA] rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-[#D3755A]"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateFolder}
              disabled={creatingBusy || !newFolderName.trim()}
              className="px-4 py-2 text-sm rounded-lg font-medium text-white disabled:opacity-50"
              style={{ background: "#D3755A" }}
            >
              {creatingBusy ? "Creating..." : "Create folder"}
            </button>
            <button onClick={() => { setCreating(false); setNewFolderName("") }} className="text-xs text-stone-500 hover:text-stone-700">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="text-xs text-[#D3755A] hover:underline self-start">+ New folder</button>
      )}

      {/* Folders (created + member of) */}
      {folders.map((f) => (
        <FolderCard key={f.id} folder={f} allFolders={folderSummaries} currentUserId={currentUserId} />
      ))}

      {/* Unfoldered properties (your own, not in any folder) */}
      {allProperties.length > 0 && (
        <AllPropertiesSection properties={allProperties} allFolders={folderSummaries} currentUserId={currentUserId} />
      )}
    </div>
  )
}

function FolderCard({ folder, allFolders, currentUserId }: { folder: FolderWithDetails, allFolders: { id: string; name: string; is_shared: boolean }[], currentUserId: string }) {
  const router = useRouter()
  const [folderSort, setFolderSort] = useState<SortOption>("newest")
  const sortedFolderProperties = useMemo(() => sortProperties(folder.properties, folderSort), [folder.properties, folderSort])
  const [showAll, setShowAll] = useState(false)
  const [membersModalOpen, setMembersModalOpen] = useState(false)
  // Treat 'expanded' as always true now (cards always shown); kept for compatibility with View-all gating below
  const expanded = true
  const memberLookup = useMemo(() => {
    const m = new Map<string, { email: string | null; name: string | null; is_you: boolean }>()
    folder.members.forEach((mem) => m.set(mem.user_id, { email: mem.email, name: mem.name, is_you: mem.is_you }))
    return m
  }, [folder.members])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const propCount = folder.properties.length
  const thumbs = folder.properties.slice(0, 4).map((p) => getImg(p.listings?.images)).filter(Boolean) as string[]

  async function handleEmailInvite() {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      setError("Enter a valid email"); return
    }
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/saved-folders/${folder.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed"); return }
      setInviteEmail("")
      router.refresh()
    } finally { setBusy(false) }
  }

  async function handleShareLink() {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/saved-folders/${folder.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed"); return }
      setInviteUrl(data.inviteUrl)
    } finally { setBusy(false) }
  }

  async function handleDelete() {
    if (!confirm(`Delete the folder "${folder.name}"? Properties in it will go back to Unsorted. This cannot be undone.`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/saved-folders/${folder.id}`, { method: "DELETE" })
      if (res.ok) router.refresh()
    } finally { setBusy(false) }
  }

  async function handleLeave() {
    if (!confirm(`Leave \"${folder.name}\"? Other members will keep the folder; you won\'t see its properties anymore.`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/saved-folders/${folder.id}/leave`, { method: "POST" })
      if (res.ok) router.refresh()
    } finally { setBusy(false) }
  }

  async function handleRemove(userId: string, email: string | null) {
    if (!confirm(`Remove ${email || "this member"} from the folder?`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/saved-folders/${folder.id}/remove-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) router.refresh()
    } finally { setBusy(false) }
  }

  async function copyLink() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-lg font-medium text-[#1B2E4B]" style={{ fontFamily: "Georgia,serif" }}>{folder.name}</h2>
              {folder.is_shared && (
                <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full" style={{ background: "#F5EBE0", color: "#D3755A" }}>
                  Shared
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500">
              {propCount} {propCount === 1 ? "property" : "properties"} · 
              <button onClick={(e) => { e.stopPropagation(); setMembersModalOpen(true) }} className="text-[#D3755A] hover:underline ml-1">
                {folder.members.length} {folder.members.length === 1 ? "member" : "members"}
              </button>
            </p>
          </div>

        </div>

        {/* Member initials row */}
        {folder.members.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex -space-x-1.5">
              {folder.members.slice(0, 5).map((m) => (
                <div
                  key={m.user_id}
                  className="w-6 h-6 rounded-full bg-[#F5EBE0] text-[#1B2E4B] text-[10px] font-semibold flex items-center justify-center border-2 border-white"
                  title={m.name ? `${m.name} (${m.email || ""})` : (m.email || m.user_id.slice(0, 8))}
                >
                  {getInitials(m)}
                </div>
              ))}
              {folder.members.length > 5 && (
                <div className="w-6 h-6 rounded-full bg-stone-200 text-stone-600 text-[9px] font-semibold flex items-center justify-center border-2 border-white">
                  +{folder.members.length - 5}
                </div>
              )}
            </div>
          </div>
        )}



        {/* Actions row */}
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <button onClick={() => setShowInvite(!showInvite)} className="text-[#D3755A] hover:underline">
            {folder.is_shared ? "Invite more" : "Add a participant"}
          </button>
          {folder.is_shared ? (
            <button onClick={handleLeave} disabled={busy} className="text-stone-500 hover:text-red-600 disabled:opacity-50">
              Leave folder
            </button>
          ) : (
            <button onClick={handleDelete} disabled={busy} className="text-stone-500 hover:text-red-600 disabled:opacity-50">
              Delete folder
            </button>
          )}
        </div>

        {/* Invite UI (collapsed) */}
        {showInvite && (
          <div className="mt-4 pt-4 border-t border-[#E8E2DA] space-y-3">
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Invite by email</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="them@example.com"
                  className="flex-1 text-sm border border-[#E8E2DA] rounded-lg px-3 py-2 focus:outline-none focus:border-[#D3755A]"
                />
                <button
                  onClick={handleEmailInvite}
                  disabled={busy || !inviteEmail.trim()}
                  className="px-3 py-2 text-xs rounded-lg font-medium text-white disabled:opacity-50"
                  style={{ background: "#D3755A" }}
                >
                  Send
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Or share a link</label>
              {inviteUrl ? (
                <div className="flex gap-2">
                  <input type="text" value={inviteUrl} readOnly className="flex-1 text-xs border border-[#E8E2DA] rounded-lg px-3 py-2 bg-stone-50 font-mono" />
                  <button onClick={copyLink} className="px-3 py-2 text-xs rounded-lg font-medium border border-[#E8E2DA] hover:bg-[#F8F4ED]">
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              ) : (
                <button onClick={handleShareLink} disabled={busy} className="text-xs text-[#D3755A] hover:underline">
                  Generate share link
                </button>
              )}
            </div>
            {folder.pendingInvites.length > 0 && (
              <div className="text-xs text-stone-500">
                <div className="font-semibold mb-1">Pending</div>
                <ul className="space-y-0.5">
                  {folder.pendingInvites.map((inv) => (
                    <li key={inv.id} className="flex justify-between">
                      <span className="truncate">{inv.email || "Share link"}</span>
                      <span className="text-stone-400">expires {new Date(inv.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        )}
      </div>

      {/* Property grid (always shown) */}
      {folder.properties.length > 0 && (
        <div className="border-t border-[#E8E2DA] bg-[#FAF6F0] p-5">
          <div className="flex justify-end mb-3">
            <SortDropdown value={folderSort} onChange={setFolderSort} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(showAll ? sortedFolderProperties : sortedFolderProperties.slice(0, 4)).map((p) => (
              <PropertyMiniCard 
                key={p.id} 
                property={p} 
                allFolders={allFolders} 
                currentUserId={currentUserId} 
                memberLookup={memberLookup}
                previousVisitedAt={folder.previousVisitedAt}
                isShared={folder.is_shared}
              />
            ))}
          </div>
          {sortedFolderProperties.length > 4 && (
            <div className="text-center mt-3">
              <button onClick={() => setShowAll(!showAll)} className="text-xs text-[#D3755A] hover:underline">
                {showAll ? "Show less" : `View all (${sortedFolderProperties.length})`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Members modal */}
      {membersModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setMembersModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-lg font-medium text-[#1B2E4B]" style={{ fontFamily: "Georgia,serif" }}>Members</h3>
              <button onClick={() => setMembersModalOpen(false)} className="text-stone-500 hover:text-[#1B2E4B] text-xl">×</button>
            </div>
            <ul className="space-y-2">
              {folder.members.map((m) => (
                <li key={m.user_id} className="flex items-center justify-between gap-2 py-2 border-b border-[#E8E2DA] last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#F5EBE0] text-[#1B2E4B] text-xs font-semibold flex items-center justify-center flex-shrink-0">
                      {getInitials(m)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-[#1B2E4B] truncate">{m.name || m.email || m.user_id.slice(0, 8)}</div>
                      {m.email && m.name && <div className="text-[10px] text-stone-500 truncate">{m.email}</div>}
                      {m.is_you && <div className="text-[10px] text-stone-500">You</div>}
                    </div>
                  </div>
                  {!m.is_you && folder.is_shared && (
                    <button
                      onClick={() => { handleRemove(m.user_id, m.email); setMembersModalOpen(false) }}
                      disabled={busy}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50 flex-shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function AllPropertiesSection({ properties, allFolders, currentUserId }: { properties: SavedProp[], allFolders: { id: string; name: string; is_shared: boolean }[], currentUserId: string }) {
  const [expanded, setExpanded] = useState(true)
  const [sort, setSort] = useState<SortOption>("newest")
  const sorted = useMemo(() => sortProperties(properties, sort), [properties, sort])
  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden">
      <div className="p-5 flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-medium text-[#1B2E4B]" style={{ fontFamily: "Georgia,serif" }}>All</h2>
          <p className="text-xs text-stone-500">All {properties.length} saved {properties.length === 1 ? "property" : "properties"}</p>
        </div>
        <div className="flex items-center gap-3">
          {expanded && <SortDropdown value={sort} onChange={setSort} />}
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-stone-500 hover:text-[#D3755A]">
            {expanded ? "Collapse" : "View"}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-[#E8E2DA] bg-[#FAF6F0] p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sorted.map((p) => (
              <PropertyMiniCard key={p.id} property={p} allFolders={allFolders} currentUserId={currentUserId} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PropertyMiniCard({ 
  property, 
  allFolders,
  currentUserId,
  memberLookup,
  previousVisitedAt,
  isShared,
}: { 
  property: SavedProp
  allFolders: { id: string; name: string; is_shared: boolean }[]
  currentUserId: string
  memberLookup?: Map<string, { email: string | null; name: string | null; is_you: boolean }>
  previousVisitedAt?: string | null
  isShared?: boolean
}) {
  const router = useRouter()
  const l = property.listings
  const [folderMenuOpen, setFolderMenuOpen] = useState(false)
  const [creatingNewFolder, setCreatingNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [busy, setBusy] = useState(false)
  
  if (!l) return null
  const img = getImg(l.images)
  const canUnsave = property.user_id === currentUserId
  const isInFolder = !!property.folder_id
  // "new" if this user hasn't visited the folder since this property was added
  const isNew = isShared && previousVisitedAt
    ? new Date(property.created_at).getTime() > new Date(previousVisitedAt).getTime()
    : false
  // "added by X" only shown in shared folders, only if NOT the current user
  const saver = memberLookup?.get(property.user_id)
  const showAddedBy = isShared && saver && !saver.is_you

  async function createAndMove() {
    if (!newFolderName.trim()) return
    setBusy(true)
    try {
      // 1. Create the folder
      const createRes = await fetch("/api/saved-folders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      })
      const createData = await createRes.json()
      if (!createRes.ok || !createData.folder?.id) {
        console.error("Folder create failed:", createData)
        return
      }
      // 2. Move the property to it
      await fetch("/api/saved/property/move", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved_id: property.id, folder_id: createData.folder.id }),
      })
      setCreatingNewFolder(false)
      setNewFolderName("")
      setFolderMenuOpen(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function moveToFolder(folderId: string | null) {
    setBusy(true); setFolderMenuOpen(false)
    try {
      const res = await fetch("/api/saved/property/move", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved_id: property.id, folder_id: folderId }),
      })
      if (res.ok) router.refresh()
    } finally { setBusy(false) }
  }

  async function unsave() {
    if (!confirm("Remove this property from saved?")) return
    setBusy(true)
    try {
      const res = await fetch("/api/saved/property", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved_id: property.id }),
      })
      if (res.ok) router.refresh()
    } finally { setBusy(false) }
  }

  const otherFolders = allFolders.filter(f => f.id !== property.folder_id)

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-xl overflow-hidden relative group">
      {/* Main card row: image + details + pills */}
      <Link href={`/listings/${l.id}`} className="flex gap-3 hover:bg-[#FAF6F0] transition-colors no-underline">
        {img && (
          <div className="w-24 h-20 bg-stone-100 flex-shrink-0 overflow-hidden">
            <img src={img} alt={l.address || ""} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0 p-2 pr-2">
          <div className="text-sm font-semibold text-[#1B2E4B] truncate" style={{ fontFamily: "Georgia,serif" }}>
            £{l.price?.toLocaleString()}
            {l.listing_type === "rent" ? <span className="text-[10px] font-normal text-stone-500">/mo</span> : null}
          </div>
          <div className="text-[11px] text-stone-600 truncate">{l.address}</div>
          <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>{l.bedrooms} bed · {l.property_type}</span>
            {showAddedBy && saver && (
              <span className="text-stone-500">· added by {getInitials(saver)}</span>
            )}
            {isNew && (
              <span className="text-[9px] font-semibold uppercase tracking-wide text-white px-1.5 py-0.5 rounded-full" style={{ background: "#D3755A" }}>New</span>
            )}
          </div>
        </div>
        {/* Action pills on the right side */}
        <div className="flex flex-col gap-1 p-2 pl-0 justify-center flex-shrink-0">
          <span 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/listings/${l.id}` }}
            className="text-[10px] font-medium text-[#D3755A] bg-[#F5EBE0] hover:bg-[#EAD9C6] px-2 py-1 rounded-full whitespace-nowrap cursor-pointer text-center"
          >
            View
          </span>
          <span
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/listings/${l.id}/offer` }}
            className="text-[10px] font-medium text-white hover:opacity-90 px-2 py-1 rounded-full whitespace-nowrap cursor-pointer text-center"
            style={{ background: "#D3755A" }}
          >
            Offer
          </span>
        </div>
      </Link>
      
      {/* Folder picker + Remove */}
      <div className="px-2 py-1.5 border-t border-[#E8E2DA] bg-[#FAF6F0] text-[10px] relative flex items-center justify-between">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFolderMenuOpen(!folderMenuOpen) }}
          disabled={busy}
          className="text-[#D3755A] hover:underline disabled:opacity-50"
        >
          {isInFolder ? "Move to folder" : "+ Add to folder"}
        </button>
        {canUnsave && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); unsave() }}
            disabled={busy}
            className="text-stone-500 hover:text-red-600 disabled:opacity-50"
          >
            Remove
          </button>
        )}
        {folderMenuOpen && (
          <div 
            className="absolute left-2 bottom-7 z-20 bg-white border border-[#E8E2DA] rounded-lg shadow-lg p-1 min-w-[180px]"
            onClick={(e) => e.stopPropagation()}
          >
            {isInFolder && (
              <button
                onClick={() => moveToFolder(null)}
                className="w-full text-left px-2 py-1 text-[11px] text-[#1B2E4B] hover:bg-[#F5EBE0] rounded"
              >
                Unsorted (no folder)
              </button>
            )}
            {otherFolders.length === 0 && !isInFolder && (
              <div className="px-2 py-1 text-[10px] text-stone-400">No folders yet. Create one below.</div>
            )}
            {otherFolders.map(f => (
              <button
                key={f.id}
                onClick={() => moveToFolder(f.id)}
                className="w-full text-left px-2 py-1 text-[11px] text-[#1B2E4B] hover:bg-[#F5EBE0] rounded flex items-center gap-1.5"
              >
                <span className="truncate">{f.name}</span>
                {f.is_shared && <span className="text-[8px] uppercase tracking-wide text-[#D3755A] flex-shrink-0">shared</span>}
              </button>
            ))}
            <div className="border-t border-[#E8E2DA] mt-1 pt-1">
              {creatingNewFolder ? (
                <div className="px-1 py-1">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") createAndMove() }}
                    placeholder="Folder name"
                    autoFocus
                    maxLength={100}
                    className="w-full text-[11px] border border-[#E8E2DA] rounded px-2 py-1 mb-1 focus:outline-none focus:border-[#D3755A]"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={createAndMove}
                      disabled={busy || !newFolderName.trim()}
                      className="flex-1 px-2 py-1 text-[11px] rounded font-medium text-white disabled:opacity-50"
                      style={{ background: "#D3755A" }}
                    >
                      Create + move
                    </button>
                    <button
                      onClick={() => { setCreatingNewFolder(false); setNewFolderName("") }}
                      className="px-2 py-1 text-[11px] text-stone-500 hover:text-stone-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreatingNewFolder(true)}
                  className="w-full text-left px-2 py-1 text-[11px] text-[#D3755A] hover:bg-[#F5EBE0] rounded"
                >
                  + New folder
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

