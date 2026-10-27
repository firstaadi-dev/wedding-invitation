package app

import (
	"bytes"
	"image"
	"image/jpeg"
	"image/png"
	"testing"

	"github.com/davidbyttow/govips/v2/vips"
	_ "golang.org/x/image/webp"
)

func TestProcessImageRuntimeCodecs(t *testing.T) {
	vips.Startup(nil)
	defer vips.Shutdown()

	source := image.NewRGBA(image.Rect(0, 0, 32, 24))
	var pngData, jpegData bytes.Buffer
	if err := png.Encode(&pngData, source); err != nil {
		t.Fatal(err)
	}
	if err := jpeg.Encode(&jpegData, source, nil); err != nil {
		t.Fatal(err)
	}
	webpData, _, err := processImage(pngData.Bytes(), false)
	if err != nil {
		t.Fatal(err)
	}
	for name, input := range map[string][]byte{"png": pngData.Bytes(), "jpeg": jpegData.Bytes(), "webp": webpData} {
		t.Run(name, func(t *testing.T) {
			for _, preview := range []bool{false, true} {
				data, mime, err := processImage(input, preview)
				if err != nil {
					t.Fatal(err)
				}
				want := "webp"
				if preview {
					want = "jpeg"
				}
				config, format, err := image.DecodeConfig(bytes.NewReader(data))
				if err != nil || format != want || mime != "image/"+want || config.Width == 0 || config.Height == 0 {
					t.Fatalf("preview=%v: invalid %s output: %s, %+v, %v", preview, want, mime, config, err)
				}
			}
		})
	}
}
