# Executable reference — NOT production service

Run: `pip install -r implementation/requirements.txt && pytest -q tests/test_dashboard.py && uvicorn app:app --app-dir implementation --port 8000`.

**Security warning:** `x-user-id` is a **test-only identity stub**. Never expose this implementation to untrusted networks. Production must use OIDC/JWT validation, policy evaluation, persistent PostgreSQL repositories, audit, migrations and secret management. Seed data is fictitious; API marks it `demo_data=true`. The reference covers only 5 read endpoints, not the full platform.
