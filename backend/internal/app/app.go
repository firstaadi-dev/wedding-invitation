package app

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"
	"unicode/utf16"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/scrypt"
)

type Config struct {
	Origin, CMSOrigin, Endpoint, PublicKey, SecretKey, Region, Templates, FingerprintOrigin string
	Production, TrustProxy                                                                  bool
}
type App struct {
	Pool   *pgxpool.Pool
	Config Config
	Client *http.Client
}
type db interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
}
type apiError struct {
	Status        int
	Code, Message string
}

func (e apiError) Error() string            { return e.Message }
func fail(status int, code, message string) { panic(apiError{status, code, message}) }
func must(err error) {
	if err != nil {
		panic(err)
	}
}
func match(pattern, s string) bool { return regexp.MustCompile(pattern).MatchString(s) }
func text(v any) string            { s, _ := v.(string); return s }
func length(s string) int          { return len(utf16.Encode([]rune(s))) }
func number(v any) int {
	switch n := v.(type) {
	case int16:
		return int(n)
	case int32:
		return int(n)
	case int64:
		return int(n)
	case float64:
		return int(n)
	}
	return 0
}
func hash(s string) string { sum := sha256.Sum256([]byte(s)); return hex.EncodeToString(sum[:]) }
func secret() string {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	must(err)
	return base64.RawURLEncoding.EncodeToString(b)
}
func uuid() string {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	must(err)
	b[6] = (b[6] & 15) | 64
	b[8] = (b[8] & 63) | 128
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[:4], b[4:6], b[6:8], b[8:10], b[10:])
}
func rows(ctx context.Context, q db, sql string, args ...any) []map[string]any {
	r, err := q.Query(ctx, sql, args...)
	must(err)
	defer r.Close()
	result, err := pgx.CollectRows(r, pgx.RowToMap)
	must(err)
	if result == nil {
		return []map[string]any{}
	}
	return result
}
func row(ctx context.Context, q db, sql string, args ...any) map[string]any {
	r := rows(ctx, q, sql, args...)
	if len(r) == 0 {
		return nil
	}
	return r[0]
}
func exec(ctx context.Context, q db, sql string, args ...any) pgconn.CommandTag {
	tag, err := q.Exec(ctx, sql, args...)
	must(err)
	return tag
}
func (a *App) transaction(ctx context.Context, fn func(db) any) any {
	tx, err := a.Pool.Begin(ctx)
	must(err)
	defer tx.Rollback(ctx)
	result := fn(tx)
	must(tx.Commit(ctx))
	return result
}
func validOrigin(raw string, https bool) (string, error) {
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || (u.Path != "" && u.Path != "/") || (u.Scheme != "http" && u.Scheme != "https") || (https && u.Scheme != "https") {
		return "", errors.New("invalid origin")
	}
	return u.Scheme + "://" + u.Host, nil
}
func New(pool *pgxpool.Pool, c Config) (*App, error) {
	var err error
	c.Origin, err = validOrigin(c.Origin, c.Production)
	if err != nil {
		return nil, fmt.Errorf("PUBLIC_ORIGIN: %w", err)
	}
	if c.CMSOrigin == "" {
		c.CMSOrigin = c.Origin
	}
	c.CMSOrigin, err = validOrigin(c.CMSOrigin, c.Production)
	if err != nil {
		return nil, fmt.Errorf("CMS_ORIGIN: %w", err)
	}
	if c.Endpoint != "" {
		c.Endpoint, err = validOrigin(c.Endpoint, true)
		if err != nil {
			return nil, fmt.Errorf("Fingerprint endpoint must be an HTTPS origin")
		}
	}
	if c.Region == "" {
		c.Region = "ap"
	}
	if c.Region != "us" && c.Region != "eu" && c.Region != "ap" {
		return nil, fmt.Errorf("FINGERPRINT_REGION must be us, eu, or ap")
	}
	if c.Templates == "" {
		c.Templates = "frontend/dist"
	}
	return &App{pool, c, &http.Client{Timeout: 10 * time.Second}}, nil
}
func (a *App) Handler() http.Handler {
	r := chi.NewRouter()
	r.Use(a.security)
	r.HandleFunc("/*", a.serve)
	return r
}
func (a *App) security(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Cache-Control", "no-store")
		csp := "default-src 'self'; script-src 'self' https://fpjscdn.net; worker-src 'self' blob:; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; media-src 'self'; connect-src 'self' https://*.fpjs.io https://*.fingerprint.com https://fpjscdn.net; frame-src https://www.google.com; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
		if a.Config.Endpoint != "" {
			csp = strings.Replace(csp, "script-src 'self'", "script-src 'self' "+a.Config.Endpoint, 1)
			csp = strings.Replace(csp, "connect-src 'self'", "connect-src 'self' "+a.Config.Endpoint, 1)
		}
		h.Set("Content-Security-Policy", csp)
		if a.Config.Production {
			h.Set("Strict-Transport-Security", "max-age=31536000")
		}
		next.ServeHTTP(w, r)
	})
}
func jsonResponse(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v)
}
func body(w http.ResponseWriter, r *http.Request, limit int64, binary bool) ([]byte, map[string]any) {
	if !binary && strings.Split(r.Header.Get("Content-Type"), ";")[0] != "application/json" {
		fail(415, "content_type", "Gunakan Content-Type application/json.")
	}
	b, err := io.ReadAll(http.MaxBytesReader(w, r.Body, limit))
	if err != nil {
		var large *http.MaxBytesError
		if errors.As(err, &large) {
			fail(413, "body_too_large", "File terlalu besar.")
		}
		fail(400, "invalid_json", "Data tidak valid.")
	}
	if binary {
		return b, nil
	}
	var value map[string]any
	if json.Unmarshal(b, &value) != nil || value == nil {
		fail(400, "invalid_json", "Data tidak valid.")
	}
	return nil, value
}
func only(value map[string]any, keys ...string) {
	for key := range value {
		found := false
		for _, allowed := range keys {
			if key == allowed {
				found = true
				break
			}
		}
		if !found {
			fail(400, "invalid_field", "Kolom tidak dikenal.")
		}
	}
}
func (a *App) cookie(w http.ResponseWriter, name, value string, seconds int) {
	w.Header().Set("Set-Cookie", fmt.Sprintf("%s=%s; Path=/; HttpOnly; SameSite=Strict; Max-Age=%d%s", name, value, seconds, map[bool]string{true: "; Secure"}[a.Config.Production]))
}
func (a *App) session(r *http.Request, admin bool) map[string]any {
	name := "wedding_guest"
	if admin {
		name = "wedding_admin"
	}
	cookie, err := r.Cookie(name)
	if err != nil || !match(`^[A-Za-z0-9_-]{43}$`, cookie.Value) {
		return nil
	}
	return row(r.Context(), a.Pool, `SELECT s.token_hash,s.guest_id,s.version,s.csrf,s.account_id::text AS account_id,g.name,COALESCE(g.tenant_id,s.tenant_id)::text AS tenant_id,t.slug AS tenant_slug,t.public_id::text AS public_id,t.name AS tenant_name,a.email
 FROM wedding.sessions s LEFT JOIN wedding.guests g ON g.id=s.guest_id
 JOIN wedding.tenants t ON t.id=COALESCE(g.tenant_id,s.tenant_id)
 JOIN wedding.accounts owner ON owner.id=t.owner_id AND owner.active LEFT JOIN wedding.accounts a ON a.id=s.account_id
 WHERE s.token_hash=$1 AND s.expires_at>now() AND (($2 AND s.guest_id IS NULL AND a.active AND t.owner_id=a.id) OR (NOT $2 AND g.active=1 AND g.version=s.version))`, hash(cookie.Value), admin)
}
func (a *App) authorized(r *http.Request, admin, mutation bool) map[string]any {
	s := a.session(r, admin)
	if s == nil {
		fail(401, "unauthorized", "Silakan masuk kembali.")
	}
	if mutation && r.Header.Get("X-CSRF-Token") != text(s["csrf"]) {
		fail(403, "csrf", "Sesi berubah. Muat ulang halaman.")
	}
	return s
}
func (a *App) invitationSession(r *http.Request) map[string]any {
	var s map[string]any
	if r.URL.Query().Get("preview") == "1" {
		s = a.session(r, true)
	} else {
		s = a.session(r, false)
		if s == nil {
			s = a.session(r, true)
		}
	}
	if s == nil {
		fail(401, "unauthorized", "Buka tautan undangan yang Anda terima.")
	}
	if r.URL.Query().Has("tenant") && !matchesTenant(r.URL.Query().Get("tenant"), s) {
		fail(401, "unauthorized", "Silakan buka tautan undangan kembali.")
	}
	return s
}

// Bind a rendered form to its session without exposing the session credential.
func responseToken(s map[string]any) string {
	if s["guest_id"] == nil {
		return ""
	}
	return hash("invitation-response:" + text(s["token_hash"]))
}
func requireResponseToken(r *http.Request, s map[string]any) {
	if subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Invitation-Token")), []byte(responseToken(s))) != 1 {
		fail(409, "invitation_changed", "Sesi undangan berubah. Muat ulang halaman sebelum mengisi konfirmasi.")
	}
}
func matchesTenant(scope string, s map[string]any) bool {
	return scope == text(s["tenant_slug"]) || scope == text(s["public_id"])
}
func (a *App) mutationOrigin(path string) string {
	if strings.HasPrefix(path, "/api/admin/") {
		return a.Config.CMSOrigin
	}
	return a.Config.Origin
}
func clientIP(r *http.Request, c Config) string {
	if c.Production && c.TrustProxy {
		parts := strings.Split(r.Header.Get("X-Forwarded-For"), ",")
		if ip := strings.TrimSpace(parts[len(parts)-1]); ip != "" {
			return ip
		}
	}
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	return host
}
func (a *App) limited(w http.ResponseWriter, r *http.Request, action string, maximum, seconds int) {
	ip := clientIP(r, a.Config)
	if ip == "" {
		ip = "unknown"
	}
	value := row(r.Context(), a.Pool, `INSERT INTO wedding.rate_limits(key,hits,expires_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE rate_limits.hits+1 END, expires_at=CASE WHEN rate_limits.expires_at<now() THEN EXCLUDED.expires_at ELSE rate_limits.expires_at END RETURNING hits`, hash(action+":"+ip), seconds)
	if number(value["hits"]) > maximum {
		w.Header().Set("Retry-After", fmt.Sprint(seconds))
		fail(429, "rate_limit", "Terlalu banyak percobaan. Silakan tunggu sebentar.")
	}
}
func (a *App) account(s map[string]any) map[string]any {
	return map[string]any{"email": s["email"], "invitationOrigin": a.Config.Origin, "tenant": map[string]any{"id": s["tenant_id"], "slug": s["tenant_slug"], "publicId": s["public_id"], "name": s["tenant_name"]}}
}
func (a *App) serve(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if recovered := recover(); recovered != nil {
			e, ok := recovered.(apiError)
			if !ok {
				log.Printf("Request failed: %T", recovered)
				e = apiError{500, "server_error", "Ada gangguan sementara. Silakan coba lagi."}
			}
			jsonResponse(w, e.Status, map[string]string{"error": e.Message, "code": e.Code})
		}
	}()
	path, method := r.URL.Path, r.Method
	if !match(`^(GET|HEAD|POST|PUT|PATCH|DELETE)$`, method) {
		fail(405, "method", "Metode tidak didukung.")
	}
	if strings.HasPrefix(path, "/api/") && method != "GET" && method != "HEAD" && r.Header.Get("Origin") != a.mutationOrigin(path) {
		fail(403, "origin", "Permintaan harus berasal dari situs undangan.")
	}
	if path == "/healthz" && method == "GET" {
		must(a.Pool.Ping(r.Context()))
		jsonResponse(w, 200, map[string]bool{"ok": true})
		return
	}
	if path == "/api/identification/config" && method == "GET" {
		jsonResponse(w, 200, map[string]string{"endpoint": a.Config.Endpoint, "publicKey": a.Config.PublicKey, "region": a.Config.Region})
		return
	}
	if path == "/api/admin/login" && method == "POST" {
		a.login(w, r)
		return
	}
	if strings.HasPrefix(path, "/api/admin/") {
		a.admin(w, r)
		return
	}
	if path == "/api/access/challenge" && method == "POST" {
		a.challenge(w, r)
		return
	}
	if path == "/api/access/verify" && method == "POST" {
		a.verify(w, r)
		return
	}
	if path == "/api/invitation" && method == "GET" {
		s := a.invitationSession(r)
		var response any
		if s["guest_id"] != nil {
			response = row(r.Context(), a.Pool, responseSelect, s["guest_id"])
		}
		result := a.content(r.Context(), a.Pool, text(s["tenant_id"]), false)
		name := text(s["name"])
		if name == "" {
			name = "Tamu Undangan"
		}
		result["guestName"] = name
		result["tenantSlug"] = s["tenant_slug"]
		result["invitationId"] = s["public_id"]
		result["canRespond"] = s["guest_id"] != nil
		result["response"] = response
		result["responseToken"] = responseToken(s)
		jsonResponse(w, 200, result)
		return
	}
	if path == "/api/response" && method == "PUT" {
		a.respond(w, r)
		return
	}
	if path == "/api/wishes" && method == "GET" {
		a.wishes(w, r)
		return
	}
	if (strings.HasPrefix(path, "/media/") || strings.HasPrefix(path, "/preview-image/")) && (method == "GET" || method == "HEAD") {
		a.media(w, r)
		return
	}
	if method == "GET" || method == "HEAD" {
		a.html(w, r)
		return
	}
	fail(404, "not_found", "Halaman tidak ditemukan.")
}
func passwordMatches(password, encoded string) bool {
	parts := strings.Split(encoded, ":")
	if len(parts) != 2 || !match(`^[a-f0-9]{32}:[a-f0-9]{128}$`, encoded) {
		return false
	}
	expected, err := hex.DecodeString(parts[1])
	must(err)
	actual, err := scrypt.Key([]byte(password), []byte(parts[0]), 16384, 8, 1, 64)
	must(err)
	return subtle.ConstantTimeCompare(actual, expected) == 1
}
func PasswordHash(password string) (string, error) {
	if length(password) < 12 {
		return "", errors.New("Gunakan password minimal 12 karakter.")
	}
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	s := hex.EncodeToString(salt)
	key, err := scrypt.Key([]byte(password), []byte(s), 16384, 8, 1, 64)
	if err != nil {
		return "", err
	}
	return s + ":" + hex.EncodeToString(key), nil
}
func (a *App) login(w http.ResponseWriter, r *http.Request) {
	a.limited(w, r, "login", 8, 900)
	_, v := body(w, r, 8192, false)
	only(v, "email", "password")
	email, emailOK := v["email"].(string)
	password, passwordOK := v["password"].(string)
	if !emailOK || length(email) > 254 || !match(`^[^\s@]+@[^\s@]+\.[^\s@]+$`, strings.TrimSpace(email)) || !passwordOK || password == "" || length(password) > 1024 {
		fail(400, "credentials", "Email atau kata sandi tidak valid.")
	}
	s := row(r.Context(), a.Pool, `SELECT a.id::text AS id,a.email,a.password_hash,t.id::text AS tenant_id,t.slug AS tenant_slug,t.public_id::text AS public_id,t.name AS tenant_name FROM wedding.accounts a JOIN wedding.tenants t ON t.owner_id=a.id WHERE a.email=$1 AND a.active`, strings.ToLower(strings.TrimSpace(email)))
	encoded := strings.Repeat("0", 32) + ":" + strings.Repeat("0", 128)
	if s != nil {
		encoded = text(s["password_hash"])
	}
	if !passwordMatches(password, encoded) || s == nil {
		fail(401, "invalid_login", "Email atau kata sandi tidak sesuai.")
	}
	token, csrf := secret(), secret()
	exec(r.Context(), a.Pool, `INSERT INTO wedding.sessions(token_hash,csrf,account_id,tenant_id,expires_at) VALUES($1,$2,$3,$4,now()+interval '8 hours')`, hash(token), csrf, s["id"], s["tenant_id"])
	a.cookie(w, "wedding_admin", token, 28800)
	jsonResponse(w, 200, map[string]any{"csrf": csrf, "account": a.account(s)})
}

func ReadTemplates(directory string) error {
	for _, file := range []string{"index.html", "access.html"} {
		if _, err := os.ReadFile(directory + "/" + file); err != nil {
			return err
		}
	}
	return nil
}
