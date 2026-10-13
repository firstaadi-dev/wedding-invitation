CREATE TABLE IF NOT EXISTS guests (
  id text PRIMARY KEY,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  token_hash text NOT NULL UNIQUE,
  active smallint NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS devices (
  guest_id text NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  visitor_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guest_id, visitor_hash)
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  guest_id text REFERENCES guests(id) ON DELETE CASCADE,
  version integer,
  csrf text,
  expires_at timestamptz NOT NULL,
  CHECK ((guest_id IS NULL AND csrf IS NOT NULL) OR (guest_id IS NOT NULL AND csrf IS NULL))
);
CREATE TABLE IF NOT EXISTS challenges (
  id text PRIMARY KEY,
  cookie_hash text NOT NULL,
  guest_id text NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  version integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS used_events (
  event_hash text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS settings (
  id integer PRIMARY KEY CHECK (id = 1),
  value jsonb NOT NULL DEFAULT '{}'
);
INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS media (
  slot text PRIMARY KEY,
  id text NOT NULL UNIQUE,
  mime text NOT NULL,
  data bytea NOT NULL
);
ALTER TABLE media DROP CONSTRAINT IF EXISTS media_slot_check;
ALTER TABLE media ADD CONSTRAINT media_slot_check CHECK (slot IN ('groom','bride','gallery1','gallery2','gallery3','gallery4','gallery5','gallery6','gallery7','gallery8','gallery9','music'));
CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  hits integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS challenges_expiry ON challenges(expires_at);
