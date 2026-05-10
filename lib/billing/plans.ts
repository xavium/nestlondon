/**
 * NestLondon subscription plans.
 *
 * Source of truth for plan codes, pricing, and listing limits. Stripe price IDs
 * are filled in from environment variables so the same code works in test and
 * live modes.
 *
 * Pricing is VAT-inclusive. Stripe is configured with VAT included in the price
 * (no separate tax line) — UK consumer-facing convention.
 */

export type PlanCode =
  | 'solo_agent'
  | 'small_agent'
  | 'growing_agent'
  | 'single_owner'
  | 'multi_owner'

export type Cadence = 'monthly' | 'annual'

export type Audience = 'agent' | 'owner'

export interface Plan {
  code: PlanCode
  audience: Audience
  name: string
  description: string
  /** Maximum active listings allowed on this plan. null = unlimited */
  maxListings: number | null
  /** Pricing in pence, VAT-inclusive */
  monthlyPence: number
  annualPence: number
  /** Stripe price IDs, set via env (server-side use only for monthly) */
  stripeMonthlyPriceId: string | undefined
  stripeAnnualPriceId: string | undefined
}

export const PLANS: Record<PlanCode, Plan> = {
  solo_agent: {
    code: 'solo_agent',
    audience: 'agent',
    name: 'Agent Lite',
    description: 'For independent agents listing up to 5 properties.',
    maxListings: 5,
    monthlyPence: 2900,
    annualPence: 27800, // 20% off £348/yr → £278.40
    stripeMonthlyPriceId: process.env.STRIPE_PRICE_AGENT_LITE_MONTHLY,
    stripeAnnualPriceId: process.env.STRIPE_PRICE_AGENT_LITE_ANNUAL,
  },
  small_agent: {
    code: 'small_agent',
    audience: 'agent',
    name: 'Agent Core',
    description: 'For small agencies listing up to 20 properties.',
    maxListings: 20,
    monthlyPence: 7900,
    annualPence: 75800,
    stripeMonthlyPriceId: process.env.STRIPE_PRICE_AGENT_CORE_MONTHLY,
    stripeAnnualPriceId: process.env.STRIPE_PRICE_AGENT_CORE_ANNUAL,
  },
  growing_agent: {
    code: 'growing_agent',
    audience: 'agent',
    name: 'Agent Pro',
    description: 'For agencies listing up to 50 properties.',
    maxListings: 50,
    monthlyPence: 14900,
    annualPence: 143000,
    stripeMonthlyPriceId: process.env.STRIPE_PRICE_AGENT_PRO_MONTHLY,
    stripeAnnualPriceId: process.env.STRIPE_PRICE_AGENT_PRO_ANNUAL,
  },
  single_owner: {
    code: 'single_owner',
    audience: 'owner',
    name: 'Owner Lite',
    description: 'For owners and landlords listing one property.',
    maxListings: 1,
    monthlyPence: 1500,
    annualPence: 14400,
    stripeMonthlyPriceId: process.env.STRIPE_PRICE_OWNER_LITE_MONTHLY,
    stripeAnnualPriceId: process.env.STRIPE_PRICE_OWNER_LITE_ANNUAL,
  },
  multi_owner: {
    code: 'multi_owner',
    audience: 'owner',
    name: 'Owner Pro',
    description: 'For owners and landlords listing up to 5 properties.',
    maxListings: 5,
    monthlyPence: 3900,
    annualPence: 37400,
    stripeMonthlyPriceId: process.env.STRIPE_PRICE_OWNER_PRO_MONTHLY,
    stripeAnnualPriceId: process.env.STRIPE_PRICE_OWNER_PRO_ANNUAL,
  },
}

export function plansFor(audience: Audience): Plan[] {
  return Object.values(PLANS).filter(p => p.audience === audience)
}

export function getPlan(code: string): Plan | null {
  return PLANS[code as PlanCode] ?? null
}

export function priceFor(plan: Plan, cadence: Cadence): number {
  return cadence === 'monthly' ? plan.monthlyPence : plan.annualPence
}

export function formatPrice(pence: number): string {
  const pounds = pence / 100
  return pounds % 1 === 0
    ? `£${pounds.toLocaleString()}`
    : `£${pounds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
