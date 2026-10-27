package app

import (
	"bytes"
	"context"
	"crypto/sha512"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const packagePrice = 199000
const packageMonths = 12
const accessSQL = `(NOT a.billing_required OR a.paid_until>now())`

func subscription(s map[string]any) map[string]any {
	required, _ := s["billing_required"].(bool)
	active := !required
	if until, ok := s["paid_until"].(time.Time); ok {
		active = active || until.After(time.Now())
	}
	return map[string]any{"required": required, "active": active, "expiresAt": s["paid_until"]}
}
func hasAccess(s map[string]any) bool { return s != nil && subscription(s)["active"] == true }
func requireAccess(s map[string]any) {
	if !hasAccess(s) {
		fail(402, "payment_required", "Aktifkan akses undangan dengan pembayaran Rp199.000 untuk 12 bulan.")
	}
}

// Blank self-service invitations must not inherit the original couple's names,
// bank accounts, or WhatsApp signature from the legacy template defaults.
func selfServiceDefaults(settings map[string]any) {
	defaults := map[string]any{"partnerOneName": "", "partnerTwoName": "", "partnerOneFather": "", "partnerOneMother": "", "partnerTwoFather": "", "partnerTwoMother": "", "giftEnabled": "false", "giftAccounts": []any{}, "whatsappTemplate": "Yth. {nama},\n\nKami mengundang Bapak/Ibu/Saudara/i untuk hadir dalam pernikahan kami.\n\n{tanggal}\n{tempat}\n\nUndangan dan konfirmasi kehadiran:\n{link}\n\nTerima kasih atas doa restunya."}
	for key, value := range defaults {
		if _, exists := settings[key]; !exists {
			settings[key] = value
		}
	}
}

func (a *App) register(w http.ResponseWriter, r *http.Request) {
	a.limited(w, r, "register", 5, 900)
	_, v := body(w, r, 8192, false)
	only(v, "email", "password", "name")
	email := strings.ToLower(strings.TrimSpace(text(v["email"])))
	password := text(v["password"])
	if length(email) > 254 || !match(`^[^\s@]+@[^\s@]+\.[^\s@]+$`, email) || length(password) < 12 || length(password) > 1024 {
		fail(400, "registration", "Gunakan email valid dan kata sandi 12–1024 karakter.")
	}
	name := validName(v["name"])
	encoded, err := PasswordHash(password)
	must(err)
	token, csrf := secret(), secret()
	result := a.transaction(r.Context(), func(q db) any {
		s := row(r.Context(), q, `INSERT INTO wedding.accounts(email,password_hash,billing_required) VALUES($1,$2,true) ON CONFLICT(email) DO NOTHING RETURNING id::text AS account_id,email,billing_required,paid_until`, email, encoded)
		if s == nil {
			fail(409, "email_exists", "Email sudah terdaftar. Silakan masuk ke akun Anda.")
		}
		t := row(r.Context(), q, `INSERT INTO wedding.tenants(owner_id,slug,name) VALUES($1,$2,$3) RETURNING id::text AS tenant_id,slug AS tenant_slug,public_id::text AS public_id,name AS tenant_name`, s["account_id"], "undangan-"+uuid(), name)
		for k, v := range t {
			s[k] = v
		}
		exec(r.Context(), q, `INSERT INTO wedding.settings(tenant_id) VALUES($1)`, s["tenant_id"])
		exec(r.Context(), q, `INSERT INTO wedding.sessions(token_hash,csrf,account_id,tenant_id,expires_at) VALUES($1,$2,$3,$4,now()+interval '8 hours')`, hash(token), csrf, s["account_id"], s["tenant_id"])
		return map[string]any{"csrf": csrf, "account": a.account(s)}
	})
	a.cookie(w, "wedding_admin", token, 28800)
	jsonResponse(w, 201, result)
}

// Resolve a delayed/missing webhook before deciding which screen login should open.
// Provider outages must not prevent authentication; the billing page can retry.
func (a *App) reconcileSubscription(ctx context.Context, s map[string]any) {
	if s == nil || hasAccess(s) || !a.paymentAvailable() {
		return
	}
	account := s["account_id"]
	if account == nil {
		account = s["id"]
	}
	p := row(ctx, a.Pool, `SELECT id FROM wedding.payments WHERE account_id=$1 AND environment=$2 AND activated_at IS NULL AND status IN ('creating','pending','expire') ORDER BY created_at DESC,id DESC LIMIT 1`, account, a.Config.MidtransEnv)
	if p == nil {
		return
	}
	func() {
		defer func() {
			if x := recover(); x != nil {
				if e, ok := x.(apiError); !ok || e.Status != 503 {
					panic(x)
				}
			}
		}()
		a.syncPayment(ctx, text(p["id"]))
	}()
	fresh := row(ctx, a.Pool, `SELECT billing_required,paid_until FROM wedding.accounts WHERE id=$1`, account)
	if fresh != nil {
		s["billing_required"] = fresh["billing_required"]
		s["paid_until"] = fresh["paid_until"]
	}
}

func (a *App) paymentAvailable() bool { return a.Config.MidtransServerKey != "" }
func (a *App) midtransBase(snap bool) string {
	if a.Config.MidtransAPIOrigin != "" {
		return a.Config.MidtransAPIOrigin
	}
	host := "api"
	if snap {
		host = "app"
	}
	if a.Config.MidtransEnv == "sandbox" {
		host += ".sandbox"
	}
	return "https://" + host + ".midtrans.com"
}
func (a *App) midtrans(ctx context.Context, method, path string, payload any, snap bool) (map[string]any, int) {
	if !a.paymentAvailable() {
		fail(503, "payment_unavailable", "Pembayaran belum tersedia. Silakan coba lagi nanti.")
	}
	var data io.Reader
	if payload != nil {
		b, err := json.Marshal(payload)
		must(err)
		data = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, a.midtransBase(snap)+path, data)
	must(err)
	req.SetBasicAuth(a.Config.MidtransServerKey, "")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	res, err := a.Client.Do(req)
	if err != nil {
		fail(503, "payment_unavailable", "Koneksi pembayaran terganggu. Silakan periksa status sebelum mencoba lagi.")
	}
	defer res.Body.Close()
	var out map[string]any
	if json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&out) != nil {
		fail(503, "payment_unavailable", "Layanan pembayaran belum dapat merespons.")
	}
	if res.StatusCode == 404 || text(out["status_code"]) == "404" {
		return nil, 404
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		fail(503, "payment_unavailable", "Layanan pembayaran belum dapat merespons. Silakan coba lagi.")
	}
	return out, res.StatusCode
}

const paymentSelect = `SELECT id,status,amount,checkout_url AS "checkoutUrl",expires_at AS "expiresAt" FROM wedding.payments`

func (a *App) billing(ctx context.Context, s map[string]any) map[string]any {
	current := row(ctx, a.Pool, `SELECT billing_required,paid_until FROM wedding.accounts WHERE id=$1`, s["account_id"])
	return map[string]any{"subscription": subscription(current), "price": packagePrice, "months": packageMonths, "available": a.paymentAvailable(), "payment": row(ctx, a.Pool, paymentSelect+` WHERE account_id=$1 AND environment=$2 ORDER BY created_at DESC,id DESC LIMIT 1`, s["account_id"], a.Config.MidtransEnv)}
}
func (a *App) billingRoute(w http.ResponseWriter, r *http.Request) {
	s := a.authorized(r, true, r.Method != "GET")
	if r.Method == "GET" && r.URL.Path == "/api/admin/billing" {
		jsonResponse(w, 200, a.billing(r.Context(), s))
		return
	}
	if r.Method != "POST" {
		fail(405, "method", "Metode tidak didukung.")
	}
	_, v := body(w, r, 1024, false)
	only(v)
	a.limited(w, r, "billing", 20, 60)
	switch r.URL.Path {
	case "/api/admin/billing/payments":
		a.checkout(w, r, s)
	case "/api/admin/billing/refresh":
		p := row(r.Context(), a.Pool, `SELECT id FROM wedding.payments WHERE account_id=$1 AND environment=$2 ORDER BY created_at DESC,id DESC LIMIT 1`, s["account_id"], a.Config.MidtransEnv)
		if p != nil {
			a.syncPayment(r.Context(), text(p["id"]))
		}
		jsonResponse(w, 200, a.billing(r.Context(), s))
	default:
		fail(404, "not_found", "Halaman tidak ditemukan.")
	}
}
func validCheckoutURL(raw, environment string) bool {
	u, err := url.Parse(raw)
	host := "app.midtrans.com"
	if environment == "sandbox" {
		host = "app.sandbox.midtrans.com"
	}
	return err == nil && u.Scheme == "https" && u.Host == host && u.User == nil && strings.HasPrefix(u.Path, "/snap/")
}
func (a *App) checkout(w http.ResponseWriter, r *http.Request, s map[string]any) {
	if !a.paymentAvailable() {
		fail(503, "payment_unavailable", "Pembayaran belum tersedia. Silakan coba lagi nanti.")
	}
	// Serialize checkout creation per account. Persist the intent BEFORE calling Midtrans:
	// timeout/crash must not lose an order which could later settle.
	p := a.transaction(r.Context(), func(q db) any {
		current := row(r.Context(), q, `SELECT billing_required,paid_until FROM wedding.accounts WHERE id=$1 FOR UPDATE`, s["account_id"])
		if hasAccess(current) {
			fail(409, "already_active", "Akses akun Anda masih aktif.")
		}
		old := row(r.Context(), q, paymentSelect+` WHERE account_id=$1 AND status IN ('creating','pending') ORDER BY created_at DESC LIMIT 1`, s["account_id"])
		if old != nil {
			// A completed page can outlive its QRIS code. Never let page expiry alone
			// mark a payment failed; its final status still comes from Midtrans.
			if old["expiresAt"].(time.Time).After(time.Now()) {
				if old["checkoutUrl"] != nil && !validCheckoutURL(text(old["checkoutUrl"]), a.Config.MidtransEnv) {
					fail(409, "payment_environment", "Masih ada pembayaran dari lingkungan lain. Hubungi pengelola sebelum melanjutkan.")
				}
				if old["checkoutUrl"] == nil {
					fail(409, "payment_preparing", "Pembayaran sedang disiapkan. Coba lagi sebentar.")
				}
				return old
			}
			exec(r.Context(), q, `UPDATE wedding.payments SET status='expire',updated_at=now() WHERE id=$1`, old["id"])
		}
		return row(r.Context(), q, `INSERT INTO wedding.payments(id,account_id,environment,expires_at) VALUES($1,$2,$3,now()+interval '1 minute') RETURNING id,status,amount,checkout_url AS "checkoutUrl",expires_at AS "expiresAt"`, "wi-"+uuid(), s["account_id"], a.Config.MidtransEnv)
	}).(map[string]any)
	if p["checkoutUrl"] != nil {
		jsonResponse(w, 200, p)
		return
	}
	payload := map[string]any{
		"transaction_details": map[string]any{"order_id": p["id"], "gross_amount": packagePrice},
		"item_details":        []map[string]any{{"id": "invitation-12-months", "price": packagePrice, "quantity": 1, "name": "Weddinvita - Akses 12 Bulan"}},
		"customer_details":    map[string]any{"email": s["email"]},
		"enabled_payments":    []string{"gopay", "other_qris"},
		"callbacks":           map[string]any{"finish": a.Config.CMSOrigin + "/#pembayaran"},
		"expiry":              map[string]any{"start_time": time.Now().UTC().Format("2006-01-02 15:04:05 -0700"), "duration": 24, "unit": "hours"},
		"page_expiry":         map[string]any{"duration": 24, "unit": "hours"},
	}
	// If a request fails, permit a retry after a short lease. Unreturned checkout
	// URLs stay inaccessible; a late payment notification still resolves by order ID.
	defer func() {
		if x := recover(); x != nil {
			cleanup, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), 3*time.Second)
			defer cancel()
			_, _ = a.Pool.Exec(cleanup, `UPDATE wedding.payments SET expires_at=LEAST(expires_at,now()+interval '1 minute') WHERE id=$1 AND checkout_url IS NULL`, p["id"])
			panic(x)
		}
	}()
	result, _ := a.midtrans(r.Context(), "POST", "/snap/v1/transactions", payload, true)
	link := text(result["redirect_url"])
	if !validCheckoutURL(link, a.Config.MidtransEnv) {
		fail(503, "payment_unavailable", "Tautan pembayaran tidak valid. Silakan coba lagi nanti.")
	}
	exec(r.Context(), a.Pool, `UPDATE wedding.payments SET checkout_url=$2,status=CASE WHEN status='creating' THEN 'pending' ELSE status END,expires_at=created_at+interval '24 hours',updated_at=now() WHERE id=$1`, p["id"], link)
	jsonResponse(w, 200, row(r.Context(), a.Pool, paymentSelect+` WHERE id=$1`, p["id"]))
}
func notificationSignature(order, status, amount, key string) string {
	s := sha512.Sum512([]byte(order + status + amount + key))
	return hex.EncodeToString(s[:])
}
func (a *App) paymentNotification(w http.ResponseWriter, r *http.Request) {
	if !a.paymentAvailable() {
		fail(503, "payment_unavailable", "Pembayaran belum tersedia.")
	}
	_, v := body(w, r, 65536, false)
	order, status, amount, sig := text(v["order_id"]), text(v["status_code"]), text(v["gross_amount"]), text(v["signature_key"])
	if !match(`^[A-Za-z0-9_.:-]{1,128}$`, order) || len(sig) != 128 || subtle.ConstantTimeCompare([]byte(sig), []byte(notificationSignature(order, status, amount, a.Config.MidtransServerKey))) != 1 {
		fail(403, "signature", "Notifikasi pembayaran tidak valid.")
	}
	if row(r.Context(), a.Pool, `SELECT id FROM wedding.payments WHERE id=$1 AND environment=$2`, order, a.Config.MidtransEnv) == nil {
		// Midtrans's connection test and other apps on the same merchant can
		// notify unrelated order IDs. Acknowledge authenticated events only;
		// no entitlement is changed for an unknown order.
		jsonResponse(w, 200, map[string]bool{"ok": true})
		return
	}
	a.syncPayment(r.Context(), order)
	jsonResponse(w, 200, map[string]bool{"ok": true})
}
func (a *App) syncPayment(ctx context.Context, id string) {
	value, status := a.midtrans(ctx, "GET", "/v2/"+url.PathEscape(id)+"/status", nil, false)
	if status == 404 {
		return
	} // Snap exists, but payer has not selected a payment method yet.
	if text(value["order_id"]) != id || !match(`^199000(?:\.0{1,2})?$`, text(value["gross_amount"])) || text(value["currency"]) != "IDR" {
		fail(503, "payment_mismatch", "Status pembayaran belum dapat diverifikasi.")
	}
	next := text(value["transaction_status"])
	switch next {
	case "pending", "settlement", "deny", "cancel", "expire", "failure", "refund", "partial_refund":
	default:
		fail(503, "payment_status", "Status pembayaran belum dapat diverifikasi.")
	}
	if next == "settlement" && (text(value["status_code"]) != "200" || (text(value["fraud_status"]) != "" && text(value["fraud_status"]) != "accept") || (text(value["payment_type"]) != "qris" && text(value["payment_type"]) != "gopay")) {
		fail(503, "payment_status", "Pembayaran belum dapat dikonfirmasi.")
	}
	a.transaction(ctx, func(q db) any {
		owner := row(ctx, q, `SELECT account_id FROM wedding.payments WHERE id=$1 AND environment=$2`, id, a.Config.MidtransEnv)
		if owner == nil {
			fail(404, "payment_not_found", "Pembayaran tidak ditemukan.")
		}
		// Use the same account -> payment lock order as checkout to avoid deadlocks.
		row(ctx, q, `SELECT id FROM wedding.accounts WHERE id=$1 FOR UPDATE`, owner["account_id"])
		p := row(ctx, q, `SELECT * FROM wedding.payments WHERE id=$1 AND environment=$2 FOR UPDATE`, id, a.Config.MidtransEnv)
		if p == nil {
			fail(404, "payment_not_found", "Pembayaran tidak ditemukan.")
		}
		if next == "pending" && p["status"] != "creating" && p["status"] != "pending" {
			return nil
		}
		if p["status"] == "refund" || (p["activated_at"] != nil && next != "refund" && next != "partial_refund") {
			return nil
		}
		if next == "settlement" && p["activated_at"] == nil {
			// The account row lock makes two different paid orders additive, while the
			// payment row lock makes duplicate webhook/refresh delivery idempotent.
			account := row(ctx, q, `UPDATE wedding.accounts SET paid_until=GREATEST(COALESCE(paid_until,now()),now())+interval '12 months' WHERE id=$1 RETURNING paid_until`, p["account_id"])
			exec(ctx, q, `UPDATE wedding.payments SET activated_at=now(),access_ends_at=$2 WHERE id=$1`, id, account["paid_until"])
		}
		exec(ctx, q, `UPDATE wedding.payments SET status=$2,transaction_id=COALESCE(NULLIF($3,''),transaction_id),updated_at=now() WHERE id=$1`, id, next, text(value["transaction_id"]))
		if next == "refund" {
			exec(ctx, q, `UPDATE wedding.accounts SET paid_until=(SELECT max(access_ends_at) FROM wedding.payments WHERE account_id=$1 AND activated_at IS NOT NULL AND status IN ('settlement','partial_refund')) WHERE id=$1`, p["account_id"])
		}
		return nil
	})
}
