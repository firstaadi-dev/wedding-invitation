# Account email integration

Firebase Authentication runs as the real local Auth Emulator (`demo-weddinvita`), never the staging project. Neon/Postgres is replaced by a PostgreSQL 18 disposable local database. Midtrans remains the HTTP fixture from `tests/billing.test.mjs`.

`npm run test:integration` starts and stops Firebase Auth Emulator. The billing suite starts this Postman Resend simulation, takes its published `resend` address, and sets `RESEND_API_ORIGIN` on the real backend. No email leaves the machine. `TEST_EMAIL_ORIGIN` is an optional existing **loopback** simulation address for debugging only.

The fixture implements POST `/emails`, GET `/__messages`, and POST `/__failure` with `{"enabled":true|false}`. The latter two are local fixture controls, not Resend APIs. State is namespaced `resend:`. Unknown routes return 501. Request/response bodies may contain local test action codes; never use this simulation with customer data or real credentials.

Expected checks: signup/verification through delivered action links; generic password-reset responses for nonexistent and legacy accounts; actual Firebase password reset and rejection of old application sessions; preservation of legacy scrypt login; payment confirmation persisted once and retried after a simulated 503; no duplicate receipt after repeated webhook delivery. Postman Account API and Billing API assertions run against the actual Go server.
