package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	dbdata "wedding-invitation/backend/db"
)

func Database(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
	if dsn == "" {
		return nil, errors.New("DATABASE_URL belum diisi")
	}
	u, err := url.Parse(dsn)
	if err != nil {
		return nil, errors.New("invalid database URL")
	}
	if u.Hostname() != "127.0.0.1" && u.Hostname() != "localhost" && u.Hostname() != "::1" {
		q := u.Query()
		q.Set("sslmode", "verify-full")
		u.RawQuery = q.Encode()
	}
	c, err := pgxpool.ParseConfig(u.String())
	if err != nil {
		return nil, errors.New("invalid database config")
	}
	c.MaxConns = 5
	c.MaxConnIdleTime = 30 * time.Second
	c.ConnConfig.ConnectTimeout = 15 * time.Second
	return pgxpool.NewWithConfig(ctx, c)
}

type AccountMigration struct {
	Email           string `json:"email"`
	Slug            string `json:"slug"`
	Name            string `json:"name"`
	PasswordHashEnv string `json:"passwordHashEnv"`
}

func ProvisionAccount(ctx context.Context, tx pgx.Tx, v AccountMigration, passwordHash string) error {
	if length(v.Email) > 254 || !match(`^[^\s@]+@[^\s@]+\.[^\s@]+$`, strings.TrimSpace(v.Email)) {
		return errors.New("Invalid account email")
	}
	v.Email = strings.ToLower(strings.TrimSpace(v.Email))
	if length(v.Slug) > 80 || !match(`^[a-z0-9]+(?:-[a-z0-9]+)*$`, v.Slug) {
		return errors.New("Invalid tenant slug")
	}
	if strings.TrimSpace(v.Name) == "" || length(v.Name) > 120 {
		return errors.New("Invalid tenant name")
	}
	v.Name = strings.TrimSpace(v.Name)
	r, err := tx.Query(ctx, "SELECT a.email,t.slug,t.name FROM accounts a JOIN tenants t ON t.owner_id=a.id WHERE a.email=$1 OR t.slug=$2", v.Email, v.Slug)
	if err != nil {
		return err
	}
	existing, err := pgx.CollectRows(r, pgx.RowToMap)
	if err != nil {
		return err
	}
	if len(existing) > 0 {
		if len(existing) != 1 || existing[0]["email"] != v.Email || existing[0]["slug"] != v.Slug || existing[0]["name"] != v.Name {
			return errors.New("Account or tenant already belongs to a different migration")
		}
		return nil
	}
	if !match(`^[a-f0-9]{32}:[a-f0-9]{128}$`, passwordHash) {
		return errors.New("A valid password hash is required for a new account")
	}
	var id, tenant string
	if err = tx.QueryRow(ctx, "INSERT INTO accounts(email,password_hash) VALUES($1,$2) RETURNING id::text", v.Email, passwordHash).Scan(&id); err != nil {
		return err
	}
	if err = tx.QueryRow(ctx, "INSERT INTO tenants(owner_id,slug,name) VALUES($1,$2,$3) RETURNING id::text", id, v.Slug, v.Name).Scan(&tenant); err != nil {
		return err
	}
	_, err = tx.Exec(ctx, "INSERT INTO settings(tenant_id) VALUES($1)", tenant)
	return err
}
func Migrate(ctx context.Context, dsn, schema, passwordHash string) error {
	if !match(`^[a-z][a-z0-9_]{0,62}$`, schema) {
		return errors.New("Invalid database schema")
	}
	pool, err := Database(ctx, dsn)
	if err != nil {
		return err
	}
	defer pool.Close()
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext($1))", schema+":migrations"); err != nil {
		return err
	}
	for _, sql := range []string{"CREATE SCHEMA IF NOT EXISTS " + schema, "SET LOCAL search_path TO " + schema, "CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"} {
		if _, err = tx.Exec(ctx, sql); err != nil {
			return err
		}
	}
	var applied bool
	if err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version=1)").Scan(&applied); err != nil {
		return err
	}
	if !applied {
		if !match(`^[a-f0-9]{32}:[a-f0-9]{128}$`, passwordHash) {
			return errors.New("Initial migration requires ADMIN_PASSWORD_HASH to preserve the existing admin password.")
		}
		data, err := dbdata.Files.ReadFile("schema.sql")
		if err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, string(data)); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, "SELECT set_config('weddinvita.legacy_password_hash',$1,true)", passwordHash); err != nil {
			return err
		}
		data, err = dbdata.Files.ReadFile("001-multi-tenant.sql")
		if err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, string(data)); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, "INSERT INTO schema_migrations(version) VALUES(1)"); err != nil {
			return err
		}
	}
	if err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version=2)").Scan(&applied); err != nil {
		return err
	}
	if !applied {
		data, err := dbdata.Files.ReadFile("002-public-invitation-id.sql")
		if err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, string(data)); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, "INSERT INTO schema_migrations(version) VALUES(2)"); err != nil {
			return err
		}
	}
	if err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version=3)").Scan(&applied); err != nil {
		return err
	}
	if !applied {
		data, err := dbdata.Files.ReadFile("003-internal-uuidv7.sql")
		if err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, string(data)); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, "INSERT INTO schema_migrations(version) VALUES(3)"); err != nil {
			return err
		}
	}
	if err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version=4)").Scan(&applied); err != nil {
		return err
	}
	if !applied {
		data, err := dbdata.Files.ReadFile("004-device-limits.sql")
		if err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, string(data)); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, "INSERT INTO schema_migrations(version) VALUES(4)"); err != nil {
			return err
		}
	}
	files, err := dbdata.Files.ReadDir("accounts")
	if err != nil {
		return err
	}
	for _, file := range files {
		if !strings.HasSuffix(file.Name(), ".json") || strings.HasSuffix(file.Name(), ".example.json") {
			continue
		}
		data, err := dbdata.Files.ReadFile("accounts/" + file.Name())
		if err != nil {
			return err
		}
		var v AccountMigration
		decoder := json.NewDecoder(strings.NewReader(string(data)))
		decoder.DisallowUnknownFields()
		if err = decoder.Decode(&v); err != nil {
			return fmt.Errorf("invalid account migration: %s", file.Name())
		}
		if !match(`^[A-Z][A-Z0-9_]+$`, v.PasswordHashEnv) {
			return fmt.Errorf("invalid account migration: %s", file.Name())
		}
		if err = ProvisionAccount(ctx, tx, v, os.Getenv(v.PasswordHashEnv)); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
