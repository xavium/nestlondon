'use client'

import LettingsOfferForm from '@/components/LettingsOfferForm'
import SalesOfferForm from '@/components/SalesOfferForm'

interface Props {
  listingId: string
  offerType: 'rent' | 'buy'
  listedPrice: number | null
  user: { email: string; name: string; phone: string }
  profile: any | null
}

export default function OfferForm({ listingId, offerType, listedPrice, user, profile }: Props) {
  if (offerType === 'buy') return <SalesOfferForm listingId={listingId} listedPrice={listedPrice} user={user} />
  return <LettingsOfferForm listingId={listingId} listedPrice={listedPrice} user={user} profile={profile} />
}
