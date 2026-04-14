"""
Test the BLM feed endpoint with a sample file.
Usage: python test_blm_feed.py --key YOUR_API_KEY --url http://localhost:3000
"""
import urllib.request
import sys
import os

API_KEY = sys.argv[sys.argv.index('--key') + 1] if '--key' in sys.argv else os.getenv('BLM_TEST_KEY', '')
SITE_URL = sys.argv[sys.argv.index('--url') + 1] if '--url' in sys.argv else 'http://localhost:3000'

# Sample BLM v2.5 file with 3 test properties
BLM_CONTENT = """\
#HEADER#
VERSION|2.5
EOF|NO
AGENT_REFERENCE_PREFIX|TEST
#END#
#AGENT#
AGENT_ID|TEST_AGENCY
BRANCH_ID|LONDON_CENTRAL
AGENT_NAME|Test Agency London
#END#
#PROPERTY#
AGENT_REF|TEST001
DISPLAY_ADDRESS|Flat 2, 14 Columbia Road, London
ADDRESS_1|Flat 2
ADDRESS_2|14 Columbia Road
TOWN|London
POSTCODE1|E2
POSTCODE2|7RG
PRICE|2200
LET_RENT_FREQUENCY|2
PROP_TYPE|8
BEDROOMS|2
BATHROOMS|1
RECEPTION_ROOMS|1
DESCRIPTION|A stunning two-bedroom flat in the heart of Shoreditch. Features include high ceilings, exposed brick walls and original wooden floors. Available immediately.
FEATURE1|High ceilings
FEATURE2|Exposed brick
FEATURE3|Wooden floors
FEATURE4|Close to Columbia Road Market
FEATURE5|Excellent transport links
LET_FURN_TYPE|0
LET_TYPE|Long Let
AVAILABLE_DATE|01/05/2026
MINIMUM_TERM|12
LATITUDE|51.5277
LONGITUDE|-0.0721
MEDIA_IMAGE_00|https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800
MEDIA_IMAGE_01|https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800
PUBLISHED_FLAG|1
CREATE_DATE|14/04/2026
#END#
#PROPERTY#
AGENT_REF|TEST002
DISPLAY_ADDRESS|3 Redchurch Street, Shoreditch, London
ADDRESS_1|3 Redchurch Street
TOWN|London
POSTCODE1|E2
POSTCODE2|7DJ
PRICE|3500
LET_RENT_FREQUENCY|2
PROP_TYPE|20
BEDROOMS|3
BATHROOMS|2
RECEPTION_ROOMS|1
DESCRIPTION|Exceptional three-bedroom Victorian house on one of Shoreditch's most sought-after streets. Features period fireplaces, a private garden and direct access to boutiques and restaurants.
FEATURE1|Private garden
FEATURE2|Period fireplaces
FEATURE3|Victorian features
FEATURE4|Prime Shoreditch location
LET_FURN_TYPE|2
LET_TYPE|Long Let
AVAILABLE_DATE|01/06/2026
MINIMUM_TERM|12
LATITUDE|51.5243
LONGITUDE|-0.0730
MEDIA_IMAGE_00|https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800
PUBLISHED_FLAG|1
CREATE_DATE|14/04/2026
#END#
#PROPERTY#
AGENT_REF|TEST003
DISPLAY_ADDRESS|Studio 5, 88 Bethnal Green Road, London
ADDRESS_1|Studio 5
ADDRESS_2|88 Bethnal Green Road
TOWN|London
POSTCODE1|E2
POSTCODE2|6DP
PRICE|1400
LET_RENT_FREQUENCY|2
PROP_TYPE|9
BEDROOMS|0
BATHROOMS|1
RECEPTION_ROOMS|0
DESCRIPTION|Stylish studio apartment in a converted warehouse building. Open-plan layout with large windows, integrated kitchen and modern bathroom. Perfect for a professional.
FEATURE1|Warehouse conversion
FEATURE2|Open plan
FEATURE3|Modern kitchen
LET_FURN_TYPE|0
LET_TYPE|Long Let
AVAILABLE_DATE|15/04/2026
MINIMUM_TERM|6
LATITUDE|51.5236
LONGITUDE|-0.0654
MEDIA_IMAGE_00|https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800
PUBLISHED_FLAG|1
CREATE_DATE|14/04/2026
#END#
"""

print(f'Testing BLM feed at {SITE_URL}')
print(f'API key: {API_KEY[:8]}...' if len(API_KEY) > 8 else f'API key: {API_KEY}')
print()

# First test the GET endpoint
print('1. Testing authentication (GET)...')
req = urllib.request.Request(
    SITE_URL + '/api/feed/blm',
    headers={'x-agent-key': API_KEY}
)
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        import json
        data = json.loads(r.read().decode())
        print(f'   ✓ Authenticated as: {data.get("agent", "unknown")}')
except Exception as e:
    print(f'   ✗ Auth failed: {e}')
    sys.exit(1)

# POST the BLM file
print()
print('2. Posting BLM feed (3 test properties)...')
req2 = urllib.request.Request(
    SITE_URL + '/api/feed/blm',
    data=BLM_CONTENT.encode('utf-8'),
    headers={
        'x-agent-key': API_KEY,
        'Content-Type': 'text/plain',
    },
    method='POST'
)
try:
    with urllib.request.urlopen(req2, timeout=30) as r:
        result = json.loads(r.read().decode())
        print(f'   ✓ Feed processed!')
        print(f'   Processed: {result.get("processed")} properties')
        print(f'   Saved:     {result.get("saved")} new')
        print(f'   Updated:   {result.get("updated")} existing')
        print(f'   Deactivated: {result.get("deactivated")} removed')
except Exception as e:
    print(f'   ✗ Feed failed: {e}')
    sys.exit(1)

print()
print('Done! Check your agent dashboard to see the test listings.')
print(f'View at: {SITE_URL}/dashboard')
