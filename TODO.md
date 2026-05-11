# NestLondon backlog

## UX fixes
1. **"Find your perfect borough" CTA** — currently links to `/#borough-quiz` which navigates and leaves nav search bar unusable. Change to in-page scroll only.
2. **Portal greeting** — add "Good morning/afternoon/evening [name]" at the top of owner + agent portal based on local time.
4. **Nav: remove "Borough guides" link** from portal/account pages. Keep on homepage, search page, and listing pages only.
5. **Listing card "Rightmove" badge** — inconsistent: some show the source corner label, some don't. Audit + make consistent for all Rightmove listings.
6. **Agent viewing own listing** — hide "Book a viewing" / "Request details" actions. Replace with "View in my portal" button.
7. **Account dropdown** — missing the "Agent portal" link when logged in as agent.
11. **Analytics conversion funnel** — viewings should count as enquiries so viewings never exceeds enquiries (fix data model or display logic).

## Features
3. **Agent admin login / roles within agency** — currently any agent on the account can do everything. Introduce an admin role within an agency so critical actions (delete account, remove team member, change billing) are admin-only.
8. **Viewings calendar navigation** — add prev/next month controls so past viewings are visible.
9. **Mark viewing outcome** — ✓ basic done. Deferred to future pass:
   - Split calendar popup by state: past / future-confirmed / future-proposed
   - For past: hide "Manage viewing", show outcome buttons + "Message user"
   - For future-proposed: show "Confirm viewing" + "Propose alternative slot" (inline form) instead of outcome buttons
   - For future-confirmed: hide outcome buttons
   - Freeform `outcome_note` textarea in the popup (new DB column needed)
   - /messages to read `?tenant_email=` and `?listing_id=` params and pre-fill recipient
10. **Offer submission flow** — allow users to submit an offer (lettings + sales) with form fields + attachments. Routes offer to owner/agent. Needs:
    - New DB table (offers)
    - Offer form UI with file upload
    - Notification to owner/agent
    - Owner/agent view of received offers
12. **Booking prompt in messaging** — after agent/owner responds to an enquiry, show a "Book a viewing" prompt to the user in the message thread.

## Anthropic / cost
13. **Photo tags backfill** — run `scraper/backfill_photo_tags.py` to populate `raw_data.photo_tags` for the ~332 listings currently missing them. Defer until site is more progressed; estimated ~$1.50 with Haiku 4.5. Coverage today: ~11% (40/372). Pre-warming would make the Contemporary/Open plan/etc. style + features pills + outside-space detection appear on all listings everywhere (search cards, map popouts, detail page) instead of only after first visit.

## Backlog from earlier sessions

### Search & maps
14. **Borough quiz rent/buy branching audit** — confirm rent-vs-buy logic is wired through all quiz steps and results.
15. **Postcode boundary polygons** — replace the circle-radius search visualisation with actual postcode boundaries.
16. **Google Maps render** — switch from current map provider where it makes sense. Requires Google Cloud project + API key.
17. **Local amenities** — show nearby cafes, gyms, supermarkets on listing detail. Needs Google Places API; pricing decision required.
18. **Search map popout photo carousel** — map popouts now show stats + outside space; add a photo carousel so users can browse images without leaving the map.
19. **Multi-location commute + mode selector** — let user enter 2+ commute destinations and pick travel mode (walking, transit, cycling).

### Listings
20. **Listing price guide** — show comparables-derived price range / "this is X% above area average" on the public listing page (not just owner dashboard).
21. **Service charge / ground rent bubble** — surface on listing detail where available from scraped data.
22. **Leasehold remaining years** — display where available; flag short leases (<80 years) for buyers.
23. **Price history** — show historical price changes for a listing (where re-listed) and area trends.
24. **Direct vs Rightmove dedupe** — when an owner uploads a listing already on Rightmove, merge them so the Rightmove version is suppressed.

### Owner / agent features
25. **Premium listings** — paid promotion: featured positioning, badges, higher placement.
26. **Admin overview** — internal dashboard showing all listings, owners, agents, billing across the site.
27. **Joint searches** — allow two users to share a search session, save listings together, see each other's reactions.
28. **Agent portal ↔ CRM integration** — sync listings + enquiries with external CRMs (Reapit, Alto, etc.).
29. **Agent auto-approval toggle** — per-agency setting: whether new listings need admin review or go live immediately.
30. **Agent website scraping** — agents who don't list on Rightmove still have websites; scrape those too.
31. **"Looking for an agent?" surface** — feature to help users find/contact agents directly.

### Home page polish
32. **Typewriter animation on home search** — animated placeholder text cycling through example queries.
33. **Resources section** — moving-to-London guides, council info, transport overview, neighbourhood guides.

### Brand
34. **New name + domain research** — explore alternative names and check domain availability.
35. **Design reformat** — open-ended visual refresh pass on the whole site.

### Scraping & legal
36. **Scraping schedule** — Python scraper needs separate hosting (currently runs locally). Decide between cron job, dedicated server, or scheduled cloud function.
37. **Scraping legal compliance** — review terms-of-service for Rightmove and other sources; consult on safe operating boundaries.

## Operations (launch readiness)
38. **Stripe live mode setup** — switch from test to live keys, recreate price objects in live mode, register production webhook endpoint, set live env vars in Vercel.
39. **Resend custom domain verification** — currently sending from `onboarding@resend.dev`. Configure SPF/DKIM/DMARC for nestlondon.co.uk (or final domain) so emails come from a branded address.
40. **RLS audit** — review row-level security on pre-existing tables (`listings`, `viewing_requests`, `offers`, `enquiries`, `messages`, `saved_properties`, `agency_agents`, `renter_profiles`) before going public.
