package app

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"net/url"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func guestCode() string {
	b := make([]byte, 20)
	_, err := rand.Read(b)
	must(err)
	return base64.RawURLEncoding.EncodeToString(b)
}

func storedGuestCode(raw string) string {
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "https" && u.Scheme != "http") || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || !match(`^/u/[A-Za-z0-9_-]{27}$`, u.Path) {
		return ""
	}
	return u.Path[3:]
}

type LinkRotationCount struct {
	Tenant string `json:"tenant"`
	Count  int    `json:"count"`
}

// RotateLegacyLinks is an explicit cutover, never part of startup/schema migrations.
func RotateLegacyLinks(ctx context.Context, pool *pgxpool.Pool, origin string, apply bool) ([]LinkRotationCount, error) {
	origin, err := validOrigin(origin, false)
	if err != nil {
		return nil, err
	}
	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	// Serialize cutovers and guest mutations for an all-or-nothing snapshot across accounts.
	if _, err = tx.Exec(ctx, "LOCK TABLE wedding.guests IN EXCLUSIVE MODE"); err != nil {
		return nil, err
	}
	r, err := tx.Query(ctx, "SELECT id,tenant_id,token_hash,COALESCE(invitation_link,'') AS link FROM wedding.guests ORDER BY tenant_id,id FOR UPDATE")
	if err != nil {
		return nil, err
	}
	guests, err := pgx.CollectRows(r, pgx.RowToMap)
	if err != nil {
		return nil, err
	}
	counts := []LinkRotationCount{}
	for _, g := range guests {
		if code := storedGuestCode(text(g["link"])); code != "" && hash(code) == g["token_hash"] {
			continue
		}
		tenant := text(g["tenant_id"])
		if len(counts) == 0 || counts[len(counts)-1].Tenant != tenant {
			counts = append(counts, LinkRotationCount{Tenant: tenant})
		}
		counts[len(counts)-1].Count++
		if !apply {
			continue
		}
		// Check collisions under the guest-table lock before touching credentials.
		code := guestCode()
		for {
			var exists bool
			if err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM wedding.guests WHERE token_hash=$1)", hash(code)).Scan(&exists); err != nil {
				return nil, err
			}
			if !exists {
				break
			}
			code = guestCode()
		}
		if _, err = tx.Exec(ctx, "UPDATE wedding.guests SET version=version+1,token_hash=$2,invitation_link=$3 WHERE id=$1", g["id"], hash(code), origin+"/u/"+code); err != nil {
			return nil, err
		}
		for _, table := range []string{"sessions", "challenges", "devices"} {
			if _, err = tx.Exec(ctx, "DELETE FROM wedding."+table+" WHERE guest_id=$1", g["id"]); err != nil {
				return nil, err
			}
		}
	}
	if apply {
		err = tx.Commit(ctx)
	}
	return counts, err
}
