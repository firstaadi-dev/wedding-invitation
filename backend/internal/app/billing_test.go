package app

import (
	"strings"
	"testing"
	"time"
)

func TestCheckoutDestination(t *testing.T) {
	for _, raw := range []string{"https://attacker.example/snap/token", "https://app.sandbox.midtrans.com.attacker.example/snap/token", "https://app.sandbox.midtrans.com@attacker.example/snap/token", "http://app.sandbox.midtrans.com/snap/token", "https://app.sandbox.midtrans.com:8443/snap/token", "https://app.midtrans.com/snap/token"} {
		if validCheckoutURL(raw, "sandbox") {
			t.Fatalf("accepted %s", raw)
		}
	}
	if !validCheckoutURL("https://app.sandbox.midtrans.com/snap/v4/redirection/token", "sandbox") {
		t.Fatal("valid sandbox URL rejected")
	}
}
func TestPaymentConfigCannotSendCredentialsToRemoteSimulation(t *testing.T) {
	for _, c := range []Config{
		{Origin: "https://example.com", Production: true, MidtransEnv: "sandbox", MidtransAPIOrigin: "http://127.0.0.1:1234"},
		{Origin: "http://example.com", MidtransEnv: "production", MidtransAPIOrigin: "http://127.0.0.1:1234"},
		{Origin: "http://example.com", MidtransAPIOrigin: "http://attacker.example"},
		{Origin: "http://example.com", MidtransEnv: "invalid"},
	} {
		if _, err := New(nil, c); err == nil {
			t.Fatalf("accepted unsafe config %#v", c)
		}
	}
}
func TestSubscriptionExpiresAndLegacyAccess(t *testing.T) {
	if hasAccess(nil) {
		t.Fatal("missing account access")
	}
	if hasAccess(map[string]any{"billing_required": true}) {
		t.Fatal("unpaid access")
	}
	if hasAccess(map[string]any{"billing_required": true, "paid_until": time.Now().Add(-time.Second)}) {
		t.Fatal("expired access")
	}
	if !hasAccess(map[string]any{"billing_required": true, "paid_until": time.Now().Add(time.Hour)}) {
		t.Fatal("paid denied")
	}
	if !hasAccess(map[string]any{"billing_required": false}) {
		t.Fatal("legacy denied")
	}
	if notificationSignature("a", "200", "199000.00", "key") == notificationSignature("a", "200", "199000.00", "other") || len(notificationSignature("a", "200", "199000.00", "key")) != 128 || strings.Contains(notificationSignature("a", "200", "199000.00", "key"), "key") {
		t.Fatal("bad notification digest")
	}
}
