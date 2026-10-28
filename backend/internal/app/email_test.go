package app

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestResendDelivery(t *testing.T) {
	fail := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/emails" || r.Header.Get("Authorization") != "Bearer test-key" || r.Header.Get("Idempotency-Key") != "test-event" {
			t.Error("incorrect Resend request")
		}
		var v map[string]any
		if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
			t.Error(err)
		}
		if v["from"] != "Weddinvita <no-reply@weddinvita.id>" || v["reply_to"] != "support@weddinvita.id" || strings.Contains(text(v["html"]), "<script>unsafe</script>") || !strings.Contains(text(v["text"]), "<script>unsafe</script>") {
			t.Error("email payload is missing sender, text alternative or HTML escaping")
		}
		w.Header().Set("Content-Type", "application/json")
		if fail {
			w.WriteHeader(503)
			_, _ = w.Write([]byte(`{"message":"provider down"}`))
			return
		}
		_, _ = w.Write([]byte(`{"id":"resend-message-id"}`))
	}))
	defer server.Close()
	a, err := New(nil, Config{Origin: "https://invitation.example", ResendAPIKey: "test-key", ResendAPIOrigin: server.URL})
	if err != nil {
		t.Fatal(err)
	}
	payload := a.emailPayload("recipient@example.com", "Judul", "<script>unsafe</script>", "https://dashboard.example/", "Buka dashboard")
	id, err := a.sendEmail(context.Background(), payload, "test-event")
	if err != nil || id != "resend-message-id" {
		t.Fatalf("send: %q %v", id, err)
	}
	fail = true
	if _, err = a.sendEmail(context.Background(), payload, "test-event"); err == nil {
		t.Fatal("provider failure must remain retryable")
	}
}

func TestEmailConfiguration(t *testing.T) {
	for _, c := range []Config{
		{Origin: "https://invitation.example", Production: true, ResendAPIOrigin: "http://127.0.0.1:4900"},
		{Origin: "https://invitation.example", ResendAPIOrigin: "https://other.example"},
		{Origin: "https://invitation.example", EmailFrom: "invalid"},
	} {
		if _, err := New(nil, c); err == nil {
			t.Fatal("unsafe email configuration accepted")
		}
	}
}

func TestAccountPasswordPolicy(t *testing.T) {
	for _, password := range []string{"Abcd12!", "abcd123!", "Abcdefg!", "Abcdef12", "Abcdef12 ", "Abcd12é"} {
		if validAccountPassword(password) {
			t.Errorf("weak password accepted: %q", password)
		}
	}
	for _, password := range []string{"Abcdef1!", "A 12345@", "Wedding2026#"} {
		if !validAccountPassword(password) {
			t.Error("valid password rejected")
		}
	}
}
