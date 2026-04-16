"""
Run all scrapers in sequence.
Usage: python run_all.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

async def main():
    print('=' * 50)
    print('NestLondon — Full scrape run')
    print('=' * 50)

    # Rightmove
    print('\n[1/3] Rightmove')
    try:
        from scraper import main as rightmove_main
        await rightmove_main()
    except Exception as e:
        print('Rightmove error: ' + str(e))

    # Zoopla
    print('\n[2/3] Zoopla')
    try:
        from zoopla_scraper import main as zoopla_main
        await zoopla_main()
    except Exception as e:
        print('Zoopla error: ' + str(e))

    # OnTheMarket
    print('\n[3/3] OnTheMarket')
    try:
        from onthemarket_scraper import main as otm_main
        await otm_main()
    except Exception as e:
        print('OnTheMarket error: ' + str(e))

    # Rightmove Buy
    print('\n[4/4] Rightmove Sales')
    try:
        from scraper import scrape_buy
        await scrape_buy(pages=5)
    except Exception as e:
        print('Rightmove buy error: ' + str(e))

    # EPC enrichment
    print('\n[5/5] EPC enrichment')
    try:
        from epc_enricher import enrich_listings
        enrich_listings(batch_size=100)
    except Exception as e:
        print('EPC enricher error: ' + str(e))

    print('\n' + '=' * 50)
    print('All scrapers complete.')

if __name__ == '__main__':
    asyncio.run(main())
