package app

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"unicode"
)

const responseSelect = `SELECT attendance,guest_count AS "guestCount",message,updated_at AS "updatedAt" FROM wedding.responses WHERE guest_id=$1`
const guestSelect = `SELECT g.id,g.name,g.phone,g.invitation_link AS link,g.active,(EXTRACT(EPOCH FROM g.created_at)*1000)::float8 AS "createdAt",(SELECT count(*)::integer FROM wedding.devices d WHERE d.guest_id=g.id) AS "deviceCount",CASE WHEN r.guest_id IS NULL THEN NULL ELSE json_build_object('attendance',r.attendance,'guestCount',r.guest_count,'message',r.message,'updatedAt',r.updated_at) END AS response FROM wedding.guests g LEFT JOIN wedding.responses r ON r.guest_id=g.id`

// Keep this copy equal to frontend/whatsapp.js; the compatibility test checks both.
const DefaultWhatsappTemplate = `Yth. {nama},

Dengan bahagia kami mengundang Bapak/Ibu/Sdr/Sdri untuk hadir di pernikahan Firsta & Talitha pada 22 November 2026 di Arjuna Ballroom Alam Indah Resto.

Undangan lengkap:
{link}

Terima kasih atas doa dan kehadirannya.`

func (a *App) content(ctx context.Context, q db, tenant string, admin bool) map[string]any {
	s := row(ctx, q, "SELECT value FROM wedding.settings WHERE tenant_id=$1", tenant)
	settings := map[string]any{}
	if s != nil {
		settings = s["value"].(map[string]any)
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
func (a *App) invitationLink(publicID, token string) string {
	return a.Config.Origin + "/" + publicID + "#" + token
}
func (a *App) guestLink(g map[string]any, publicID string) map[string]any {
	if g == nil {
		return nil
	}
	link, err := url.Parse(text(g["link"]))
	g["link"] = nil
	if err == nil && match(`^[A-Za-z0-9_-]{43}$`, link.Fragment) {
		g["link"] = a.invitationLink(publicID, link.Fragment)
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
	only(v, "ceremonyTitle", "receptionTitle", "ceremonyTime", "receptionTime", "countdownTime", "mapEmbedUrl", "whatsappTemplate", "linkPreviewTitle", "linkPreviewDescription")
	if raw, exists := v["whatsappTemplate"]; exists {
		s, ok := raw.(string)
		unknown := regexp.MustCompile(`\{(?:nama|link)\}`).ReplaceAllString(s, "")
		if !ok || strings.TrimSpace(s) == "" || length(s) > 4000 || !strings.Contains(s, "{link}") || match(`\{([^{}]+)\}`, unknown) {
			fail(400, "whatsapp_template", "Pesan maksimal 4000 karakter, wajib memuat {link}, dan hanya mendukung {nama} serta {link}.")
		}
	}
	for key, max := range map[string]int{"linkPreviewTitle": 120, "linkPreviewDescription": 300} {
		if raw, exists := v[key]; exists {
			s, ok := raw.(string)
			if !ok || length(s) > max {
				fail(400, "link_preview", fmt.Sprintf("Teks preview maksimal %d karakter.", max))
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
	for _, key := range []string{"ceremonyTitle", "receptionTitle"} {
		if raw, exists := v[key]; exists {
			s, ok := raw.(string)
			if !ok || length(s) > 80 {
				fail(400, "event_title", "Nama acara maksimal 80 karakter.")
			}
			v[key] = strings.TrimSpace(s)
		}
	}
	if raw, exists := v["countdownTime"]; exists {
		s, ok := raw.(string)
		if !ok || !match(`^(?:|(?:[01]\d|2[0-3]):[0-5]\d)$`, s) {
			fail(400, "countdown_time", "Jam countdown tidak valid. Gunakan HH:mm dalam WIB.")
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
		jsonResponse(w, 200, map[string]any{"csrf": s["csrf"], "account": a.account(s)})
		return
	}
	if path == "/api/admin/logout" && method == "POST" {
		exec(ctx, a.Pool, "DELETE FROM wedding.sessions WHERE token_hash=$1", s["token_hash"])
		a.cookie(w, "wedding_admin", "", 0)
		jsonResponse(w, 200, map[string]bool{"ok": true})
		return
	}
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
			id, token := uuid(), secret()
			link := a.invitationLink(text(s["public_id"]), token)
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
				only(v, "name", "phone", "active")
				if len(v) == 0 {
					fail(400, "invalid_field", "Isi nama, nomor telepon atau status.")
				}
				if value, ok := v["name"]; ok {
					exec(ctx, q, "UPDATE wedding.guests SET name=$2 WHERE id=$1", id, validName(value))
				}
				if value, ok := v["phone"]; ok {
					exec(ctx, q, "UPDATE wedding.guests SET phone=$2 WHERE id=$1", id, validPhone(value))
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
				token := secret()
				revoke(ctx, q, id, true)
				link := a.invitationLink(text(s["public_id"]), token)
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
				limit = 25 * 1024 * 1024
			}
			data, _ := body(w, r, limit, true)
			mime := r.Header.Get("Content-Type")
			if slot == "music" {
				if mime != "audio/mpeg" || !validMP3(data) {
					fail(415, "media_type", "Unggah lagu dalam format MP3.")
				}
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
