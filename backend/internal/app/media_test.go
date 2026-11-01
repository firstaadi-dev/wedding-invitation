package app

import (
	"bytes"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	"image/png"
	"testing"

	"github.com/davidbyttow/govips/v2/vips"
)

func TestProcessImagePreview(t *testing.T) {
	vips.Startup(nil)
	defer vips.Shutdown()

	rgb := image.NewRGBA(image.Rect(0, 0, 32, 24))
	draw.Draw(rgb, rgb.Bounds(), image.NewUniform(color.RGBA{R: 40, G: 80, B: 120, A: 255}), image.Point{}, draw.Src)
	for _, tc := range []struct {
		name       string
		source     image.Image
		jpeg       bool
		background bool
	}{
		{name: "rgb-png", source: rgb},
		{name: "rgb-jpeg", source: rgb, jpeg: true},
		{name: "grayscale-png", source: image.NewGray(rgb.Bounds())},
		{name: "transparent-png", source: image.NewNRGBA(rgb.Bounds()), background: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var input bytes.Buffer
			var err error
			if tc.jpeg {
				err = jpeg.Encode(&input, tc.source, nil)
			} else {
				err = png.Encode(&input, tc.source)
			}
			if err != nil {
				t.Fatal(err)
			}
			data, mime, err := processImage(input.Bytes(), true)
			if err != nil {
				t.Fatal(err)
			}
			output, err := jpeg.Decode(bytes.NewReader(data))
			if err != nil {
				t.Fatal(err)
			}
			if mime != "image/jpeg" || output.Bounds().Dx() != 1200 || output.Bounds().Dy() != 630 {
				t.Fatalf("unexpected preview: %s %v", mime, output.Bounds())
			}
			if tc.background {
				got := color.NRGBAModel.Convert(output.At(600, 315)).(color.NRGBA)
				for i, channel := range []uint8{got.R, got.G, got.B} {
					if delta := int(channel) - []int{250, 247, 242}[i]; delta < -3 || delta > 3 {
						t.Fatalf("unexpected background: %v", got)
					}
				}
			}
		})
	}
}
