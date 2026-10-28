package app

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"io"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
)

var emailTemplate = template.Must(template.New("email").Parse(`<!doctype html><html lang="id"><body><h1>Weddinvita</h1><h2>{{.Title}}</h2><p>{{.Message}}</p><p><a href="{{.URL}}">{{.Action}}</a></p><p>Butuh bantuan? Balas email ini atau hubungi support@weddinvita.id.</p><p>Jangan membagikan kata sandi, kode verifikasi, atau tautan pemulihan kepada siapa pun.</p></body></html>`))

func (a *App) emailPayload(to, title, message, link, action string) map[string]any {
	var html bytes.Buffer
	must(emailTemplate.Execute(&html, map[string]string{"Title": title, "Message": message, "URL": link, "Action": action}))
	return map[string]any{"from": a.Config.EmailFrom, "to": []string{to}, "reply_to": a.Config.EmailReplyTo, "subject": title + " — Weddinvita", "html": html.String(), "text": title + "\n\n" + message + "\n\n" + action + ": " + link + "\n\nBantuan: support@weddinvita.id. Jangan membagikan kata sandi atau tautan pemulihan."}
}

func (a *App) sendEmail(ctx context.Context, payload map[string]any, key string) (string, error) {
	if a.Config.ResendAPIKey == "" {
		return "", errors.New("email is not configured")
	}
	b, err := json.Marshal(payload)
	if err != nil {
		return "", errors.New("invalid email payload")
	}
	origin := "https://api.resend.com"
	if a.Config.ResendAPIOrigin != "" {
		origin = a.Config.ResendAPIOrigin
	}
	req, err := http.NewRequestWithContext(ctx, "POST", origin+"/emails", bytes.NewReader(b))
	if err != nil {
		return "", errors.New("invalid email request")
	}
	req.Header.Set("Authorization", "Bearer "+a.Config.ResendAPIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Idempotency-Key", key)
	res, err := a.Client.Do(req)
	if err != nil {
		return "", errors.New("email provider is unavailable")
	}
	defer res.Body.Close()
	var value struct {
		ID string `json:"id"`
	}
	if res.StatusCode != 200 || json.NewDecoder(io.LimitReader(res.Body, 65536)).Decode(&value) != nil || value.ID == "" {
		return "", errors.New("email provider did not accept the message")
	}
	return value.ID, nil
}

func (a *App) queuePaymentEmail(ctx context.Context, q db, payment string, account map[string]any) {
	date := account["paid_until"].(time.Time).In(time.FixedZone("WIB", 7*3600))
	end := eventDateLabel(date.Format("2006-01-02")) + " pukul " + date.Format("15:04") + " WIB"
	payload := a.emailPayload(text(account["email"]), "Pembayaran terkonfirmasi", fmt.Sprintf("Pembayaran Rp199.000 untuk akses 12 bulan telah terkonfirmasi. ID pesanan: %s. Akses aktif sampai %s. Tidak ada tagihan otomatis. Ini adalah konfirmasi pembayaran, bukan faktur pajak.", payment, end), a.Config.CMSOrigin+"/", "Buka dashboard")
	encoded, err := json.Marshal(payload)
	must(err)
	exec(ctx, q, `INSERT INTO wedding.payment_emails(payment_id,payload) VALUES($1,$2::jsonb) ON CONFLICT(payment_id) DO NOTHING`, payment, string(encoded))
}

// DeliverPaymentEmails retries a persisted payment confirmation without affecting activation.
func (a *App) DeliverPaymentEmails(ctx context.Context) error {
	if a.Config.ResendAPIKey == "" {
		return nil
	}
	tx, err := a.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	// shortcut: Resend deduplicates for 24h; review older ambiguous deliveries manually instead of risking a duplicate.
	var id string
	var data []byte
	err = tx.QueryRow(ctx, `SELECT payment_id,payload FROM wedding.payment_emails WHERE sent_at IS NULL AND next_attempt_at<=now() AND created_at>now()-interval '23 hours' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`).Scan(&id, &data)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return err
	}
	var payload map[string]any
	if err = json.Unmarshal(data, &payload); err != nil {
		return err
	}
	provider, sendErr := a.sendEmail(ctx, payload, "payment-confirmed/"+id)
	if sendErr != nil {
		_, err = tx.Exec(ctx, `UPDATE wedding.payment_emails SET attempts=attempts+1,next_attempt_at=now()+interval '1 minute' WHERE payment_id=$1`, id)
	} else {
		_, err = tx.Exec(ctx, `UPDATE wedding.payment_emails SET attempts=attempts+1,sent_at=now(),provider_id=$2 WHERE payment_id=$1`, id, provider)
	}
	if err != nil {
		return err
	}
	if err = tx.Commit(ctx); err != nil {
		return err
	}
	return sendErr
}
