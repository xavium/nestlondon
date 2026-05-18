# To-do (next session)

Added at end of long session 2026-05-18. Carry forward as priority items.

## Joint-folder feature completion (in-flight from this session)
- [ ] **Save-to-folder picker on listing pages** — Heart button currently saves with no folder context. Should pop a folder picker (or default to last-used folder) and route to `joint_saved_properties` if in a shared folder.
- [ ] **Listing-page heart icon** — Should show "filled" for properties saved in any shared folder, not just personal saves.
- [ ] **Comment thread component on listing page** — Threaded comments + reactions UI scoped to "any shared folder this user is a member of that contains this listing".
- [ ] **GET /api/saved/property** — Currently returns only own saves; should include saves in shared folders the user is a member of.

## Listing page improvements
1. [ ] **Nearest stations**: replace generic logo with correct TfL / National Rail logos (already have TfL roundels for tube/overground; need to handle NR services and DLR separately).
2. [ ] **Borough pill** next to address on listing page (use `listing.borough`, fall back to postcode lookup).
3. [ ] **Phone number reveal** in "request details / book a viewing" panel — "Call agent" button that reveals the number on click (gates one click before exposing).
4. [ ] **Council tax data** — investigate API options. Likely: local-authority bands by postcode → council band rate. Sources: data.gov.uk, individual council CSVs, or VOA API.
5. [ ] **Nearby schools + Ofsted ratings** — DfE GIAS API (Get Information About Schools) gives names, types (state/grammar/private), pupil counts, age ranges, latest Ofsted rating. Already on the master list.
6. [ ] **Performance**: parallelise the async fetches on listing page (currently sequential, slow).

## Map search / listing cards
7. [ ] **Outside space pill** — only show "Garden" / "Outside space" pill when actually present. Don't render a placeholder when absent.
8. [ ] **Less rounded photo corners** on listing cards (visual nit).
9. [ ] **Search card redesign**:
   - Remove blurb
   - 3-photo preview as cover (cycling or grid)
   - More pills (outside-space pill alongside size, etc.)
   - Move price down to BELOW address
   - "Added today" pill (will also be used for Premium listings)

## Search experience
10. [ ] **Saved searches not applying filters correctly** — debug; filters set when saving aren't restored when loaded.
11. [ ] **Rent price increments** between 1750 and 3000 — currently jumps too coarsely; add 2250 and 2750.
12. [ ] **Search bar redesign** — match Zoopla pattern (visually).
13. [ ] **Filter panel as sidebar** — instead of dropdown, sticky side panel like Zoopla.

## New features
14. [ ] **Personal agent feature** — AI-based search assistant for individual users. Major feature, design needed separately.

## Operational (from earlier in session)
- [ ] Stripe live mode
- [ ] Resend custom domain
- [ ] Land Registry monthly cron (sold price refresh)
- [ ] Scraper borough-field check (ensure new scrapes write `borough`)

## Backlog (pre-existing)
- [ ] #13/14 Premium listings + admin panel
- [ ] #19 Driving mode (OSRM)
- [ ] #28 Scraper UK law compliance (legal review)
- [ ] #29 Agent portal ↔ CRM integration
