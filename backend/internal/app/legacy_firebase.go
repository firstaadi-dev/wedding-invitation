package app

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	firebasehash "firebase.google.com/go/v4/auth/hash"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/api/option"
)

func legacyHash(encoded string) ([]byte, []byte, error) {
	if !match(`^[a-f0-9]{32}:[a-f0-9]{128}$`, encoded) {
		return nil, nil, errors.New("invalid legacy password hash")
	}
	parts := strings.Split(encoded, ":")
	digest, err := hex.DecodeString(parts[1])
	return digest, []byte(parts[0]), err
}

// MigrateLegacyFirebase migrates one explicitly selected account, retaining its Neon ID and tenant.
func MigrateLegacyFirebase(ctx context.Context, pool *pgxpool.Pool, project, credentials, email string, apply bool) error {
	if project != "weddinvita-8ef46" || credentials == "" || email == "" {
		return errors.New("staging Firebase project, credentials, and account email are required")
	}
	var service struct {
		ProjectID string `json:"project_id"`
		Type      string `json:"type"`
	}
	if err := json.Unmarshal([]byte(credentials), &service); err != nil || service.ProjectID != project || service.Type != "service_account" {
		return errors.New("Firebase credentials do not match the project")
	}
	clientApp, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: project}, option.WithCredentialsJSON([]byte(credentials)))
	if err != nil {
		return errors.New("Firebase initialization failed")
	}
	client, err := clientApp.Auth(ctx)
	if err != nil {
		return errors.New("Firebase Auth initialization failed")
	}
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(context.Background())
	var id, storedEmail string
	var encoded, existingUID *string
	err = tx.QueryRow(ctx, `SELECT id::text,email,password_hash,firebase_uid FROM wedding.accounts WHERE email=$1 AND active FOR UPDATE`, strings.ToLower(strings.TrimSpace(email))).Scan(&id, &storedEmail, &encoded, &existingUID)
	if errors.Is(err, pgx.ErrNoRows) {
		return errors.New("active account not found")
	}
	if err != nil {
		return err
	}
	if existingUID != nil {
		return errors.New("account already migrated; verify Firebase state separately")
	}
	if encoded == nil {
		return errors.New("legacy password hash missing")
	}
	digest, salt, err := legacyHash(*encoded)
	if err != nil {
		return err
	}
	_, err = client.GetUserByEmail(ctx, storedEmail)
	if err == nil {
		return errors.New("Firebase email already exists; migration stopped")
	}
	if !auth.IsUserNotFound(err) {
		return errors.New("unable to check Firebase email")
	}
	if !apply {
		return nil
	}
	uid := "legacy-" + id + "-" + secret()[:16]
	_, err = client.CreateUser(ctx, (&auth.UserToCreate{}).UID(uid).Email(storedEmail).Disabled(true))
	if err != nil {
		return errors.New("could not reserve Firebase identity; inspect Firebase before retrying")
	}
	result, err := client.ImportUsers(ctx, []*auth.UserToImport{(&auth.UserToImport{}).UID(uid).Email(storedEmail).PasswordHash(digest).PasswordSalt(salt).Disabled(true)}, auth.WithHash(firebasehash.StandardScrypt{MemoryCost: 16384, BlockSize: 8, Parallelization: 1, DerivedKeyLength: 64}))
	if err != nil || result.FailureCount != 0 {
		return fmt.Errorf("import failed or uncertain; disabled Firebase UID %s requires inspection", uid)
	}
	if _, err = tx.Exec(ctx, `UPDATE wedding.accounts SET firebase_uid=$1,password_hash=NULL WHERE id=$2`, uid, id); err != nil {
		return fmt.Errorf("database update failed; inspect disabled Firebase UID %s", uid)
	}
	if _, err = tx.Exec(ctx, `DELETE FROM wedding.sessions WHERE account_id=$1`, id); err != nil {
		return fmt.Errorf("session revocation failed; inspect disabled Firebase UID %s", uid)
	}
	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("database commit uncertain; inspect account and disabled Firebase UID %s", uid)
	}
	if _, err = client.UpdateUser(ctx, uid, (&auth.UserToUpdate{}).Disabled(false)); err != nil {
		return fmt.Errorf("account linked but Firebase UID %s remains disabled; enable after inspection", uid)
	}
	return nil
}
