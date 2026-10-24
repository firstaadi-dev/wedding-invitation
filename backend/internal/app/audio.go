package app

import (
	"context"
	"errors"
	"os"
	osExec "os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const maxAudioBytes = 25 * 1024 * 1024

func processAudio(ctx context.Context, data []byte, mime string) []byte {
	if len(data) > maxAudioBytes {
		fail(413, "body_too_large", "Audio maksimal 25 MB.")
	}
	invalid := func() {
		fail(415, "media_type", "Audio tidak dapat dibaca. Gunakan MP3, M4A, AAC, WAV, OGG/Opus, FLAC, atau WebM audio yang valid.")
	}
	switch strings.ToLower(strings.TrimSpace(strings.Split(mime, ";")[0])) {
	case "audio/mpeg", "audio/mp3", "audio/x-mp3":
		if !validMP3(data) {
			invalid()
		}
		return data
	case "audio/mp4", "audio/x-m4a", "audio/aac", "audio/x-aac", "audio/wav", "audio/x-wav", "audio/wave", "audio/ogg", "audio/opus", "audio/flac", "audio/x-flac", "audio/webm":
	default:
		invalid()
	}
	dir, err := os.MkdirTemp("", "invitation-audio-")
	must(err)
	defer os.RemoveAll(dir)
	input, output := filepath.Join(dir, "input"), filepath.Join(dir, "audio.mp3")
	must(os.WriteFile(input, data, 0600))
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	// Bound decoding work and forbid playlists or network protocols in uploaded files.
	cmd := osExec.CommandContext(ctx, "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-xerror",
		"-protocol_whitelist", "file", "-format_whitelist", "mp3,mov,mp4,m4a,3gp,3g2,mj2,aac,wav,ogg,flac,matroska,webm",
		"-threads", "1", "-err_detect", "explode", "-i", input, "-map", "0:a:0", "-vn", "-sn", "-dn",
		"-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "128k", "-ar", "44100", "-ac", "2", "-threads", "1",
		"-fs", strconv.Itoa(maxAudioBytes+1), output)
	if err = cmd.Run(); err != nil {
		if errors.Is(err, osExec.ErrNotFound) {
			must(err)
		}
		if ctx.Err() != nil {
			fail(503, "audio_processing", "Pemrosesan audio belum selesai. Coba lagi dengan lagu yang lebih pendek.")
		}
		invalid()
	}
	data, err = os.ReadFile(output)
	must(err)
	if len(data) > maxAudioBytes {
		fail(413, "body_too_large", "Hasil pemrosesan audio melebihi 25 MB. Gunakan lagu yang lebih pendek.")
	}
	if !validMP3(data) {
		invalid()
	}
	return data
}
