"""
EPC Enricher - looks up EPC ratings for listings by postcode
Register at https://epc.opendatacommunities.org to get a free API key
Usage: python epc_enricher.py
"""
import os
import time
import base64
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
EPC_EMAIL = os.getenv('EPC_EMAIL')      # your registered email
EPC_API_KEY = os.getenv('EPC_API_KEY')  # your API key

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

import urllib.request
import json

def lookup_epc(postcode: str, address: str):
    """Look up EPC rating for a property by postcode."""
    if not EPC_EMAIL or not EPC_API_KEY:
        print('EPC_EMAIL and EPC_API_KEY must be set in .env')
        return None
    
    try:
        credentials = base64.b64encode(f'{EPC_EMAIL}:{EPC_API_KEY}'.encode()).decode()
        url = f'https://epc.opendatacommunities.org/api/v1/domestic/search?postcode={postcode.replace(" ", "%20")}&size=5'
        req = urllib.request.Request(url, headers={
            'Authorization': f'Basic {credentials}',
            'Accept': 'application/json',
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            rows = data.get('rows', [])
            if not rows:
                return None
            # Try to match address
            addr_lower = address.lower()
            best = None
            for row in rows:
                row_addr = (row.get('address1', '') + ' ' + row.get('address2', '')).lower()
                if any(word in row_addr for word in addr_lower.split()[:3]):
                    best = row
                    break
            if not best:
                best = rows[0]  # fallback to first result
            return {
                'epc_rating': best.get('current-energy-rating'),
                'epc_score': best.get('current-energy-efficiency'),
                'epc_potential_rating': best.get('potential-energy-rating'),
                'epc_potential_score': best.get('potential-energy-efficiency'),
                'epc_floor_area': best.get('total-floor-area'),
                'epc_heating': best.get('main-heating-description'),
                'epc_inspected': best.get('inspection-date'),
            }
    except Exception as e:
        print(f'  EPC lookup error for {postcode}: {e}')
        return None


def enrich_listings(batch_size=50):
    """Enrich listings that have a postcode but no EPC rating."""
    print('Fetching listings with postcodes but no EPC data...')
    
    result = supabase.table('listings') \
        .select('id,address,postcode') \
        .eq('is_active', True) \
        .filter('postcode', 'neq', 'null') \
        .filter('epc_rating', 'is', 'null') \
        .limit(batch_size) \
        .execute()
    
    listings = result.data or []
    print(f'Found {len(listings)} listings to enrich')
    
    enriched = 0
    for listing in listings:
        postcode = listing['postcode']
        address = listing['address']
        print(f'  Looking up {postcode} ({address[:40]}...)')
        
        epc = lookup_epc(postcode, address)
        if epc and epc.get('epc_rating'):
            supabase.table('listings').update(epc).eq('id', listing['id']).execute()
            print(f'    → {epc["epc_rating"]} ({epc["epc_score"]})')
            enriched += 1
        else:
            # Mark as 'not_found' so we don't retry infinitely
            supabase.table('listings').update({'epc_rating': 'not_found'}).eq('id', listing['id']).execute()
            print(f'    → No EPC found (marked not_found)')
        
        time.sleep(0.5)  # rate limiting
    
    print(f'Enriched {enriched}/{len(listings)} listings')


if __name__ == '__main__':
    enrich_listings()
