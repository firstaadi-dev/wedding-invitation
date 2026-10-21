# Account Migrations

Public registration is disabled: no registration endpoint or page exists.

Copy `customer.example.json` to a new `.json` file in this directory and set its email, unique slug, name and password hash environment variable. Example files are skipped. Generate the hash with `npm run admin:hash` (password on stdin), put it in the named environment variable, and run `npm run db:migrate` with a direct database connection. Keep plaintext passwords and password hashes out of Git.

Account creation and schema migration run in one transaction. Re-running a matching file is a no-op; it never resets a password or transfers ownership. A conflicting email or slug aborts the migration. Each account currently owns one tenant. To rotate passwords, use a dedicated reviewed SQL migration and delete that account's admin sessions in the same transaction.

Migration 3 replaces all existing account and tenant IDs and their references with native `uuid` values. PostgreSQL 18+ generates UUIDv7 IDs with `uuidv7()` for both migrated and newly provisioned records. The UUID timestamp records ID generation, not the original creation date. Slugs, public invitation UUIDs, password hashes, guest links and sessions are preserved. After migration, identify tenants by `slug` and accounts by `email` in operational queries; IDs no longer equal slugs or names. Re-running migration preserves the new IDs. This requires a coordinated backend cutover; see [deployment](../../../docs/vps-deploy.md#uuidv7-cutover).

The initial migration assigns all legacy guests, media and settings to `firsta-talitha`, owned by `firstaadip16@gmail.com`, using the existing `ADMIN_PASSWORD_HASH`. Guest links and guest sessions are preserved; legacy admin sessions must sign in again using email and the same password. Migrations run explicitly before a backend deployment; service startup does not run them. Future startups do not depend on that bootstrap hash.
