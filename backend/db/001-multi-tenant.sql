CREATE TABLE accounts (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(trim(email)) AND length(email) BETWEEN 3 AND 254),
  password_hash text NOT NULL CHECK (password_hash ~ '^[a-f0-9]{32}:[a-f0-9]{128}$'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tenants (
  id text PRIMARY KEY,
  -- shortcut: one invitation tenant per account; add memberships when multiple invitations or collaborators are needed.
  owner_id text NOT NULL UNIQUE REFERENCES accounts(id),
  slug text NOT NULL UNIQUE CHECK (length(slug) BETWEEN 1 AND 80 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  UNIQUE (id, owner_id)
);
INSERT INTO accounts(id,email,password_hash) VALUES
  ('firsta','firstaadip16@gmail.com',current_setting('weddinvita.legacy_password_hash'));
INSERT INTO tenants(id,owner_id,slug,name) VALUES ('firsta-talitha','firsta','firsta-talitha','Firsta & Talitha');

ALTER TABLE guests ADD COLUMN tenant_id text REFERENCES tenants(id);
UPDATE guests SET tenant_id='firsta-talitha';
ALTER TABLE guests ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX guests_tenant_created ON guests(tenant_id,created_at DESC);

ALTER TABLE settings ADD COLUMN tenant_id text REFERENCES tenants(id);
UPDATE settings SET tenant_id='firsta-talitha';
ALTER TABLE settings DROP CONSTRAINT settings_pkey;
ALTER TABLE settings DROP COLUMN id;
ALTER TABLE settings ADD PRIMARY KEY (tenant_id);

ALTER TABLE media ADD COLUMN tenant_id text REFERENCES tenants(id);
UPDATE media SET tenant_id='firsta-talitha';
ALTER TABLE media DROP CONSTRAINT media_pkey;
ALTER TABLE media ADD PRIMARY KEY (tenant_id,slot);

-- Legacy admin sessions have no account identity. Guest sessions and all invitation links remain valid.
DELETE FROM sessions WHERE guest_id IS NULL;
ALTER TABLE sessions ADD COLUMN account_id text REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD COLUMN tenant_id text;
ALTER TABLE sessions ADD FOREIGN KEY (tenant_id,account_id) REFERENCES tenants(id,owner_id) ON DELETE CASCADE;
ALTER TABLE sessions ADD CONSTRAINT sessions_identity CHECK (
  (guest_id IS NOT NULL AND account_id IS NULL AND tenant_id IS NULL) OR
  (guest_id IS NULL AND account_id IS NOT NULL AND tenant_id IS NOT NULL)
);
