"""
Lease-detail extraction. Pure functions — no I/O, no DB.

Given a listing's letting_details, key_features, and description, returns:
{
  'tenure_cleaned': str | None,           # tenure with any mashed-in lease-years stripped
  'lease_years_remaining': int | None,    # years remaining on the lease
  'service_charge_annual': int | None,    # annual service charge in GBP
  'ground_rent_annual': int | None,       # annual ground rent in GBP
}

All four fields are independent; missing data returns None for that field.

Coverage targets (based on inspect_lease4.mjs against current corpus):
- lease_years: ~30% of leasehold listings (mostly from Foxtons-mashed Tenure field)
- service_charge: ~5% (only when phrased explicitly in description)
- ground_rent: ~9% (similar)

We deliberately only return values we're confident about. Edge cases preferred to be
None over wrong — a £150,000 'service charge' on a portfolio listing should not be returned
as a flat's annual fee.
"""
import re
from typing import Optional


# Lease years — ordered most-specific first.
_YEARS_PATTERNS = [
    # Foxtons structured: "Lease Years Remaining: 986" (often mashed into Tenure)
    re.compile(r'Lease\s+Years\s+Remaining[:\s]+(\d{2,4})', re.IGNORECASE),
    # "999-year leasehold" or "999 year leasehold"
    re.compile(r'(\d{2,4})\s*[-\s]?year[s]?\s+leasehold', re.IGNORECASE),
    # "144 year lease", "986 years remaining"
    re.compile(r'(\d{2,4})\s+year[s]?\s+(?:lease|remaining|left|unexpired)', re.IGNORECASE),
    # "lease of 999 years"
    re.compile(r'lease\s+(?:of\s+)?(\d{2,4})\s+years?', re.IGNORECASE),
]

# Service charge / ground rent. Annual amount in GBP.
# Allow £, £ with space, or no currency symbol if the surrounding context is clear.
# Require the field name immediately followed by amount or some short connector.
_SERVICE_CHARGE_PATTERNS = [
    # "Service Charge: £21,690" / "Service Charge £3,200 per annum"
    re.compile(r'service\s+charge[:\s]+£\s*([\d,]+)(?:\.\d+)?', re.IGNORECASE),
    # "annual service charge of £3,200"
    re.compile(r'annual\s+service\s+charge\s+of\s+£\s*([\d,]+)', re.IGNORECASE),
]
_GROUND_RENT_PATTERNS = [
    re.compile(r'ground\s+rent[:\s]+£\s*([\d,]+)(?:\.\d+)?', re.IGNORECASE),
    re.compile(r'annual\s+ground\s+rent\s+of\s+£\s*([\d,]+)', re.IGNORECASE),
]
# Special-case: "Ground Rent: £0" — the regex above already matches; but we also want to
# catch "Ground rent does not apply" / "peppercorn rent" → return 0.
_GROUND_RENT_ZERO_PATTERNS = [
    re.compile(r'ground\s+rent\s+(?:does\s+not\s+apply|n/a|none|nil)', re.IGNORECASE),
    re.compile(r'peppercorn\s+(?:ground\s+)?rent', re.IGNORECASE),
]

# Sanity bounds — anything outside these is treated as a parse error and discarded.
# These bounds reflect plausible London property values; numbers outside almost certainly
# come from mis-extraction (e.g. a portfolio listing's £150k headline charge, or someone
# quoting a postcode that happens to look like a number).
_BOUNDS = {
    'lease_years': (1, 999),
    'service_charge': (0, 100_000),   # genuine prime central can reach ~£75k/year; cap at 100k
    'ground_rent': (0, 50_000),       # ground rents almost never exceed a few thousand
}


def _clip(value: Optional[int], lo: int, hi: int) -> Optional[int]:
    """Return value if within [lo, hi], else None."""
    if value is None:
        return None
    return value if lo <= value <= hi else None


def _parse_amount(s: str) -> Optional[int]:
    """Parse '21,690' or '3200' into int. Returns None on garbage."""
    try:
        return int(s.replace(',', '').strip())
    except (ValueError, AttributeError):
        return None


def _extract_years(haystack: str) -> Optional[int]:
    """First matching pattern wins. Returns None if nothing matches."""
    for p in _YEARS_PATTERNS:
        m = p.search(haystack)
        if m:
            return _clip(_parse_amount(m.group(1)), *_BOUNDS['lease_years'])
    return None


def _extract_money(haystack: str, patterns, zero_patterns=None, bounds_key=None) -> Optional[int]:
    """Run a list of patterns; return the first match's amount (clipped to bounds).
    If zero_patterns is provided and matches, return 0."""
    for p in patterns:
        m = p.search(haystack)
        if m:
            amt = _parse_amount(m.group(1))
            return _clip(amt, *_BOUNDS[bounds_key])
    if zero_patterns:
        for p in zero_patterns:
            if p.search(haystack):
                return 0
    return None


def _clean_tenure(tenure: str) -> str:
    """Strip mashed-in 'Lease Years Remaining: N' suffix from Tenure field.
    'Leasehold Lease Years Remaining: 986' -> 'Leasehold'
    'Share Of Freehold Lease Years Remaining: 986' -> 'Share Of Freehold'
    '999-year leasehold' -> '999-year leasehold' (no change; lease length is part of the tenure value here)
    """
    if not tenure:
        return tenure
    # Remove the "Lease Years Remaining: N" pattern wherever it appears.
    cleaned = re.sub(r'\s+Lease\s+Years\s+Remaining[:\s]+\d{2,4}\s*', '', tenure, flags=re.IGNORECASE)
    return cleaned.strip()


def extract_lease_details(letting_details, key_features=None, description=None):
    """
    Args:
        letting_details: dict or None
        key_features: list[str] or None
        description: str or None
    Returns:
        dict with tenure_cleaned, lease_years_remaining, service_charge_annual, ground_rent_annual
    """
    letting_details = letting_details or {}
    key_features = key_features or []
    description = description or ''

    raw_tenure = letting_details.get('Tenure', '') or ''
    tenure_cleaned = _clean_tenure(raw_tenure) if raw_tenure else None

    # Combined haystack for extraction, in priority order (Tenure first since it's structured).
    haystack = '\n'.join([
        raw_tenure,
        ' '.join(str(f) for f in key_features),
        description,
        # Also include any other letting_details values that might contain lease info
        ' '.join(str(v) for v in letting_details.values()),
    ])

    lease_years = _extract_years(haystack)
    service_charge = _extract_money(haystack, _SERVICE_CHARGE_PATTERNS, bounds_key='service_charge')
    ground_rent = _extract_money(haystack, _GROUND_RENT_PATTERNS, _GROUND_RENT_ZERO_PATTERNS, bounds_key='ground_rent')

    return {
        'tenure_cleaned': tenure_cleaned,
        'lease_years_remaining': lease_years,
        'service_charge_annual': service_charge,
        'ground_rent_annual': ground_rent,
    }


# --- Self-test ---
if __name__ == '__main__':
    cases = [
        # (label, letting_details, key_features, description, expected_subset)
        ('Foxtons-mashed Tenure',
         {'Tenure': 'Share Of Freehold Lease Years Remaining: 986'},
         [], '',
         {'tenure_cleaned': 'Share Of Freehold', 'lease_years_remaining': 986}),

        ('Leasehold-mashed',
         {'Tenure': 'Leasehold Lease Years Remaining: 972'},
         [], '',
         {'tenure_cleaned': 'Leasehold', 'lease_years_remaining': 972}),

        ('999-year leasehold',
         {'Tenure': '999-year leasehold'},
         [], '',
         {'tenure_cleaned': '999-year leasehold', 'lease_years_remaining': 999}),

        ('Description: full structured',
         {'Tenure': 'Leasehold'},
         [],
         'Service Charge: £21,690\nGround Rent: £150\nCouncil Tax Band: H',
         {'lease_years_remaining': None, 'service_charge_annual': 21690, 'ground_rent_annual': 150}),

        ('Ground rent peppercorn',
         {'Tenure': 'Leasehold'},
         [],
         'Tenure: Leasehold. Peppercorn ground rent. 125 year lease.',
         {'lease_years_remaining': 125, 'ground_rent_annual': 0}),

        ('Key features lease',
         {'Tenure': 'Leasehold'},
         ['Three Bedrooms', '144 Year Lease', 'Roof Terrace'],
         '',
         {'lease_years_remaining': 144}),

        ('Freehold — no lease data expected',
         {'Tenure': 'Freehold'},
         [], 'Lovely freehold property.',
         {'tenure_cleaned': 'Freehold', 'lease_years_remaining': None, 'service_charge_annual': None, 'ground_rent_annual': None}),

        ('Garbage service charge — out of bounds',
         {'Tenure': 'Leasehold'},
         [], 'Service charge: £500,000 (portfolio).',
         {'service_charge_annual': None}),  # clipped because >100k

        ('Empty input',
         None, None, None,
         {'tenure_cleaned': None, 'lease_years_remaining': None, 'service_charge_annual': None, 'ground_rent_annual': None}),
    ]

    passed = 0
    failed = 0
    for label, ld, kf, desc, expected in cases:
        result = extract_lease_details(ld, kf, desc)
        ok = all(result.get(k) == v for k, v in expected.items())
        if ok:
            print(f'  ok  {label}')
            passed += 1
        else:
            print(f'  FAIL {label}')
            print(f'       expected subset: {expected}')
            print(f'       got: {result}')
            failed += 1
    print(f'\n{passed} passed, {failed} failed')
