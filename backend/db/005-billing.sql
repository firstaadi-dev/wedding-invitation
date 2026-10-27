-- Existing provisioned accounts retain their current access. Self-service registration
-- explicitly opts in to billing and starts with no entitlement.
ALTER TABLE accounts ADD COLUMN billing_required boolean NOT NULL DEFAULT false;
ALTER TABLE accounts ADD COLUMN paid_until timestamptz;
CREATE TABLE payments (
  id text PRIMARY KEY CHECK (id ~ '^wi-[a-f0-9-]{36}$'),
  account_id uuid NOT NULL REFERENCES accounts(id),
  amount integer NOT NULL DEFAULT 199000 CHECK (amount=199000),
  environment text NOT NULL CHECK (environment IN ('sandbox','production')),
  status text NOT NULL DEFAULT 'creating' CHECK (status IN ('creating','pending','settlement','deny','cancel','expire','failure','refund','partial_refund')),
  checkout_url text,
  transaction_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
  updated_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  access_ends_at timestamptz
);
CREATE INDEX payments_account_created ON payments(account_id,created_at DESC);
CREATE UNIQUE INDEX payments_one_pending ON payments(account_id) WHERE status IN ('creating','pending');
