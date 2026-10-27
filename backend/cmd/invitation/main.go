package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/davidbyttow/govips/v2/vips"
	"wedding-invitation/backend/internal/app"
)

func env(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return fallback
}
func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	command := "serve"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}
	switch command {
	case "rotate-links":
		flags := flag.NewFlagSet("rotate-links", flag.ContinueOnError)
		apply := flags.Bool("apply", false, "Replace legacy links across all accounts and revoke guest sessions/devices")
		if err := flags.Parse(os.Args[2:]); err != nil {
			return err
		}
		if flags.NArg() != 0 {
			return fmt.Errorf("rotate-links accepts only --apply; default is dry-run")
		}
		pool, err := app.Database(ctx, os.Getenv("DATABASE_URL_UNPOOLED"))
		if err != nil {
			return err
		}
		defer pool.Close()
		counts, err := app.RotateLegacyLinks(ctx, pool, os.Getenv("PUBLIC_ORIGIN"), *apply)
		if err != nil {
			return err
		}
		return json.NewEncoder(os.Stdout).Encode(map[string]any{"applied": *apply, "tenants": counts})
	case "health":
		client := &http.Client{Timeout: 15 * time.Second}
		res, err := client.Get("http://127.0.0.1:" + env("PORT", "5174") + "/healthz")
		if err != nil {
			return err
		}
		defer res.Body.Close()
		if res.StatusCode != 200 {
			return fmt.Errorf("unhealthy: %d", res.StatusCode)
		}
		return nil
	case "hash":
		data, err := io.ReadAll(io.LimitReader(os.Stdin, 16384))
		if err != nil {
			return err
		}
		encoded, err := app.PasswordHash(strings.TrimRight(string(data), " \r\n\t"))
		if err != nil {
			return err
		}
		fmt.Println(encoded)
		return nil
	case "migrate":
		if err := app.Migrate(ctx, os.Getenv("DATABASE_URL_UNPOOLED"), env("DB_SCHEMA", "wedding"), os.Getenv("ADMIN_PASSWORD_HASH")); err != nil {
			return err
		}
		fmt.Println("Migration applied: tenant schema and account migrations.")
		return nil
	case "provision":
		var v app.AccountMigration
		decoder := json.NewDecoder(io.LimitReader(os.Stdin, 8192))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&v); err != nil {
			return err
		}
		pool, err := app.Database(ctx, os.Getenv("DATABASE_URL_UNPOOLED"))
		if err != nil {
			return err
		}
		defer pool.Close()
		tx, err := pool.Begin(ctx)
		if err != nil {
			return err
		}
		defer tx.Rollback(ctx)
		if _, err = tx.Exec(ctx, "SET LOCAL search_path TO wedding"); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext('wedding:migrations'))"); err != nil {
			return err
		}
		if err = app.ProvisionAccount(ctx, tx, v, os.Getenv("PROVISION_PASSWORD_HASH")); err != nil {
			return err
		}
		return tx.Commit(ctx)
	case "serve":
	default:
		return fmt.Errorf("unknown command: %s", command)
	}
	vips.Startup(&vips.Config{ConcurrencyLevel: 2, MaxCacheSize: 0})
	defer vips.Shutdown()
	pool, err := app.Database(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		return err
	}
	defer pool.Close()
	var n int
	if err = pool.QueryRow(ctx, "SELECT count(*) FROM wedding.tenants").Scan(&n); err != nil {
		return err
	}
	port := env("PORT", "5174")
	a, err := app.New(pool, app.Config{MidtransServerKey: os.Getenv("MIDTRANS_SERVER_KEY"), MidtransEnv: env("MIDTRANS_ENV", "sandbox"), MidtransAPIOrigin: os.Getenv("MIDTRANS_API_ORIGIN"), CMSOrigin: os.Getenv("CMS_ORIGIN"), Origin: env("PUBLIC_ORIGIN", "http://127.0.0.1:"+port), Production: os.Getenv("NODE_ENV") == "production", TrustProxy: os.Getenv("TRUST_PROXY") == "1", PublicKey: os.Getenv("FINGERPRINT_PUBLIC_KEY"), SecretKey: os.Getenv("FINGERPRINT_SECRET_KEY"), Region: env("FINGERPRINT_REGION", "ap"), Endpoint: os.Getenv("FINGERPRINT_ENDPOINT"), Templates: env("TEMPLATE_DIR", "frontend/dist"), FingerprintOrigin: os.Getenv("FINGERPRINT_API_ORIGIN")})
	if err != nil {
		return err
	}
	if err = app.ReadTemplates(a.Config.Templates); err != nil {
		return err
	}
	listener, err := net.Listen("tcp", env("LISTEN_HOST", "127.0.0.1")+":"+port)
	if err != nil {
		return err
	}
	server := &http.Server{Handler: a.Handler(), ReadHeaderTimeout: 10 * time.Second, ReadTimeout: 30 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 16384}
	done := make(chan error, 1)
	go func() { done <- server.Serve(listener) }()
	log.Printf("Invitation server ready on %s; Postgres connected.", listener.Addr())
	ticker := time.NewTicker(time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			return server.Shutdown(shutdown)
		case err := <-done:
			if err != http.ErrServerClosed {
				return err
			}
			return nil
		case <-ticker.C:
			if _, err = pool.Exec(ctx, `DELETE FROM wedding.sessions WHERE expires_at<now(); DELETE FROM wedding.challenges WHERE expires_at<now(); DELETE FROM wedding.rate_limits WHERE expires_at<now(); DELETE FROM wedding.used_events WHERE created_at<now()-interval '1 day'`); err != nil {
				log.Print("Session cleanup failed.")
			}
		}
	}
}
func main() {
	if err := run(); err != nil {
		log.Printf("%s", err)
		os.Exit(1)
	}
}
