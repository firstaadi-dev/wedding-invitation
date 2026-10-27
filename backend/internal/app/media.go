package app

import (
	"bytes"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/davidbyttow/govips/v2/vips"
)

func processImage(data []byte, preview bool) ([]byte, string, error) {
	// Check the signature before libvips can select a vector/document loader.
	jpeg := len(data) >= 3 && data[0] == 255 && data[1] == 216 && data[2] == 255
	png := bytes.HasPrefix(data, []byte{137, 80, 78, 71, 13, 10, 26, 10})
	webp := len(data) >= 12 && string(data[:4]) == "RIFF" && string(data[8:12]) == "WEBP"
	if !jpeg && !png && !webp {
		return nil, "", errors.New("unsupported image")
	}
	image, err := vips.LoadImageFromBuffer(data, vips.NewImportParams())
	if err != nil {
		return nil, "", err
	}
	defer image.Close()
	if int64(image.Width())*int64(image.Height()) > 40000000 || image.Pages() > 1 {
		return nil, "", errors.New("image too large or animated")
	}
	if err = image.AutoRotate(); err != nil {
		return nil, "", err
	}
	if preview {
		if err = image.Thumbnail(1200, 630, vips.InterestingCentre); err != nil {
			return nil, "", err
		}
		if image.HasAlpha() {
			if err = image.Flatten(&vips.Color{R: 250, G: 247, B: 242}); err != nil {
				return nil, "", err
			}
		}
		params := vips.NewJpegExportParams()
		params.Quality = 85
		params.StripMetadata = true
		b, _, err := image.ExportJpeg(params)
		return b, "image/jpeg", err
	}
	if err = image.ThumbnailWithSize(1800, 1800, vips.InterestingNone, vips.SizeDown); err != nil {
		return nil, "", err
	}
	params := vips.NewWebpExportParams()
	params.Quality = 82
	params.StripMetadata = true
	b, _, err := image.ExportWebp(params)
	return b, "image/webp", err
}

func (a *App) media(w http.ResponseWriter, r *http.Request) {
	preview := strings.HasPrefix(r.URL.Path, "/preview-image/")
	tenants := []string{}
	if !preview {
		for _, admin := range []bool{false, true} {
			if s := a.session(r, admin); s != nil && hasAccess(s) {
				tenants = append(tenants, text(s["tenant_id"]))
			}
		}
		if len(tenants) == 0 {
			fail(401, "unauthorized", "Silakan buka undangan dahulu.")
		}
	}
	prefix := "/media/"
	if preview {
		prefix = "/preview-image/"
	}
	id := strings.TrimPrefix(r.URL.Path, prefix)
	if !match(`^[a-f0-9-]{36}$`, id) {
		fail(404, "media_not_found", "Media tidak ditemukan.")
	}
	var m map[string]any
	if preview {
		m = row(r.Context(), a.Pool, `SELECT m.mime,m.data FROM wedding.media m JOIN wedding.tenants t ON t.id=m.tenant_id JOIN wedding.accounts a ON a.id=t.owner_id WHERE m.id=$1 AND m.slot='preview' AND a.active AND `+accessSQL, id)
	} else {
		m = row(r.Context(), a.Pool, "SELECT mime,data FROM wedding.media WHERE id=$1 AND tenant_id=ANY($2::uuid[])", id, tenants)
	}
	if m == nil {
		fail(404, "media_not_found", "Media tidak ditemukan.")
	}
	data := m["data"].([]byte)
	size := int64(len(data))
	start, end, status := int64(0), size-1, 200
	if raw := r.Header.Get("Range"); raw != "" {
		parts := regexp.MustCompile(`^bytes=(\d*)-(\d*)$`).FindStringSubmatch(raw)
		if parts == nil || (parts[1] == "" && parts[2] == "") {
			fail(416, "range", "Rentang tidak valid.")
		}
		parse := func(s string) int64 {
			n, err := strconv.ParseInt(s, 10, 64)
			if err != nil {
				fail(416, "range", "Rentang tidak valid.")
			}
			return n
		}
		if parts[1] != "" {
			start = parse(parts[1])
			if parts[2] != "" {
				end = min(end, parse(parts[2]))
			}
		} else {
			start = max(0, size-parse(parts[2]))
		}
		if start > end || start >= size {
			w.Header().Set("Content-Range", fmt.Sprintf("bytes */%d", size))
			fail(416, "range", "Rentang tidak valid.")
		}
		w.Header().Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end, size))
		status = 206
	}
	w.Header().Set("Content-Type", text(m["mime"]))
	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("Content-Length", fmt.Sprint(end-start+1))
	w.WriteHeader(status)
	if r.Method != "HEAD" {
		_, _ = w.Write(data[start : end+1])
	}
}
