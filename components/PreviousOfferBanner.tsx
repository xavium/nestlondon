interface Props {
  amount: number
  offerType: 'rent' | 'buy'
  reason: string | null
  rejectedAt: string
}

export default function PreviousOfferBanner({ amount, offerType, reason, rejectedAt }: Props) {
  const suffix = offerType === 'rent' ? '/mo' : ''
  const date = new Date(rejectedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <div className="mb-6 rounded-2xl border border-[#E8D5C4] bg-[#FCF5EE] p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#D3755A20' }}>
          <svg className="w-4 h-4" fill="none" stroke="#D3755A" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[#1B2E4B]">Your previous offer was declined</div>
          <div className="text-xs text-[#6B645F] mt-1">
            Submitted offer of <span className="font-medium text-[#1B2E4B]">£{amount.toLocaleString()}{suffix}</span> on {date}
          </div>
          {reason && (
            <div className="text-xs text-[#6B645F] mt-2 leading-relaxed">
              <span className="text-[#9B928E]">Reason given:</span> {reason}
            </div>
          )}
          <div className="text-xs text-[#6B645F] mt-3">
            Feel free to submit a revised offer below.
          </div>
        </div>
      </div>
    </div>
  )
}
