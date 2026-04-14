'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ViewingConfirmPageInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const action = searchParams.get('action') || 'confirm'
  const [status, setStatus] = useState<'loading'|'success'|'error'>('loading')
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    fetch('/api/listings/viewing-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action })
    }).then(r => r.json()).then(d => { if (d.success) { setData(d); setStatus('success') } else setStatus('error') })
    .catch(() => setStatus('error'))
  }, [token, action])

  return (
    <main className="min-h-screen bg-[#F5EBE0] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="text-2xl font-light text-[#1B2E4B] no-underline" style={{fontFamily:'Georgia,serif'}}>
          nest<span style={{color:'#D3755A'}} className="italic">london</span>
        </Link>
        {status === 'loading' && <div className="mt-12 text-[#9B928E] text-sm">Processing...</div>}
        {status === 'success' && action === 'confirm' && (
          <div className="mt-12">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{background:'rgba(211,117,90,0.12)'}}>
              <svg className="w-8 h-8" fill="none" stroke="#D3755A" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <h1 className="text-2xl font-light text-[#1B2E4B] mb-3" style={{fontFamily:'Georgia,serif'}}>Viewing confirmed!</h1>
            <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5 text-left mb-5">
              <div className="text-xs text-[#9B928E] mb-1">Property</div>
              <div className="text-sm text-[#1B2E4B] font-medium mb-3">{data?.address}</div>
              <div className="text-xs text-[#9B928E] mb-1">Date & Time</div>
              <div className="text-sm text-[#1B2E4B]">{data?.slot?.date} at {data?.slot?.time}</div>
            </div>
            <p className="text-xs text-[#9B928E]">A confirmation has been sent to your email.</p>
          </div>
        )}
        {status === 'success' && action === 'decline' && (
          <div className="mt-12">
            <h1 className="text-2xl font-light text-[#1B2E4B] mb-3" style={{fontFamily:'Georgia,serif'}}>Viewing declined</h1>
            <p className="text-sm text-[#3D3A38] mb-5">The owner has been notified. You can contact them to arrange a new time.</p>
            <Link href="/" className="text-sm no-underline" style={{color:'#D3755A'}}>Browse other properties →</Link>
          </div>
        )}
        {status === 'error' && (
          <div className="mt-12">
            <h1 className="text-2xl font-light text-[#1B2E4B] mb-3" style={{fontFamily:'Georgia,serif'}}>Something went wrong</h1>
            <p className="text-sm text-[#9B928E] mb-5">This link may have expired or already been used.</p>
            <Link href="/" className="text-sm no-underline" style={{color:'#D3755A'}}>Back to home →</Link>
          </div>
        )}
      </div>
    </main>
  )
}


export default function ViewingConfirmPage() {
  return <Suspense fallback={null}><ViewingConfirmPageInner /></Suspense>
}
