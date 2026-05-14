# Database migrations

Track schema changes here. Migrations are documentation — they are NOT auto-applied. Run them manually in the Supabase SQL editor when shipping a change.

## Naming
- `NNNN_short_description.sql` — zero-padded sequence, snake_case description.
- One migration per logical change.

## Applying
1. Open the migration file, copy its SQL.
2. Paste into the Supabase SQL Editor (Project → SQL Editor → New query).
3. Run. Idempotent migrations (`IF NOT EXISTS` etc.) are safe to re-run.

## History
| # | File | Description |
|---|------|-------------|
| 0001 | `0001_lease_details.sql` | Adds lease_years_remaining, service_charge_annual, ground_rent_annual to listings |
| 0002 | `0002_price_history.sql` | Adds price_history table for tracking buy-side price changes |
