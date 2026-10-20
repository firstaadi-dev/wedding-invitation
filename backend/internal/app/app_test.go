package app

import (
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func rejects(t *testing.T, fn func(), status int) {
	t.Helper()
	defer func() {
		e, ok := recover().(apiError)
		if !ok || e.Status != status {
			t.Errorf("expected HTTP %d, got %#v", status, e)
		}
	}()
	fn()
	t.Fatal("expected rejection")
}
func TestPasswordCompatibility(t *testing.T) {
	// Node crypto.scrypt uses N=16384, r=8, p=1 and the ASCII hex salt.
	encoded := "0123456789abcdef0123456789abcdef:2a6389fa6e25b6b6825dbdc48b528f1ea4664b8f414aaaca42c308771a248049d7ae5077d8c02cac2f5956664a51ea802e02f798daa62c6151aded48d87346cc"
	if !passwordMatches("legacy-password", encoded) || passwordMatches("wrong-password", encoded) {
		t.Fatal("legacy scrypt mismatch")
	}
	hash, err := PasswordHash("a-new-password")
	if err != nil || !passwordMatches("a-new-password", hash) {
		t.Fatal("password hash does not round trip")
	}
}
func TestFingerprintRejectsForgedEvents(t *testing.T) {
	now := time.Now()
	base := map[string]any{"event_id": "event", "linked_id": "challenge", "url": "https://invitation.example/", "timestamp": float64(now.UnixMilli()), "identification": map[string]any{"visitor_id": "visitor"}}
	if verifiedVisitor(base, "event", "challenge", "https://invitation.example", now) != "visitor" {
		t.Fatal("valid fixture rejected")
	}
	for key, value := range map[string]any{"event_id": "forged", "linked_id": "other", "url": "https://attacker.example/", "timestamp": float64(now.Add(-301 * time.Second).UnixMilli()), "identification": map[string]any{}, "tampering": true, "replayed": true, "bot": "detected", "rule_action": "deny"} {
		t.Run(key, func(t *testing.T) {
			event := map[string]any{}
			for k, v := range base {
				event[k] = v
			}
			event[key] = value
			rejects(t, func() { verifiedVisitor(event, "event", "challenge", "https://invitation.example", now) }, 403)
		})
	}
	rejects(t, func() {
		event := map[string]any{}
		for k, v := range base {
			event[k] = v
		}
		event["timestamp"] = float64(now.Add(11 * time.Second).UnixMilli())
		verifiedVisitor(event, "event", "challenge", "https://invitation.example", now)
	}, 403)
}
func TestProxyTrust(t *testing.T) {
	for _, tc := range []struct {
		production, trust bool
		forwarded, want   string
	}{{true, true, "198.51.100.1", "198.51.100.1"}, {true, true, "198.51.100.1, 203.0.113.2", "203.0.113.2"}, {true, true, "", "127.0.0.1"}, {true, false, "198.51.100.1", "127.0.0.1"}, {false, true, "198.51.100.1", "127.0.0.1"}} {
		r := httptest.NewRequest("GET", "/", nil)
		r.RemoteAddr = "127.0.0.1:1234"
		r.Header.Set("X-Forwarded-For", tc.forwarded)
		if got := clientIP(r, Config{Production: tc.production, TrustProxy: tc.trust}); got != tc.want {
			t.Errorf("got %s want %s", got, tc.want)
		}
	}
}
func TestValidation(t *testing.T) {
	if validPhone("0812\u00a03456\u20097890") != "6281234567890" {
		t.Fatal("Unicode phone whitespace must match the legacy JS validator")
	}
	if validPhone("0812 3456-7890") != "6281234567890" || validPhone("+1 (202) 555-0101") != "12025550101" {
		t.Fatal("phone normalization")
	}
	for _, phone := range []any{nil, 42, "+", "()", "abc", "123"} {
		rejects(t, func() { validPhone(phone) }, 400)
	}
	for _, url := range []any{nil, "https://attacker.example/maps/embed", "https://www.google.com@attacker.example/maps/embed"} {
		if validMap(url) {
			t.Fatal("unsafe map accepted")
		}
	}
	rejects(t, func() { validateSettings(map[string]any{"whatsappTemplate": "{link} {unknown}"}) }, 400)
	rejects(t, func() { validateSettings(map[string]any{"tenant_id": "other"}) }, 400)
}
func TestBodyBoundaries(t *testing.T) {
	for _, tc := range []struct {
		body, mime string
		status     int
	}{{"[]", "application/json", 400}, {"null", "application/json", 400}, {"{} {}", "application/json", 400}, {"{}", "text/plain", 415}, {strings.Repeat("x", 9000), "application/json", 413}} {
		r := httptest.NewRequest("POST", "/", strings.NewReader(tc.body))
		r.Header.Set("Content-Type", tc.mime)
		rejects(t, func() { body(httptest.NewRecorder(), r, 8192, false) }, tc.status)
	}
}

func TestSeparateDashboardAndInvitationOrigins(t *testing.T) {
	a, err := New(nil, Config{Origin: "https://invitation.example", CMSOrigin: "https://dashboard.example", Production: true})
	if err != nil {
		t.Fatal(err)
	}
	if a.mutationOrigin("/api/admin/login") != "https://dashboard.example" || a.mutationOrigin("/api/response") != "https://invitation.example" || a.mutationOrigin("/api/access/verify") != "https://invitation.example" {
		t.Fatal("unexpected mutation origin")
	}
	if _, err = New(nil, Config{Origin: "https://invitation.example", CMSOrigin: "http://dashboard.example", Production: true}); err == nil {
		t.Fatal("insecure production CMS origin accepted")
	}
}
func TestStoredLinksUseOpaqueInvitationURLWithoutRotatingSecret(t *testing.T) {
	a, err := New(nil, Config{Origin: "https://invitation.example"})
	if err != nil {
		t.Fatal(err)
	}
	id := "d291b953-df84-463b-8319-80aff739c16a"
	token := strings.Repeat("a", 43)
	for _, old := range []string{"https://old.example/i/firsta-talitha#" + token, "https://old.example/#" + token} {
		g := a.guestLink(map[string]any{"link": old}, id)
		if g["link"] != "https://invitation.example/"+id+"#"+token {
			t.Fatal("legacy link was not normalized")
		}
	}
	for _, old := range []any{nil, "https://old.example/i/firsta-talitha", "https://old.example/#bad-token", "%invalid"} {
		if a.guestLink(map[string]any{"link": old}, id)["link"] != nil {
			t.Fatal("unrecoverable link must stay empty")
		}
	}
}
