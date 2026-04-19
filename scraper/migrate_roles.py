#!/usr/bin/env python3
"""One-off: migrate existing user roles to the new lettings/sales split.

Existing role -> new role:
  owner      -> owner_lettings
  landlord   -> owner_lettings
  agent      -> agent_lettings
  admin      -> agent_lettings (treat admin as agent for UX; keep admin flag separately if needed)

Dry-run by default. Pass --apply to actually write.
"""
import os, sys, argparse
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env')

ROLE_MAP = {
    'owner': 'owner_lettings',
    'landlord': 'owner_lettings',
    'agent': 'agent_lettings',
    'admin': 'agent_lettings',
}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    sb = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY'))

    # Page through auth.users via the admin API
    page = 1
    updates = []
    while True:
        resp = sb.auth.admin.list_users(page=page, per_page=100)
        users = resp if isinstance(resp, list) else getattr(resp, 'users', [])
        if not users: break
        for u in users:
            meta = getattr(u, 'user_metadata', None) or {}
            current = meta.get('role')
            if current in ROLE_MAP:
                new = ROLE_MAP[current]
                updates.append((u.id, u.email, current, new))
        if len(users) < 100: break
        page += 1

    print(f"Found {len(updates)} users to migrate:")
    for uid, email, old, new in updates:
        print(f"  {email}  {old} -> {new}")

    if not args.apply:
        print("\nDry run. Re-run with --apply to write changes.")
        return

    print("\nApplying...")
    for uid, email, old, new in updates:
        try:
            # Fetch current metadata and merge (avoid wiping other fields)
            current_user = sb.auth.admin.get_user_by_id(uid)
            current_meta = getattr(current_user.user, 'user_metadata', None) or {}
            merged = {**current_meta, 'role': new}
            sb.auth.admin.update_user_by_id(uid, {'user_metadata': merged})
            print(f"  ✓ {email}")
        except Exception as e:
            print(f"  ✗ {email}: {e}")

if __name__ == '__main__':
    main()
