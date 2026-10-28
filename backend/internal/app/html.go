package app

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

func escapeHTML(s string) string {
	return strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", "\"", "&quot;", "'", "&#39;").Replace(s)
}
func firstWord(value, fallback string) string {
	words := strings.Fields(value)
	if len(words) == 0 {
		return fallback
	}
	return words[0]
}
func renderEventTemplate(template, eventDate string, settings map[string]any) string {
	return strings.NewReplacer("{{EVENT_DATE}}", escapeHTML(eventDateLabel(eventDate)),
		"{{PARTNER_ONE}}", escapeHTML(firstWord(text(settings["partnerOneName"]), "Mempelai Pertama")),
		"{{PARTNER_TWO}}", escapeHTML(firstWord(text(settings["partnerTwoName"]), "Mempelai Kedua"))).Replace(template)
}
func eventDateLabel(value string) string {
	date, err := time.Parse("2006-01-02", value)
	if err != nil {
		date, _ = time.Parse("2006-01-02", "2026-11-22")
	}
	months := [...]string{"Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}
	weekdays := [...]string{"Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"}
	return fmt.Sprintf("%s, %d %s %d", weekdays[date.Weekday()], date.Day(), months[date.Month()-1], date.Year())
}
func (a *App) html(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	filename, tenant := "", ""
	legacy := regexp.MustCompile(`^/i/([a-z0-9]+(?:-[a-z0-9]+)*)$`).FindStringSubmatch(path)
	if legacy != nil {
		t := row(r.Context(), a.Pool, "SELECT public_id::text AS public_id FROM wedding.tenants WHERE slug=$1", legacy[1])
		if t == nil {
			fail(404, "not_found", "Undangan tidak ditemukan.")
		}
		target := "/" + text(t["public_id"])
		if r.URL.RawQuery != "" {
			target += "?" + r.URL.RawQuery
		}
		http.Redirect(w, r, target, http.StatusFound)
		return
	}
	landing := regexp.MustCompile(`^/([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$`).FindStringSubmatch(path)
	coded := strings.HasPrefix(path, "/u/")
	if coded {
		w.Header().Set("X-Robots-Tag", "noindex, nofollow")
		if !match(`^/u/[A-Za-z0-9_-]{27}$`, path) {
			fail(404, "invalid_link", "Tautan undangan tidak ditemukan atau sudah dinonaktifkan.")
		}
		a.limited(w, r, "link", 120, 60)
		g := row(r.Context(), a.Pool, `SELECT g.tenant_id::text AS tenant_id FROM wedding.guests g JOIN wedding.tenants t ON t.id=g.tenant_id JOIN wedding.accounts a ON a.id=t.owner_id WHERE g.token_hash=$1 AND g.active=1 AND a.active AND `+accessSQL, hash(path[3:]))
		if g == nil {
			fail(404, "invalid_link", "Tautan undangan tidak ditemukan atau sudah dinonaktifkan.")
		}
		tenant, filename = text(g["tenant_id"]), "access.html"
	} else if landing != nil {
		t := row(r.Context(), a.Pool, "SELECT id::text AS id FROM wedding.tenants WHERE public_id=$1::uuid AND EXISTS(SELECT 1 FROM wedding.accounts a WHERE a.id=owner_id AND a.active AND "+accessSQL+")", landing[1])
		if t == nil {
			fail(404, "not_found", "Undangan tidak ditemukan.")
		}
		tenant = text(t["id"])
		s := a.session(r, false)
		if s == nil {
			s = a.session(r, true)
		}
		filename = "access.html"
		if !r.URL.Query().Has("access") && s != nil && hasAccess(s) && s["tenant_id"] == tenant {
			filename = "index.html"
		}
	} else if path == "/" || path == "/index.html" {
		s := a.session(r, false)
		if s == nil {
			s = a.session(r, true)
		}
		filename = "access.html"
		if s != nil && hasAccess(s) {
			tenant = text(s["tenant_id"])
			if !r.URL.Query().Has("access") {
				filename = "index.html"
			}
		}
	} else if path == "/preview" {
		if s := a.session(r, true); s != nil && hasAccess(s) {
			filename = "index.html"
			tenant = text(s["tenant_id"])
		}
	}
	if filename == "" {
		fail(404, "not_found", "Halaman tidak ditemukan.")
	}
	file, err := os.ReadFile(filepath.Join(a.Config.Templates, filename))
	must(err)
	if tenant == "" {
		tenant = text(row(r.Context(), a.Pool, "SELECT id::text AS id FROM wedding.tenants WHERE slug='firsta-talitha'")["id"])
		if tenant == "" {
			fail(404, "not_found", "Undangan tidak ditemukan.")
		}
	}
	s := row(r.Context(), a.Pool, `SELECT s.value,a.billing_required,m.id AS "previewId",t.public_id::text AS public_id FROM wedding.settings s JOIN wedding.tenants t ON t.id=s.tenant_id JOIN wedding.accounts a ON a.id=t.owner_id LEFT JOIN wedding.media m ON m.tenant_id=s.tenant_id AND m.slot='preview' WHERE s.tenant_id=$1`, tenant)
	if s == nil {
		fail(404, "not_found", "Undangan tidak ditemukan.")
	}
	settings := s["value"].(map[string]any)
	if s["billing_required"] == true {
		selfServiceDefaults(settings)
	}
	eventDate, venue := text(settings["eventDate"]), strings.TrimSpace(text(settings["venueName"]))
	if eventDate == "" {
		eventDate = "2026-11-22"
	}
	if venue == "" {
		venue = "Arjuna Ballroom, Alam Indah Resto"
	}
	title, description := text(settings["linkPreviewTitle"]), text(settings["linkPreviewDescription"])
	if title == "" {
		title = "Undangan Pernikahan " + firstWord(text(settings["partnerOneName"]), "Mempelai Pertama") + " & " + firstWord(text(settings["partnerTwoName"]), "Mempelai Kedua")
	}
	if description == "" {
		description = eventDateLabel(eventDate) + " · " + venue + "."
	}
	title, description = escapeHTML(title), escapeHTML(description)
	metadata := fmt.Sprintf(`<title>%s</title>
<meta name="description" content="%s">
<meta property="og:title" content="%s">
<meta property="og:description" content="%s">
<meta property="og:type" content="website">
<meta property="og:url" content="%s/%s">`, title, description, title, description, escapeHTML(a.Config.Origin), text(s["public_id"]))
	if coded {
		metadata += fmt.Sprintf(`
<meta name="invitation-path" content="/%s">`, text(s["public_id"]))
	}
	if id := text(s["previewId"]); id != "" {
		metadata += fmt.Sprintf(`
<meta property="og:image" content="%s/preview-image/%s">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="%s">`, escapeHTML(a.Config.Origin), id, title)
	}
	html := renderEventTemplate(string(file), eventDate, settings)
	result := regexp.MustCompile(`<title>.*?</title>`).ReplaceAllStringFunc(html, func(string) string { return metadata })
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Content-Length", fmt.Sprint(len(result)))
	w.WriteHeader(200)
	if r.Method != "HEAD" {
		_, _ = w.Write([]byte(result))
	}
}
