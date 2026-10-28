-- Legacy accounts retain their password hashes until an explicit identity migration.
ALTER TABLE accounts ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE accounts ADD COLUMN firebase_uid text UNIQUE;
ALTER TABLE accounts ADD COLUMN terms_version text;
ALTER TABLE accounts ADD COLUMN terms_accepted_at timestamptz;
ALTER TABLE accounts ADD CONSTRAINT accounts_identity CHECK (
  (firebase_uid IS NULL AND password_hash IS NOT NULL) OR
  (firebase_uid IS NOT NULL AND password_hash IS NULL)
);
ALTER TABLE sessions ADD COLUMN firebase_auth_time bigint;

-- Payment activation and its confirmation intent must commit together.
CREATE TABLE payment_emails (
  payment_id text PRIMARY KEY REFERENCES payments(id),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  provider_id text
);
