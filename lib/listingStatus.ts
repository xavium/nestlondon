export type ListingStatus = 'pending' | 'live' | 'paused' | 'deactivated'

export const STATUS_LABELS: Record<ListingStatus, string> = {
  live: 'Live',
  pending: 'Pending review',
  paused: 'Paused',
  deactivated: 'Deactivated',
}

export const STATUS_BADGE_CLASSES: Record<ListingStatus, string> = {
  live: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700',
  paused: 'bg-stone-100 text-stone-600',
  deactivated: 'bg-red-50 text-red-700',
}

/**
 * Resolves the listing's status. Falls back to inferring from is_active for
 * any rows that haven't been backfilled yet.
 */
export function resolveStatus(listing: { status?: string | null, is_active?: boolean }): ListingStatus {
  if (listing.status === 'live' || listing.status === 'pending' || listing.status === 'paused' || listing.status === 'deactivated') {
    return listing.status
  }
  return listing.is_active ? 'live' : 'pending'
}

export interface StatusAction {
  key: 'deactivate' | 'reactivate' | 'pause' | 'resubmit'
  label: string
  /** Tailwind classes for the button border + text */
  className: string
  /** Optional confirm message before firing */
  confirm?: string
}

/**
 * Which user-driven action buttons make sense for a given status.
 * Delete is shown separately and isn't part of this set.
 */
export function actionsForStatus(status: ListingStatus): StatusAction[] {
  switch (status) {
    case 'live':
      return [{
        key: 'deactivate',
        label: 'Deactivate',
        className: 'border-amber-200 text-amber-600 hover:bg-amber-50',
        confirm: 'Deactivate this listing? It will be removed from the site. You can reactivate it later without going through review again, unless you make changes.',
      }]
    case 'deactivated':
      return [{
        key: 'reactivate',
        label: 'Reactivate',
        className: 'border-green-200 text-green-600 hover:bg-green-50',
      }]
    case 'pending':
      return [{
        key: 'pause',
        label: 'Pause review',
        className: 'border-stone-200 text-stone-600 hover:bg-stone-50',
        confirm: 'Pause this listing? It will be removed from the admin review queue. You can resubmit later.',
      }]
    case 'paused':
      return [{
        key: 'resubmit',
        label: 'Resubmit for review',
        className: 'border-amber-200 text-amber-600 hover:bg-amber-50',
      }]
  }
}
