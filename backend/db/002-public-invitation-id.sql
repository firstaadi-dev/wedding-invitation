-- Keep internal tenant IDs and legacy links intact; public URLs use independent random IDs.
ALTER TABLE tenants ADD COLUMN public_id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE tenants ADD CONSTRAINT tenants_public_id_key UNIQUE (public_id);
