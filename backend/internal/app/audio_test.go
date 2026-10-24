package app

import (
	"bytes"
	"context"
	"os"
	"testing"
)

func TestProcessAudioSupportsCommonFormats(t *testing.T) {
	for ext, mime := range map[string]string{
		"mp3": "audio/mpeg", "m4a": "audio/mp4", "aac": "audio/aac",
		"wav": "audio/wav", "ogg": "audio/ogg", "opus": "audio/opus",
		"flac": "audio/flac", "webm": "audio/webm",
	} {
		t.Run(ext, func(t *testing.T) {
			data, err := os.ReadFile("../../../tests/fixtures/silence." + ext)
			if err != nil {
				t.Fatal(err)
			}
			processed := processAudio(context.Background(), data, mime)
			if !validMP3(processed) {
				t.Fatal("processed audio is not a complete MP3")
			}
			if ext == "mp3" && !bytes.Equal(processed, data) {
				t.Fatal("original MP3 changed")
			}
		})
	}
}

func TestProcessAudioRejectsInvalidFiles(t *testing.T) {
	ctx := context.Background()
	for _, mime := range []string{"audio/mpeg", "audio/mp4", "audio/aac", "audio/wav", "audio/ogg", "audio/flac", "audio/webm", "image/png"} {
		t.Run(mime, func(t *testing.T) {
			rejects(t, func() { processAudio(ctx, []byte("not audio"), mime) }, 415)
		})
	}
	rejects(t, func() { processAudio(ctx, make([]byte, maxAudioBytes+1), "audio/wav") }, 413)
	data, err := os.ReadFile("../../../tests/fixtures/silence.wav")
	if err != nil {
		t.Fatal(err)
	}
	rejects(t, func() { processAudio(ctx, data[:len(data)-1], "audio/wav") }, 415)
	canceled, cancel := context.WithCancel(ctx)
	cancel()
	rejects(t, func() { processAudio(canceled, data, "audio/wav") }, 503)
}
