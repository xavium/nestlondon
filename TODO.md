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
