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

    # 1. New listings
    print('\n[1/4] New listings (last 24h)')
    try:
        from scrape_new import main as new_main
        await new_main()
    except Exception as e:
        print('New listings error: ' + str(e))

    # 2. Update existing listings
    print('\n[2/4] Update existing listings')
    try:
        from scrape_update import main as update_main
        await update_main(batch_size=30)
    except Exception as e:
        print('Update error: ' + str(e))

    # 3. Check for stale listings
    print('\n[3/4] Stale listing check')
    try:
        from scrape_stale import main as stale_main
        await stale_main(batch_size=50)
    except Exception as e:
        print('Stale check error: ' + str(e))

    # 4. EPC enrichment
    print('\n[4/5] EPC enrichment')
    try:
        from epc_enricher import enrich_listings
        enrich_listings(batch_size=100)
    except Exception as e:
        print('EPC enricher error: ' + str(e))

    # 5. Cross-source dedupe pass. Runs the Node script that scores listing pairs
    #    and auto-hides confident duplicates. Idempotent — won't re-process pairs
    #    that have already been decided. See scripts/dedupe_run.mjs + lib/dedupeAudit.ts.
    print('\n[5/5] Cross-source dedupe pass')
    try:
        import subprocess
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        env_file = os.path.join(repo_root, '.env.local')
        script = os.path.join(repo_root, 'scripts', 'dedupe_run.mjs')
        result = subprocess.run(
            ['node', '--env-file=' + env_file, script],
            cwd=repo_root,
            capture_output=True,
            text=True,
            timeout=180,
        )
        # Stream output (the runner is verbose enough already)
        if result.stdout: print(result.stdout.rstrip())
        if result.stderr: print(result.stderr.rstrip())
        if result.returncode != 0:
            print('Dedupe runner exited with code ' + str(result.returncode))
    except subprocess.TimeoutExpired:
        print('Dedupe runner timed out (180s)')
    except Exception as e:
        print('Dedupe runner error: ' + str(e))

    print('\n' + '=' * 50)
    print('All done.')


if __name__ == '__main__':
    asyncio.run(main())
