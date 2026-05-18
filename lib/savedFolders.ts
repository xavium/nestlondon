/**
 * Saved-property folder sharing.
 *
 * Pivots away from the earlier "joint search" model. The folder is now the unit
 * of sharing: a user can be a member of multiple shared folders (one per
 * collaboration), and each folder can independently be solo or shared.
 *
 * Schema: see db/migrations/0009_folder_sharing.sql
 *
 * Key invariants:
 *   - saved_property_folders.user_id is the CREATOR (immutable)
 *   - saved_property_folder_members lists everyone in the folder
 *   - The creator is NOT automatically a member; we always insert a member
 *     row when creating a folder, so a creator who leaves doesn'\''t inherit ghosts
 *   - is_shared flips to true when first invite is created, never flips back
 */
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { randomBytes } from "crypto"

export interface SavedFolder {
  id: string
  user_id: string  // creator
  name: string
  created_at: string
  is_shared: boolean
  archived_at: string | null
}

export interface FolderMember {
  folder_id: string
  user_id: string
  joined_at: string
  joined_via: "creator" | "email_invite" | "share_link"
}

export interface FolderInvite {
  id: string
  folder_id: string
  email: string | null
  token: string
  created_by: string
  created_at: string
  expires_at: string
  used_at: string | null
  used_by: string | null
}

const INVITE_EXPIRY_DAYS = 14
const SHARE_LINK_EXPIRY_DAYS = 30

/**
 * All folders relevant to this user: ones they created plus ones they\'re
 * a member of. Deduplicated. Excludes archived.
 *
 * Returns folders ordered by created_at descending.
 */
export async function getUserFolders(
  supabase: SupabaseClient,
  userId: string,
): Promise<SavedFolder[]> {
  // RLS on folders allows reading rows where user_id = me OR I\'m a member.
  // So a single select with no extra filter returns the union.
  const { data, error } = await supabase
    .from("saved_property_folders")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
  if (error) {
    console.error("[savedFolders] getUserFolders error:", error.message)
    return []
  }
  return data || []
}

/**
 * Create a new folder. Solo by default; can be promoted to shared by inviting.
 * The creator is added as a member with joined_via='\''creator'\''. This avoids
 * the edge case of "no members but creator can still see it via RLS user_id check".
 */
export async function createFolder(
  supabase: SupabaseClient,
  user: User,
  name: string,
): Promise<SavedFolder> {
  const { data: folder, error: folderErr } = await supabase
    .from("saved_property_folders")
    .insert({ name, user_id: user.id, is_shared: false })
    .select()
    .single()
  if (folderErr || !folder) throw folderErr || new Error("Failed to create folder")

  // Add creator as member
  const { error: memErr } = await supabase
    .from("saved_property_folder_members")
    .insert({
      folder_id: folder.id,
      user_id: user.id,
      joined_via: "creator",
    })
  if (memErr) {
    // Roll back the folder; partial state is worse than no state
    await supabase.from("saved_property_folders").delete().eq("id", folder.id)
    throw memErr
  }
  return folder
}

/**
 * Create an invite for a folder. Email mode (specific recipient) or
 * share-link mode (open token, anyone). Side effect: marks the folder
 * is_shared=true on first invite.
 */
export async function createFolderInvite(
  supabase: SupabaseClient,
  user: User,
  folderId: string,
  email: string | null,
): Promise<FolderInvite> {
  const token = randomBytes(24).toString("base64url")
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + (email ? INVITE_EXPIRY_DAYS : SHARE_LINK_EXPIRY_DAYS))

  const { data, error } = await supabase
    .from("saved_property_folder_invites")
    .insert({
      folder_id: folderId,
      email,
      token,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()
  if (error || !data) throw error || new Error("Failed to create invite")

  // Mark folder as shared (idempotent)
  await supabase
    .from("saved_property_folders")
    .update({ is_shared: true })
    .eq("id", folderId)

  return data
}

/**
 * Accept a folder invite. Returns the folder on success, error otherwise.
 */
export async function acceptFolderInvite(
  supabase: SupabaseClient,
  user: User,
  token: string,
): Promise<{ folder: SavedFolder; via: "email_invite" | "share_link" } | { error: string }> {
  const { data: invite } = await supabase
    .from("saved_property_folder_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle()
  if (!invite) return { error: "Invite not found" }
  if (new Date(invite.expires_at) < new Date()) return { error: "Invite has expired" }
  if (invite.email && invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    return { error: "This invite was sent to a different email address" }
  }
  if (invite.email && invite.used_at) return { error: "Invite has already been used" }

  // Already a member?
  const { data: existing } = await supabase
    .from("saved_property_folder_members")
    .select("user_id")
    .eq("folder_id", invite.folder_id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (existing) {
    // Already in. Return the folder.
    const { data: folder } = await supabase
      .from("saved_property_folders")
      .select("*")
      .eq("id", invite.folder_id)
      .single()
    return { folder: folder!, via: invite.email ? "email_invite" : "share_link" }
  }

  // Mark email invite used (share links are reusable)
  if (invite.email) {
    await supabase
      .from("saved_property_folder_invites")
      .update({ used_at: new Date().toISOString(), used_by: user.id })
      .eq("id", invite.id)
  }

  // Add as member
  const via: "email_invite" | "share_link" = invite.email ? "email_invite" : "share_link"
  const { error: memErr } = await supabase
    .from("saved_property_folder_members")
    .insert({
      folder_id: invite.folder_id,
      user_id: user.id,
      joined_via: via,
    })
  if (memErr) return { error: memErr.message }

  const { data: folder } = await supabase
    .from("saved_property_folders")
    .select("*")
    .eq("id", invite.folder_id)
    .single()
  return { folder: folder!, via }
}

/**
 * Leave a folder. If the actor is the last member (after their departure),
 * the folder is deleted. This also handles the creator leaving.
 */
export async function leaveFolder(
  supabase: SupabaseClient,
  user: User,
  folderId: string,
): Promise<{ success: boolean; deleted: boolean; error?: string }> {
  // Count other members
  const { count: otherMembers } = await supabase
    .from("saved_property_folder_members")
    .select("*", { count: "exact", head: true })
    .eq("folder_id", folderId)
    .neq("user_id", user.id)

  const { error } = await supabase
    .from("saved_property_folder_members")
    .delete()
    .eq("folder_id", folderId)
    .eq("user_id", user.id)
  if (error) return { success: false, deleted: false, error: error.message }

  let deleted = false
  if ((otherMembers ?? 0) === 0) {
    await supabase.from("saved_property_folders").delete().eq("id", folderId)
    deleted = true
  }
  return { success: true, deleted }
}

/**
 * Remove a different member from the folder. Any member can do this.
 */
export async function removeFolderMember(
  supabase: SupabaseClient,
  actorUserId: string,
  folderId: string,
  removedUserId: string,
): Promise<{ success: boolean; error?: string }> {
  if (actorUserId === removedUserId) {
    return { success: false, error: "Use leaveFolder to remove yourself" }
  }
  const { error } = await supabase
    .from("saved_property_folder_members")
    .delete()
    .eq("folder_id", folderId)
    .eq("user_id", removedUserId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
