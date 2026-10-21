-- Keep ID replacement and all references atomic; fail quickly if live traffic holds locks.
SET LOCAL lock_timeout = '5s';
LOCK TABLE accounts, tenants, guests, settings, media, sessions IN ACCESS EXCLUSIVE MODE;

CREATE TEMP TABLE account_ids ON COMMIT DROP AS SELECT id AS old_id, uuidv7() AS new_id FROM accounts;
CREATE TEMP TABLE tenant_ids ON COMMIT DROP AS SELECT id AS old_id, uuidv7() AS new_id FROM tenants;

ALTER TABLE tenants DROP CONSTRAINT tenants_owner_id_fkey;
ALTER TABLE guests DROP CONSTRAINT guests_tenant_id_fkey;
ALTER TABLE settings DROP CONSTRAINT settings_tenant_id_fkey;
ALTER TABLE media DROP CONSTRAINT media_tenant_id_fkey;
ALTER TABLE sessions DROP CONSTRAINT sessions_account_id_fkey;
ALTER TABLE sessions DROP CONSTRAINT sessions_tenant_id_account_id_fkey;

UPDATE accounts a SET id=m.new_id::text FROM account_ids m WHERE a.id=m.old_id;
UPDATE tenants t SET owner_id=m.new_id::text FROM account_ids m WHERE t.owner_id=m.old_id;
UPDATE sessions s SET account_id=m.new_id::text FROM account_ids m WHERE s.account_id=m.old_id;
UPDATE tenants t SET id=m.new_id::text FROM tenant_ids m WHERE t.id=m.old_id;
UPDATE guests g SET tenant_id=m.new_id::text FROM tenant_ids m WHERE g.tenant_id=m.old_id;
UPDATE settings s SET tenant_id=m.new_id::text FROM tenant_ids m WHERE s.tenant_id=m.old_id;
UPDATE media x SET tenant_id=m.new_id::text FROM tenant_ids m WHERE x.tenant_id=m.old_id;
UPDATE sessions s SET tenant_id=m.new_id::text FROM tenant_ids m WHERE s.tenant_id=m.old_id;

ALTER TABLE accounts ALTER COLUMN id TYPE uuid USING id::uuid, ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE tenants ALTER COLUMN id TYPE uuid USING id::uuid, ALTER COLUMN id SET DEFAULT uuidv7(),
  ALTER COLUMN owner_id TYPE uuid USING owner_id::uuid;
ALTER TABLE guests ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE settings ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE media ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE sessions ALTER COLUMN account_id TYPE uuid USING account_id::uuid,
  ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;

ALTER TABLE tenants ADD FOREIGN KEY (owner_id) REFERENCES accounts(id);
ALTER TABLE guests ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE settings ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE media ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE sessions ADD FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD FOREIGN KEY (tenant_id,account_id) REFERENCES tenants(id,owner_id) ON DELETE CASCADE;
