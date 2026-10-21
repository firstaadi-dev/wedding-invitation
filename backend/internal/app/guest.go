package app

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

func (a *App) challenge(w http.ResponseWriter, r *http.Request) {
	a.limited(w, r, "challenge", 30, 60)
	if a.Config.PublicKey == "" || a.Config.SecretKey == "" {
		fail(503, "verification_unavailable", "Undangan belum tersedia. Silakan coba lagi nanti.")
	}
	_, v := body(w, r, 8192, false)
	only(v, "token")
	token, ok := v["token"].(string)
	if !ok || !match(`^(?:[A-Za-z0-9_-]{27}|[A-Za-z0-9_-]{43})$`, token) {
		fail(404, "invalid_link", "Tautan undangan tidak ditemukan atau sudah dinonaktifkan.")
	}
	id, cookie := secret(), secret()
	a.transaction(r.Context(), func(q db) any {
		g := row(r.Context(), q, "SELECT * FROM wedding.guests WHERE token_hash=$1 AND active=1 FOR UPDATE", hash(token))
		if g == nil {
			fail(404, "invalid_link", "Tautan undangan tidak ditemukan atau sudah dinonaktifkan.")
		}
		exec(r.Context(), q, `INSERT INTO wedding.challenges(id,cookie_hash,guest_id,version,expires_at) VALUES($1,$2,$3,$4,now()+interval '5 minutes')`, id, hash(cookie), g["id"], g["version"])
		return nil
	})
	a.cookie(w, "wedding_challenge", cookie, 300)
	jsonResponse(w, 200, map[string]string{"challenge": id, "publicKey": a.Config.PublicKey, "region": a.Config.Region})
}
func (a *App) fingerprintEvent(r *http.Request, id string) map[string]any {
	host := map[string]string{"us": "api.fpjs.io", "eu": "eu.api.fpjs.io", "ap": "ap.api.fpjs.io"}[a.Config.Region]
	if host == "" || a.Config.SecretKey == "" || a.Config.PublicKey == "" {
		fail(503, "verification_unavailable", "Verifikasi undangan belum tersedia. Silakan coba lagi nanti.")
	}
	base := "https://" + host
	if a.Config.FingerprintOrigin != "" {
		base = a.Config.FingerprintOrigin
	}
	req, err := http.NewRequestWithContext(r.Context(), "GET", base+"/v4/events/"+url.PathEscape(id), nil)
	must(err)
	req.Header.Set("Authorization", "Bearer "+a.Config.SecretKey)
	req.Header.Set("Accept", "application/json")
	res, err := a.Client.Do(req)
	if err != nil {
		fail(503, "verification_unavailable", "Koneksi verifikasi sedang terganggu. Silakan coba lagi.")
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		status := 503
		if res.StatusCode == 404 {
			status = 403
		}
		fail(status, "verification_failed", "Verifikasi belum berhasil. Silakan coba lagi.")
	}
	var event map[string]any
	if json.NewDecoder(io.LimitReader(res.Body, 1024*1024)).Decode(&event) != nil {
		fail(503, "verification_unavailable", "Verifikasi belum berhasil. Silakan coba lagi.")
	}
	return event
}
func verifiedVisitor(event map[string]any, id, challenge, origin string, now time.Time) string {
	eventURL, err := url.Parse(text(event["url"]))
	eventOrigin := ""
	if err == nil {
		eventOrigin = eventURL.Scheme + "://" + eventURL.Host
	}
	timestamp, validTime := event["timestamp"].(float64)
	age := float64(now.UnixMilli()) - timestamp
	identification, _ := event["identification"].(map[string]any)
	visitor := text(identification["visitor_id"])
	if event["event_id"] != id || event["linked_id"] != challenge || eventOrigin != origin || !validTime || age < -10000 || age > 300000 || visitor == "" || length(visitor) > 200 || event["tampering"] == true || event["replayed"] == true || event["bot"] == "detected" || event["rule_action"] == "deny" {
		fail(403, "invalid_fingerprint", "Perangkat belum dapat diverifikasi. Silakan coba lagi.")
	}
	return visitor
}
func (a *App) verify(w http.ResponseWriter, r *http.Request) {
	a.limited(w, r, "verify", 30, 60)
	_, v := body(w, r, 8192, false)
	only(v, "challenge", "eventId")
	challenge, ok := v["challenge"].(string)
	id, idOK := v["eventId"].(string)
	if !ok || !match(`^[A-Za-z0-9_-]{43}$`, challenge) || !idOK || !match(`^[a-zA-Z0-9._-]{1,100}$`, id) {
		fail(400, "verification", "Data verifikasi tidak valid.")
	}
	ctx := r.Context()
	c := row(ctx, a.Pool, "SELECT * FROM wedding.challenges WHERE id=$1 AND expires_at>now()", challenge)
	cookie, err := r.Cookie("wedding_challenge")
	if c == nil || err != nil || cookie.Value == "" || c["cookie_hash"] != hash(cookie.Value) {
		fail(409, "challenge_expired", "Pemeriksaan undangan perlu diulang. Silakan buka kembali tautan undangan yang diterima.")
	}
	visitor := verifiedVisitor(a.fingerprintEvent(r, id), id, challenge, a.Config.Origin, time.Now())
	token := secret()
	a.transaction(ctx, func(q db) any {
		g := row(ctx, q, "SELECT * FROM wedding.guests WHERE id=$1 FOR UPDATE", c["guest_id"])
		fresh := row(ctx, q, "SELECT * FROM wedding.challenges WHERE id=$1 AND expires_at>now() FOR UPDATE", challenge)
		if g == nil || number(g["active"]) == 0 || g["version"] != c["version"] {
			fail(404, "revoked", "Tautan sudah dinonaktifkan.")
		}
		if fresh == nil {
			fail(409, "challenge_expired", "Pemeriksaan undangan perlu diulang. Silakan buka kembali tautan undangan yang diterima.")
		}
		if exec(ctx, q, "INSERT INTO wedding.used_events(event_hash) VALUES($1) ON CONFLICT DO NOTHING", hash(id)).RowsAffected() == 0 {
			fail(409, "replayed", "Verifikasi sudah digunakan.")
		}
		vh := hash(visitor)
		if row(ctx, q, "SELECT 1 FROM wedding.devices WHERE guest_id=$1 AND visitor_hash=$2", g["id"], vh) == nil {
			count := row(ctx, q, "SELECT count(*) AS count FROM wedding.devices WHERE guest_id=$1", g["id"])
			if number(count["count"]) >= 3 {
				fail(403, "device_limit", "Batas akses undangan ini sudah tercapai (3 browser). Silakan hubungi pengundang untuk bantuan.")
			}
			exec(ctx, q, "INSERT INTO wedding.devices(guest_id,visitor_hash) VALUES($1,$2)", g["id"], vh)
		}
		exec(ctx, q, "DELETE FROM wedding.challenges WHERE id=$1", challenge)
		exec(ctx, q, `INSERT INTO wedding.sessions(token_hash,guest_id,version,expires_at) VALUES($1,$2,$3,now()+interval '30 days')`, hash(token), g["id"], g["version"])
		return nil
	})
	a.cookie(w, "wedding_guest", token, 2592000)
	jsonResponse(w, 200, map[string]bool{"ok": true})
}
func (a *App) respond(w http.ResponseWriter, r *http.Request) {
	s := a.authorized(r, false, false)
	if r.URL.Query().Has("tenant") && !matchesTenant(r.URL.Query().Get("tenant"), s) {
		fail(401, "unauthorized", "Undangan berubah. Silakan buka undangan kembali.")
	}
	a.limited(w, r, "response", 20, 60)
	_, v := body(w, r, 8192, false)
	only(v, "attendance", "guestCount", "message")
	attendance := text(v["attendance"])
	if attendance != "attending" && attendance != "not_attending" && attendance != "unsure" {
		fail(400, "attendance", "Pilih konfirmasi kehadiran.")
	}
	n, ok := v["guestCount"].(float64)
	if !ok || n != float64(int(n)) || (attendance == "attending" && (n < 1 || n > 10)) || (attendance != "attending" && n != 0) {
		fail(400, "guest_count", "Jumlah tamu hadir harus 1–10 orang, atau 0 jika tidak hadir/belum pasti.")
	}
	message, ok := v["message"].(string)
	if !ok || length(message) > 1000 || match(`[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]`, message) {
		fail(400, "message", "Ucapan maksimal 1000 karakter.")
	}
	response := a.transaction(r.Context(), func(q db) any {
		g := row(r.Context(), q, "SELECT active,version FROM wedding.guests WHERE id=$1 FOR UPDATE", s["guest_id"])
		if g == nil || number(g["active"]) == 0 || g["version"] != s["version"] {
			fail(401, "unauthorized", "Silakan buka undangan kembali.")
		}
		exec(r.Context(), q, `INSERT INTO wedding.responses(guest_id,attendance,guest_count,message) VALUES($1,$2,$3,$4) ON CONFLICT(guest_id) DO UPDATE SET attendance=EXCLUDED.attendance,guest_count=EXCLUDED.guest_count,message=EXCLUDED.message,updated_at=CASE WHEN (responses.attendance,responses.guest_count,responses.message) IS DISTINCT FROM (EXCLUDED.attendance,EXCLUDED.guest_count,EXCLUDED.message) THEN now() ELSE responses.updated_at END`, s["guest_id"], attendance, int(n), strings.TrimSpace(message))
		return row(r.Context(), q, responseSelect, s["guest_id"])
	})
	jsonResponse(w, 200, response)
}
func (a *App) wishes(w http.ResponseWriter, r *http.Request) {
	s := a.invitationSession(r)
	page := "1"
	if r.URL.Query().Has("page") {
		page = r.URL.Query().Get("page")
	}
	n, _ := strconv.Atoi(page)
	if !match(`^[1-9]\d{0,4}$`, page) || n > 10000 {
		fail(400, "page", "Halaman ucapan tidak valid.")
	}
	// shortcut: offset pages can shift as wishes change; use a cursor for a busy guestbook.
	result := rows(r.Context(), a.Pool, `SELECT g.name,r.message,r.updated_at AS "updatedAt" FROM wedding.responses r JOIN wedding.guests g ON g.id=r.guest_id WHERE g.active=1 AND r.message<>'' AND g.tenant_id=$2 ORDER BY r.updated_at DESC,r.guest_id LIMIT 11 OFFSET $1`, (n-1)*10, s["tenant_id"])
	more := len(result) > 10
	if more {
		result = result[:10]
	}
	jsonResponse(w, 200, map[string]any{"wishes": result, "hasMore": more})
}
