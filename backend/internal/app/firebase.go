package app

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	firebase "firebase.google.com/go/v4"
	firebaseauth "firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

const termsVersion = "2026-10-28"

func validAccountPassword(password string) bool {
	return length(password) >= 8 && length(password) <= 1024 && match(`[A-Z]`, password) && match(`[0-9]`, password) && match(`[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]`, password)
}

func (a *App) configureFirebase() error {
	if a.Config.FirebaseProjectID == "" {
		if a.Config.FirebaseAPIKey != "" || a.Config.FirebaseCredentialsJSON != "" {
			return errors.New("FIREBASE_PROJECT_ID is required")
		}
		return nil
	}
	if !match(`^[a-z][a-z0-9-]{4,28}[a-z0-9]$`, a.Config.FirebaseProjectID) || a.Config.FirebaseAPIKey == "" {
		return errors.New("Firebase project ID and Web API key are required")
	}
	if emulator := os.Getenv("FIREBASE_AUTH_EMULATOR_HOST"); emulator != "" {
		u, err := url.Parse("http://" + emulator)
		if err != nil || a.Config.Production || u.Path != "" || u.RawQuery != "" || u.Fragment != "" || u.User != nil || (u.Hostname() != "127.0.0.1" && u.Hostname() != "localhost") {
			return errors.New("Firebase Auth emulator is only allowed on local development loopback")
		}
	}
	opts := []option.ClientOption{}
	if a.Config.FirebaseCredentialsJSON != "" {
		var credentials struct {
			ProjectID string `json:"project_id"`
			Type      string `json:"type"`
		}
		if json.Unmarshal([]byte(a.Config.FirebaseCredentialsJSON), &credentials) != nil || credentials.ProjectID != a.Config.FirebaseProjectID || credentials.Type != "service_account" {
			return errors.New("Firebase service account must match FIREBASE_PROJECT_ID")
		}
		opts = append(opts, option.WithCredentialsJSON([]byte(a.Config.FirebaseCredentialsJSON)))
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: a.Config.FirebaseProjectID}, opts...)
	if err != nil {
		return errors.New("Firebase initialization failed; check server credentials")
	}
	a.Auth, err = app.Auth(ctx)
	if err != nil {
		return errors.New("Firebase Authentication initialization failed; check server credentials")
	}
	return nil
}

func (a *App) requireFirebaseEmail() {
	if a.Auth == nil || a.Config.ResendAPIKey == "" {
		fail(503, "auth_unavailable", "Layanan akun sedang disiapkan. Silakan coba lagi nanti.")
	}
}

// Passwords go directly to Firebase over HTTPS; Neon stores only the immutable Firebase UID.
func (a *App) firebasePassword(ctx context.Context, email, password string) *firebaseauth.Token {
	if a.Auth == nil {
		fail(503, "auth_unavailable", "Layanan akun belum tersedia.")
	}
	origin := "https://identitytoolkit.googleapis.com/v1"
	if emulator := os.Getenv("FIREBASE_AUTH_EMULATOR_HOST"); emulator != "" {
		origin = "http://" + emulator + "/identitytoolkit.googleapis.com/v1"
	}
	payload, err := json.Marshal(map[string]any{"email": email, "password": password, "returnSecureToken": true})
	must(err)
	req, err := http.NewRequestWithContext(ctx, "POST", origin+"/accounts:signInWithPassword?key="+url.QueryEscape(a.Config.FirebaseAPIKey), bytes.NewReader(payload))
	must(err)
	req.Header.Set("Content-Type", "application/json")
	res, err := a.Client.Do(req)
	if err != nil {
		fail(503, "auth_unavailable", "Layanan akun belum dapat merespons. Silakan coba lagi.")
	}
	defer res.Body.Close()
	var response struct {
		IDToken string `json:"idToken"`
		Error   struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&response) != nil {
		fail(503, "auth_unavailable", "Layanan akun belum dapat merespons.")
	}
	if res.StatusCode != 200 {
		switch response.Error.Message {
		case "EMAIL_EXISTS":
			fail(409, "email_exists", "Email sudah terdaftar. Silakan masuk ke akun Anda.")
		case "INVALID_LOGIN_CREDENTIALS", "EMAIL_NOT_FOUND", "INVALID_PASSWORD", "USER_DISABLED":
			fail(401, "invalid_login", "Email atau kata sandi tidak sesuai.")
		}
		if strings.HasPrefix(response.Error.Message, "WEAK_PASSWORD") || response.Error.Message == "PASSWORD_DOES_NOT_MEET_REQUIREMENTS" {
			fail(400, "password_policy", "Kata sandi belum memenuhi kebijakan keamanan akun. Gunakan minimal 8 karakter, satu huruf kapital, satu angka, dan satu simbol.")
		}
		fail(503, "auth_unavailable", "Layanan akun belum dapat merespons. Silakan coba lagi.")
	}
	token, err := a.Auth.VerifyIDTokenAndCheckRevoked(ctx, response.IDToken)
	if err != nil || token.UID == "" || token.AuthTime == 0 {
		fail(401, "invalid_login", "Email atau kata sandi tidak sesuai.")
	}
	return token
}

func verificationRequired(s map[string]any) bool {
	return s != nil && s["verification_required"] == true
}
func requireVerified(s map[string]any) {
	if verificationRequired(s) {
		fail(403, "email_verification_required", "Verifikasi email Anda sebelum melanjutkan.")
	}
}

func (a *App) firebaseSession(ctx context.Context, s map[string]any) bool {
	uid := text(s["firebase_uid"])
	if uid == "" {
		return true
	}
	if a.Auth == nil {
		fail(503, "auth_unavailable", "Layanan akun belum tersedia.")
	}
	user, err := a.Auth.GetUser(ctx, uid)
	if err != nil {
		if firebaseauth.IsUserNotFound(err) {
			return false
		}
		fail(503, "auth_unavailable", "Sesi belum dapat diverifikasi. Silakan coba lagi.")
	}
	authTime, _ := s["firebase_auth_time"].(int64)
	if user.Disabled || strings.ToLower(user.Email) != text(s["email"]) || authTime == 0 || authTime*1000 < user.TokensValidAfterMillis {
		return false
	}
	s["verification_required"] = !user.EmailVerified
	return true
}

func (a *App) verificationEmail(ctx context.Context, s map[string]any) error {
	link, err := a.Auth.EmailVerificationLinkWithSettings(ctx, text(s["email"]), &firebaseauth.ActionCodeSettings{URL: a.Config.CMSOrigin + "/#masuk"})
	if err != nil {
		return errors.New("verification link unavailable")
	}
	payload := a.emailPayload(text(s["email"]), "Selamat datang — verifikasi email Anda", "Verifikasi alamat email ini untuk melanjutkan aktivasi undangan Anda. Jika Anda tidak membuat akun Weddinvita, abaikan email ini.", link, "Verifikasi email")
	_, err = a.sendEmail(ctx, payload, "verify-email/"+secret())
	return err
}

func (a *App) resendVerification(w http.ResponseWriter, r *http.Request) {
	s := a.authorized(r, true, true)
	_, v := body(w, r, 1024, false)
	only(v)
	a.limited(w, r, "verification-email", 3, 900)
	a.limitedKey(w, r, "verification-account:"+text(s["account_id"]), 1, 60)
	if text(s["firebase_uid"]) == "" || !verificationRequired(s) {
		jsonResponse(w, 200, map[string]bool{"ok": true})
		return
	}
	a.requireFirebaseEmail()
	if err := a.verificationEmail(r.Context(), s); err != nil {
		fail(503, "email_unavailable", "Email belum dapat dikirim. Silakan coba lagi sebentar.")
	}
	jsonResponse(w, 200, map[string]bool{"ok": true})
}

func (a *App) passwordReset(w http.ResponseWriter, r *http.Request) {
	a.requireFirebaseEmail()
	a.limited(w, r, "password-reset", 5, 900)
	_, v := body(w, r, 1024, false)
	only(v, "email")
	email := strings.ToLower(strings.TrimSpace(text(v["email"])))
	if length(email) > 254 || !match(`^[^\s@]+@[^\s@]+\.[^\s@]+$`, email) {
		fail(400, "email", "Gunakan alamat email yang valid.")
	}
	a.limitedKey(w, r, "password-reset-email:"+email, 2, 900)
	s := row(r.Context(), a.Pool, `SELECT firebase_uid FROM wedding.accounts WHERE email=$1 AND active`, email)
	// No email-only linking: legacy accounts must wait for an explicit identity migration.
	if uid := text(s["firebase_uid"]); uid != "" {
		user, err := a.Auth.GetUser(r.Context(), uid)
		if err == nil && !user.Disabled && strings.ToLower(user.Email) == email {
			link, err := a.Auth.PasswordResetLinkWithSettings(r.Context(), email, &firebaseauth.ActionCodeSettings{URL: a.Config.CMSOrigin + "/#masuk"})
			if err == nil {
				_, err = a.sendEmail(r.Context(), a.emailPayload(email, "Atur ulang kata sandi", "Gunakan tautan ini untuk mengatur ulang kata sandi akun Weddinvita Anda. Jika Anda tidak memintanya, abaikan email ini.", link, "Atur ulang kata sandi"), "password-reset/"+secret())
			}
			if err != nil {
				log.Print("Password reset email could not be delivered; user may retry.")
			}
		}
	}
	// Do not expose an address's existence, provider, delivery status or action link.
	jsonResponse(w, 200, map[string]bool{"ok": true})
}
