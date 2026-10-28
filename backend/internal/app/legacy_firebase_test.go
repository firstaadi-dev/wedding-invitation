package app

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/url"
	"os"
	"strings"
	"testing"

	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/option"
)

func TestLegacyHashImportFormat(t *testing.T) {
	encoded, err := PasswordHash("LegacyPassword123!")
	if err != nil {
		t.Fatal(err)
	}
	digest, salt, err := legacyHash(encoded)
	if err != nil {
		t.Fatal(err)
	}
	if len(salt) != 32 || len(digest) != 64 || encoded != string(salt)+":"+hex.EncodeToString(digest) {
		t.Fatal("incorrect Firebase import encoding")
	}
	if _, _, err := legacyHash("not-a-hash"); err == nil {
		t.Fatal("invalid hash accepted")
	}
}

func TestLegacyFirebaseMigrationLive(t *testing.T) {
	dsn, creds, key := os.Getenv("MIGRATION_TEST_DATABASE"), os.Getenv("MIGRATION_TEST_CREDENTIALS"), os.Getenv("MIGRATION_TEST_API_KEY")
	if dsn == "" || creds == "" || key == "" {
		t.Skip("requires disposable database and staging Firebase credentials")
	}
	parsed, parseErr := url.Parse(dsn)
	if parseErr != nil || parsed.Hostname() != "127.0.0.1" || parsed.Port() != "55449" || parsed.Path != "/postgres" {
		t.Fatal("live migration test requires its dedicated local disposable database")
	}
	ctx := context.Background()
	pool, err := Database(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	_, err = pool.Exec(ctx, `CREATE SCHEMA wedding; CREATE TABLE wedding.accounts (id uuid PRIMARY KEY,email text UNIQUE,active bool,password_hash text,firebase_uid text); CREATE TABLE wedding.sessions (account_id uuid); CREATE TABLE wedding.tenants (owner_id uuid, name text);`)
	if err != nil {
		t.Fatal(err)
	}
	password := "legacy-password"
	encoded, err := PasswordHash(password)
	if err != nil {
		t.Fatal(err)
	}
	email := "migration-test-" + strings.ToLower(secret()[:20]) + "@example.invalid"
	id := "019abcde-0000-7000-8000-000000000001"
	_, err = pool.Exec(ctx, `INSERT INTO wedding.accounts VALUES ($1,$2,true,$3,NULL)`, id, email, encoded)
	if err != nil {
		t.Fatal(err)
	}
	_, err = pool.Exec(ctx, `INSERT INTO wedding.sessions VALUES ($1)`, id)
	if err != nil {
		t.Fatal(err)
	}
	_, err = pool.Exec(ctx, `INSERT INTO wedding.tenants VALUES ($1,'kept')`, id)
	if err != nil {
		t.Fatal(err)
	}
	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: "weddinvita-8ef46"}, option.WithCredentialsJSON([]byte(creds)))
	if err != nil {
		t.Fatal(err)
	}
	auth, err := app.Auth(ctx)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		u, e := auth.GetUserByEmail(ctx, email)
		if e == nil {
			if e = auth.DeleteUser(ctx, u.UID); e != nil {
				t.Error("temporary Firebase account cleanup failed")
			}
		}
	})
	if err = MigrateLegacyFirebase(ctx, pool, "weddinvita-8ef46", creds, email, false); err != nil {
		t.Fatal(err)
	}
	if _, err = auth.GetUserByEmail(ctx, email); err == nil {
		t.Fatal("dry run created identity")
	}
	if err = MigrateLegacyFirebase(ctx, pool, "weddinvita-8ef46", creds, email, true); err != nil {
		t.Fatal(err)
	}
	var uid string
	var old *string
	var tenants, sessions int
	err = pool.QueryRow(ctx, `SELECT firebase_uid,password_hash,(SELECT count(*) FROM wedding.tenants WHERE owner_id=accounts.id),(SELECT count(*) FROM wedding.sessions WHERE account_id=accounts.id) FROM wedding.accounts WHERE id=$1`, id).Scan(&uid, &old, &tenants, &sessions)
	if err != nil {
		t.Fatal(err)
	}
	if uid == "" || old != nil || tenants != 1 || sessions != 0 {
		t.Fatal("account data or sessions incorrect")
	}
	payload, _ := json.Marshal(map[string]any{"email": email, "password": password, "returnSecureToken": true})
	resp, err := http.Post("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key="+key, "application/json", bytes.NewReader(payload))
	if err != nil {
		t.Fatal("sign-in request failed")
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("sign-in returned %d", resp.StatusCode)
	}
	if err = MigrateLegacyFirebase(ctx, pool, "weddinvita-8ef46", creds, email, true); err == nil {
		t.Fatal("repeated migration accepted")
	}
}
