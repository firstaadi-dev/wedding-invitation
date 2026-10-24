package app

import (
	"bytes"
	"os"
	"testing"
)

func TestValidMP3RequiresCompleteFrames(t *testing.T) {
	fixture, err := os.ReadFile("../../../tests/fixtures/silence.mp3")
	if err != nil {
		t.Fatal(err)
	}
	if !validMP3(fixture) {
		t.Fatal("valid MPEG-1 fixture rejected")
	}
	if validMP3(fixture[:len(fixture)-1]) {
		t.Fatal("truncated final frame accepted")
	}
	if validMP3(fixture[:417]) {
		t.Fatal("single frame accepted")
	}
	if validMP3([]byte{0xff, 0xfb, 0x90, 0, 0}) {
		t.Fatal("bare frame header accepted")
	}
	if validMP3(append([]byte{0xff, 0xfb, 0x90, 0}, make([]byte, 800)...)) {
		t.Fatal("truncated frames accepted")
	}
	if validMP3(append(append([]byte{}, fixture...), []byte("junk")...)) {
		t.Fatal("trailing junk accepted")
	}
}

func TestValidMP3SupportsMPEG2AndID3Metadata(t *testing.T) {
	header := []byte{0xff, 0xf3, 0x80, 0} // MPEG-2 Layer III, 64 kbps, 22050 Hz: 208 bytes.
	frame := make([]byte, 208)
	copy(frame, header)
	stream := append(append([]byte{}, frame...), frame...)
	if !validMP3(stream) {
		t.Fatal("valid MPEG-2 stream rejected")
	}
	tag := []byte{'I', 'D', '3', 4, 0, 0, 0, 0, 0, 4, 't', 'e', 's', 't'}
	withID3 := append(append(tag, stream...), make([]byte, 128)...)
	copy(withID3[len(withID3)-128:], []byte("TAG"))
	if !validMP3(withID3) {
		t.Fatal("valid ID3v2 and ID3v1 tags rejected")
	}
	invalidTag := bytes.Clone(tag)
	invalidTag[9] = 128
	if validMP3(append(invalidTag, stream...)) {
		t.Fatal("invalid ID3 size encoding accepted")
	}
}

func TestValidMP3SupportsConsecutiveID3Tags(t *testing.T) {
	fixture, err := os.ReadFile("../../../tests/fixtures/silence-id3.mp3")
	if err != nil {
		t.Fatal(err)
	}
	if !validMP3(fixture) {
		t.Fatal("MP3 with consecutive ID3v2 tags rejected")
	}
	for name, data := range map[string][]byte{
		"truncated audio":         fixture[:len(fixture)-1],
		"truncated second tag":    fixture[:19],
		"metadata without audio":  fixture[:20],
		"invalid second tag size": append(append(bytes.Clone(fixture[:19]), 128), fixture[20:]...),
	} {
		t.Run(name, func(t *testing.T) {
			if validMP3(data) {
				t.Fatal("invalid MP3 accepted")
			}
		})
	}
}
