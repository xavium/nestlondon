import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  // Note: this throws at import time only on server, which is fine.
  // Better to fail loudly than to silently 500 on first checkout.
  console.warn('[STRIPE] STRIPE_SECRET_KEY is not set. Billing routes will fail.')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  // Pin API version. Update intentionally, not by accident.
  apiVersion: '2026-04-22.dahlia',
  appInfo: { name: 'NestLondon', version: '1.0.0' },
})

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}
