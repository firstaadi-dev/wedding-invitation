package app

import "bytes"

// validMP3 accepts complete MPEG Layer III streams with at least two frames.
// Consecutive ID3v2 metadata tags may precede the stream and ID3v1 may follow it.
func validMP3(data []byte) bool {
	start, end := 0, len(data)
	for bytes.HasPrefix(data[start:], []byte("ID3")) {
		tag := data[start:]
		if len(tag) < 10 || tag[3] < 2 || tag[3] > 4 || tag[4] == 0xff || tag[6] > 127 || tag[7] > 127 || tag[8] > 127 || tag[9] > 127 {
			return false
		}
		tagSize := int(tag[6])<<21 | int(tag[7])<<14 | int(tag[8])<<7 | int(tag[9])
		start += 10 + tagSize
		if start > len(data) {
			return false
		}
	}
	if end-start >= 128 && bytes.Equal(data[end-128:end-125], []byte("TAG")) {
		end -= 128
	}
	frames := 0
	for start < end {
		if end-start < 4 {
			return false
		}
		frameSize, ok := mp3FrameSize(data[start : start+4])
		if !ok || frameSize > end-start {
			return false
		}
		start += frameSize
		frames++
	}
	return start == end && frames >= 2
}

func mp3FrameSize(header []byte) (int, bool) {
	if len(header) < 4 || header[0] != 0xff || header[1]&0xe0 != 0xe0 {
		return 0, false
	}
	version := (header[1] >> 3) & 0x03
	layer := (header[1] >> 1) & 0x03
	bitrateIndex := (header[2] >> 4) & 0x0f
	sampleIndex := (header[2] >> 2) & 0x03
	if version == 1 || layer != 1 || bitrateIndex == 0 || bitrateIndex == 15 || sampleIndex == 3 {
		return 0, false
	}
	var bitrates []int
	if version == 3 {
		bitrates = []int{0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320}
	} else {
		bitrates = []int{0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160}
	}
	sampleRates := [3]int{44100, 48000, 32000}
	sampleRate := sampleRates[sampleIndex]
	if version == 2 {
		sampleRate /= 2
	} else if version == 0 {
		sampleRate /= 4
	}
	coefficient := 72000
	if version == 3 {
		coefficient = 144000
	}
	padding := int((header[2] >> 1) & 1)
	return coefficient*bitrates[bitrateIndex]/sampleRate + padding, true
}
