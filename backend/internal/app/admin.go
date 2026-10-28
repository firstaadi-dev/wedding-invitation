package app

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"
)

const responseSelect = `SELECT attendance,guest_count AS "guestCount",message,updated_at AS "updatedAt" FROM wedding.responses WHERE guest_id=$1`
const deviceLimitSQL = `CASE WHEN g.unlimited OR s.value->>'deviceLimitEnabled'='false' THEN NULL ELSE COALESCE((s.value->>'deviceLimit')::integer,3) END`
const guestSelect = `SELECT g.id,g.name,g.phone,g.invitation_link AS link,g.active,g.unlimited,` + deviceLimitSQL + ` AS "deviceLimit",(EXTRACT(EPOCH FROM g.created_at)*1000)::float8 AS "createdAt",(SELECT count(*)::integer FROM wedding.devices d WHERE d.guest_id=g.id) AS "deviceCount",CASE WHEN r.guest_id IS NULL THEN NULL ELSE json_build_object('attendance',r.attendance,'guestCount',r.guest_count,'message',r.message,'updatedAt',r.updated_at) END AS response FROM wedding.guests g JOIN wedding.settings s ON s.tenant_id=g.tenant_id LEFT JOIN wedding.responses r ON r.guest_id=g.id`

// Keep this copy equal to frontend/whatsapp.js; the compatibility test checks both.
const DefaultWhatsappTemplate = `Yth. {nama},

Kami mengundang Bapak/Ibu/Saudara/i untuk hadir dalam pernikahan kami.

{tanggal}
{tempat}

Informasi acara dan konfirmasi kehadiran tersedia melalui undangan berikut:
{link}

Terima kasih atas doa restunya.`

func (a *App) content(ctx context.Context, q db, tenant string, admin bool) map[string]any {
	s := row(ctx, q, "SELECT s.value,a.billing_required FROM wedding.settings s JOIN wedding.tenants t ON t.id=s.tenant_id JOIN wedding.accounts a ON a.id=t.owner_id WHERE s.tenant_id=$1", tenant)
	settings := map[string]any{}
	if s != nil {
		settings = s["value"].(map[string]any)
		if s["billing_required"] == true {
			selfServiceDefaults(settings)
		}
	}
	if admin {
		if settings["whatsappTemplate"] == nil {
			settings["whatsappTemplate"] = DefaultWhatsappTemplate
		}
	} else {
		delete(settings, "whatsappTemplate")
	}
	media := map[string]string{}
	for _, m := range rows(ctx, q, "SELECT slot,id FROM wedding.media WHERE tenant_id=$1", tenant) {
		prefix := "/media/"
		if m["slot"] == "preview" {
			prefix = "/preview-image/"
		}
		media[text(m["slot"])] = prefix + text(m["id"])
	}
	return map[string]any{"settings": settings, "media": media}
}
func (a *App) invitationLink(code string) string {
	return a.Config.Origin + "/u/" + code
}
func (a *App) guestLink(g map[string]any, publicID string) map[string]any {
	if g == nil {
		return nil
	}
	if code := storedGuestCode(text(g["link"])); code != "" {
		g["link"] = a.invitationLink(code)
		return g
	}
	link, err := url.Parse(text(g["link"]))
	g["link"] = nil
	if err == nil && match(`^[A-Za-z0-9_-]{43}$`, link.Fragment) {
		g["link"] = a.Config.Origin + "/" + publicID + "#" + link.Fragment
	}
	return g
}
func (a *App) guest(ctx context.Context, q db, id, tenant, publicID string) map[string]any {
	return a.guestLink(row(ctx, q, guestSelect+" WHERE g.id=$1 AND g.tenant_id=$2", id, tenant), publicID)
}
func revoke(ctx context.Context, q db, id string, clear bool) {
	exec(ctx, q, "UPDATE wedding.guests SET version=version+1 WHERE id=$1", id)
	exec(ctx, q, "DELETE FROM wedding.sessions WHERE guest_id=$1", id)
	exec(ctx, q, "DELETE FROM wedding.challenges WHERE guest_id=$1", id)
	if clear {
		exec(ctx, q, "DELETE FROM wedding.devices WHERE guest_id=$1", id)
	}
}
func validName(v any) string {
	s, ok := v.(string)
	if !ok || strings.TrimSpace(s) == "" || length(strings.TrimSpace(s)) > 120 || match(`[\x00-\x1f]`, s) {
		fail(400, "name", "Nama tamu harus berisi 1–120 karakter.")
	}
	return strings.TrimSpace(s)
}
func validPhone(v any) string {
	s, ok := v.(string)
	s = strings.Map(func(r rune) rune {
		if (unicode.IsSpace(r) && r != '\u0085') || r == '\ufeff' {
			return ' '
		}
		return r
	}, s)
	if !ok || length(s) > 40 || !match(`^\+?[0-9\s()-]*$`, strings.TrimSpace(s)) {
		fail(400, "phone", "Nomor telepon tidak valid. Gunakan 08…, 62…, atau +kode negara.")
	}
	phone := regexp.MustCompile(`[\s()-]`).ReplaceAllString(s, "")
	phone = strings.TrimPrefix(phone, "+")
	if strings.TrimSpace(s) != "" && phone == "" {
		fail(400, "phone", "Nomor telepon harus berisi digit.")
	}
	if strings.HasPrefix(phone, "0") {
		phone = "62" + phone[1:]
	}
	if phone != "" && !match(`^[1-9][0-9]{7,14}$`, phone) {
		fail(400, "phone", "Nomor telepon harus berisi 8–15 digit dalam format internasional.")
	}
	return phone
}
func validMap(v any) bool {
	s, ok := v.(string)
	s = strings.Map(func(r rune) rune {
		if (unicode.IsSpace(r) && r != '\u0085') || r == '\ufeff' {
			return ' '
		}
		return r
	}, s)
	if !ok || length(s) > 4096 {
		return false
	}
	if s == "" {
		return true
	}
	u, err := url.Parse(s)
	return err == nil && u.Scheme == "https" && u.Host == "www.google.com" && u.User == nil && strings.HasPrefix(u.Path, "/maps/embed")
}
func validateSettings(v map[string]any) {
	only(v, "partnerOneName", "partnerTwoName", "partnerOneFather", "partnerOneMother", "partnerTwoFather", "partnerTwoMother", "giftEnabled", "giftAccounts", "ceremonyTitle", "receptionTitle", "ceremonyTime", "receptionTime", "countdownTime", "countdownDate", "eventDate", "ceremonyDate", "receptionDate", "venueName", "ceremonyVenue", "receptionVenue", "mapEmbedUrl", "whatsappTemplate", "linkPreviewTitle", "linkPreviewDescription", "deviceLimitEnabled", "deviceLimit")
	if raw, exists := v["deviceLimitEnabled"]; exists && raw != "true" && raw != "false" {
		fail(400, "device_limit_enabled", "Pengaturan batas browser tidak valid.")
	}
	if raw, exists := v["deviceLimit"]; exists {
		s, ok := raw.(string)
		n, err := strconv.ParseInt(s, 10, 32)
		if !ok || !match(`^[1-9][0-9]{0,9}$`, s) || err != nil || n < 1 {
			fail(400, "device_limit", "Batas browser harus bilangan bulat 1–2147483647.")
		}
	}
	if raw, exists := v["whatsappTemplate"]; exists {
		s, ok := raw.(string)
		unknown := regexp.MustCompile(`\{(?:nama|link|tanggal|tempat|jam_acara_[12])\}`).ReplaceAllString(s, "")
		if !ok || strings.TrimSpace(s) == "" || length(s) > 4000 || !strings.Contains(s, "{link}") || match(`\{([^{}]+)\}`, unknown) {
			fail(400, "whatsapp_template", "Pesan maksimal 4000 karakter, wajib memuat {link}, dan hanya mendukung {nama}, {link}, {tanggal}, {tempat}, {jam_acara_1}, serta {jam_acara_2}.")
		}
	}
	for key, max := range map[string]int{"linkPreviewTitle": 120, "linkPreviewDescription": 300} {
		if raw, exists := v[key]; exists {
			s, ok := raw.(string)
			if !ok || length(s) > max {
				fail(400, "link_preview", fmt.Sprintf("Teks pratinjau maksimal %d karakter.", max))
			}
			v[key] = strings.TrimSpace(s)
		}
	}
	for _, key := range []string{"ceremonyTime", "receptionTime"} {
		if raw, exists := v[key]; exists {
			s, ok := raw.(string)
			if !ok || length(s) > 80 {
				fail(400, "time", "Waktu tidak valid.")
			}
		}
	}
	for _, key := range []string{"eventDate", "ceremonyDate", "receptionDate", "countdownDate"} {
		if raw, exists := v[key]; exists {
			s, ok := raw.(string)
			date, err := time.Parse("2006-01-02", s)
			if !ok || (s != "" && (err != nil || date.Format("2006-01-02") != s)) {
				fail(400, "event_date", "Tanggal acara tidak valid. Gunakan format YYYY-MM-DD.")
			}
		}
	}
	for _, key := range []string{"venueName", "ceremonyVenue", "receptionVenue"} {
		if raw, exists := v[key]; exists {
			s, ok := raw.(string)
			if !ok || length(strings.TrimSpace(s)) > 160 || match(`[\x00-\x1f]`, s) {
				fail(400, "venue_name", "Nama tempat maksimal 160 karakter.")
			}
			v[key] = strings.TrimSpace(s)
		}
	}
	for _, key := range []string{"ceremonyTitle", "receptionTitle"} {
		if raw, exists := v[key]; exists {
			s, ok := raw.(string)
			if !ok || length(s) > 80 {
				fail(400, "event_title", "Nama acara maksimal 80 karakter.")
			}
			v[key] = strings.TrimSpace(s)
		}
	}
	for _, key := range []string{"partnerOneName", "partnerTwoName", "partnerOneFather", "partnerOneMother", "partnerTwoFather", "partnerTwoMother"} {
		if raw, exists := v[key]; exists {
			s, ok := raw.(string)
			if !ok || length(strings.TrimSpace(s)) > 120 || match(`[\x00-\x1f]`, s) {
				fail(400, "partner_name", "Nama maksimal 120 karakter.")
			}
			v[key] = strings.TrimSpace(s)
		}
	}
	if raw, exists := v["giftEnabled"]; exists {
		if raw != "true" && raw != "false" {
			fail(400, "gift_enabled", "Pengaturan hadiah tidak valid.")
		}
	}
	if raw, exists := v["giftAccounts"]; exists {
		accounts, ok := raw.([]any)
		if !ok || len(accounts) > 10 {
			fail(400, "gift_accounts", "Maksimal 10 rekening atau alamat pengiriman dengan format yang valid.")
		}
		for i, rawAccount := range accounts {
			account, ok := rawAccount.(map[string]any)
			if !ok {
				fail(400, "gift_accounts", "Nama bank, nomor rekening, atau nama pemilik tidak valid.")
			}
			kind, hasType := account["type"].(string)
			if _, exists := account["type"]; exists && !hasType {
				fail(400, "gift_accounts", "Pilih rekening atau alamat pengiriman.")
			}
			if _, exists := account["type"]; !exists { // Existing account entries predate the type field.
				kind = "account"
			}
			switch kind {
			case "account":
				for key := range account {
					if key != "type" && key != "bank" && key != "number" && key != "owner" {
						fail(400, "gift_accounts", "Data rekening tidak valid.")
					}
				}
				bank, bankOK := account["bank"].(string)
				number, numberOK := account["number"].(string)
				owner, ownerOK := account["owner"].(string)
				if (len(account) != 3 && len(account) != 4) || !bankOK || !numberOK || !ownerOK {
					fail(400, "gift_accounts", "Nama bank, nomor rekening, atau nama pemilik tidak valid.")
				}
				bank, number, owner = strings.TrimSpace(bank), strings.TrimSpace(number), strings.TrimSpace(owner)
				if bank == "" || length(bank) > 80 || number == "" || length(number) > 40 || !match(`^[0-9 ]+$`, number) || strings.ReplaceAll(number, " ", "") == "" || owner == "" || length(owner) > 120 || match(`[\x00-\x1f]`, bank+number+owner) {
					fail(400, "gift_accounts", "Nama bank, nomor rekening, atau nama pemilik tidak valid.")
				}
				accounts[i] = map[string]any{"type": "account", "bank": bank, "number": number, "owner": owner}
			case "address":
				for key := range account {
					if key != "type" && key != "recipient" && key != "address" && key != "phone" {
						fail(400, "gift_accounts", "Data alamat tidak valid.")
					}
				}
				recipient, recipientOK := account["recipient"].(string)
				address, addressOK := account["address"].(string)
				phone, phoneOK := account["phone"].(string)
				if !phoneOK && account["phone"] == nil {
					phone, phoneOK = "", true
				}
				if (len(account) != 3 && len(account) != 4) || !recipientOK || !addressOK || !phoneOK {
					fail(400, "gift_accounts", "Penerima dan alamat pengiriman wajib diisi.")
				}
				recipient, address, phone = strings.TrimSpace(recipient), strings.TrimSpace(address), strings.TrimSpace(phone)
				if recipient == "" || length(recipient) > 120 || address == "" || length(address) > 1000 || match(`[\x00-\x08\x0b\x0c\x0e-\x1f]`, recipient+address+phone) || length(phone) > 40 {
					fail(400, "gift_accounts", "Penerima, alamat pengiriman, atau nomor kontak tidak valid.")
				}
				accounts[i] = map[string]any{"type": "address", "recipient": recipient, "address": address, "phone": phone}
			default:
				fail(400, "gift_accounts", "Pilih rekening atau alamat pengiriman.")
			}
		}
		v["giftAccounts"] = accounts
	}
	if raw, exists := v["countdownTime"]; exists {
		s, ok := raw.(string)
		if !ok || !match(`^(?:|(?:[01]\d|2[0-3]):[0-5]\d)$`, s) {
			fail(400, "countdown_time", "Waktu tujuan hitung mundur tidak valid. Gunakan format 24 jam, misalnya 09:00 (WIB).")
		}
	}
	if raw, exists := v["mapEmbedUrl"]; exists && !validMap(raw) {
		fail(400, "map_url", "Gunakan URL embed resmi Google Maps.")
	}
}
func (a *App) admin(w http.ResponseWriter, r *http.Request) {
	path, method, ctx := r.URL.Path, r.Method, r.Context()
	s := a.authorized(r, true, method != "GET" && method != "HEAD")
	tenant := text(s["tenant_id"])
	a.limited(w, r, "admin", 120, 60)
	if path == "/api/admin/session" && method == "GET" {
		a.reconcileSubscription(ctx, s)
		jsonResponse(w, 200, map[string]any{"csrf": s["csrf"], "account": a.account(s)})
		return
	}
	if path == "/api/admin/logout" && method == "POST" {
		exec(ctx, a.Pool, "DELETE FROM wedding.sessions WHERE token_hash=$1", s["token_hash"])
		a.cookie(w, "wedding_admin", "", 0)
		jsonResponse(w, 200, map[string]bool{"ok": true})
		return
	}
	requireVerified(s)
	requireAccess(s)
	if path == "/api/admin/guests" {
		if method == "GET" {
			guests := rows(ctx, a.Pool, guestSelect+" WHERE g.tenant_id=$1 ORDER BY g.created_at DESC", tenant)
			for _, g := range guests {
				a.guestLink(g, text(s["public_id"]))
			}
			jsonResponse(w, 200, guests)
			return
		}
		if method == "POST" {
			_, v := body(w, r, 8192, false)
			only(v, "name", "phone")
			name := validName(v["name"])
			phone, exists := v["phone"]
			if !exists {
				phone = ""
			}
			id, token := uuid(), guestCode()
			link := a.invitationLink(token)
			exec(ctx, a.Pool, "INSERT INTO wedding.guests(id,name,phone,token_hash,invitation_link,tenant_id) VALUES($1,$2,$3,$4,$5,$6)", id, name, validPhone(phone), hash(token), link, tenant)
			jsonResponse(w, 201, map[string]any{"guest": a.guest(ctx, a.Pool, id, tenant, text(s["public_id"])), "link": link})
			return
		}
	}
	m := regexp.MustCompile(`^/api/admin/guests/([a-f0-9-]{36})(?:/(link|devices))?$`).FindStringSubmatch(path)
	if m != nil {
		id, action := m[1], m[2]
		result := a.transaction(ctx, func(q db) any {
			if row(ctx, q, "SELECT id FROM wedding.guests WHERE id=$1 AND tenant_id=$2 FOR UPDATE", id, tenant) == nil {
				fail(404, "guest_not_found", "Tamu tidak ditemukan.")
			}
			if action == "" && method == "PATCH" {
				_, v := body(w, r, 8192, false)
				only(v, "name", "phone", "active", "unlimited")
				if len(v) == 0 {
					fail(400, "invalid_field", "Isi nama, nomor telepon atau status.")
				}
				if value, ok := v["name"]; ok {
					exec(ctx, q, "UPDATE wedding.guests SET name=$2 WHERE id=$1", id, validName(value))
				}
				if value, ok := v["phone"]; ok {
					exec(ctx, q, "UPDATE wedding.guests SET phone=$2 WHERE id=$1", id, validPhone(value))
				}
				if value, exists := v["unlimited"]; exists {
					unlimited, ok := value.(bool)
					if !ok {
						fail(400, "unlimited", "Pengaturan tanpa limit tidak valid.")
					}
					exec(ctx, q, "UPDATE wedding.guests SET unlimited=$2 WHERE id=$1", id, unlimited)
				}
				if value, exists := v["active"]; exists {
					active, ok := value.(bool)
					if !ok {
						fail(400, "active", "Status tidak valid.")
					}
					n := 0
					if active {
						n = 1
					}
					exec(ctx, q, "UPDATE wedding.guests SET active=$2 WHERE id=$1", id, n)
					if !active {
						revoke(ctx, q, id, false)
					}
				}
				return a.guest(ctx, q, id, tenant, text(s["public_id"]))
			}
			if action == "" && method == "DELETE" {
				exec(ctx, q, "DELETE FROM wedding.guests WHERE id=$1", id)
				return map[string]bool{"ok": true}
			}
			if action == "devices" && method == "DELETE" {
				revoke(ctx, q, id, true)
				return map[string]bool{"ok": true}
			}
			if action == "link" && method == "POST" {
				token := guestCode()
				revoke(ctx, q, id, true)
				link := a.invitationLink(token)
				exec(ctx, q, "UPDATE wedding.guests SET token_hash=$2,invitation_link=$3 WHERE id=$1", id, hash(token), link)
				return map[string]any{"guest": a.guest(ctx, q, id, tenant, text(s["public_id"])), "link": link}
			}
			fail(404, "not_found", "Halaman tidak ditemukan.")
			return nil
		})
		jsonResponse(w, 200, result)
		return
	}
	if path == "/api/admin/content" {
		if method == "GET" {
			jsonResponse(w, 200, a.content(ctx, a.Pool, tenant, true))
			return
		}
		if method == "PUT" {
			_, v := body(w, r, 32768, false)
			validateSettings(v)
			exec(ctx, a.Pool, "UPDATE wedding.settings SET value=value || $1::jsonb WHERE tenant_id=$2", v, tenant)
			jsonResponse(w, 200, a.content(ctx, a.Pool, tenant, true))
			return
		}
	}
	m = regexp.MustCompile(`^/api/admin/media/(groom|bride|gallery[1-9]|music|preview)$`).FindStringSubmatch(path)
	if m != nil && (method == "PUT" || method == "DELETE") {
		slot := m[1]
		if method == "DELETE" {
			exec(ctx, a.Pool, "DELETE FROM wedding.media WHERE slot=$1 AND tenant_id=$2", slot, tenant)
		} else {
			limit := int64(12 * 1024 * 1024)
			if slot == "music" {
				limit = maxAudioBytes
			}
			data, _ := body(w, r, limit, true)
			mime := r.Header.Get("Content-Type")
			if slot == "music" {
				data = processAudio(ctx, data, mime)
				mime = "audio/mpeg"
			} else {
				if mime != "image/jpeg" && mime != "image/png" && mime != "image/webp" {
					fail(415, "media_type", "Gunakan JPG, PNG atau WebP.")
				}
				var err error
				data, mime, err = processImage(data, slot == "preview")
				if err != nil {
					fail(415, "invalid_image", "Foto tidak dapat dibaca. Gunakan JPG, PNG atau WebP yang valid.")
				}
			}
			// shortcut: small media slots live in Postgres; move blobs to object storage for a large gallery.
			exec(ctx, a.Pool, `INSERT INTO wedding.media(slot,id,mime,data,tenant_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(tenant_id,slot) DO UPDATE SET id=EXCLUDED.id,mime=EXCLUDED.mime,data=EXCLUDED.data`, slot, uuid(), mime, data, tenant)
		}
		jsonResponse(w, 200, a.content(ctx, a.Pool, tenant, true))
		return
	}
	fail(404, "not_found", "Halaman tidak ditemukan.")
}
