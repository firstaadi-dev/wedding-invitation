export function photoFrame(slot, narrow = false) {
  if (slot === "groom" || slot === "bride") return {kind: "portrait", ratio: narrow ? 225 / 280 : 246 / 250};
  return slot === "preview" ? {kind: "message", ratio: 1200 / 630} : {kind: "gallery", ratio: 4 / 5};
}

export function cropRectangle(width, height, ratio, zoom, x, y) {
  const aspect = ratio || width / height;
  const cropWidth = Math.min(width, height * aspect) / zoom;
  const cropHeight = cropWidth / aspect;
  return {
    x: (width - cropWidth) * x / 100,
    y: (height - cropHeight) * y / 100,
    width: cropWidth,
    height: cropHeight,
  };
}

export async function cropPhoto(image, rectangle, file) {
  if (rectangle.width === image.naturalWidth && rectangle.height === image.naturalHeight) return file;
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1800 / Math.max(rectangle.width, rectangle.height));
  canvas.width = Math.max(1, Math.round(rectangle.width * scale));
  canvas.height = Math.max(1, Math.round(rectangle.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Crop foto tidak tersedia di browser ini. Coba browser lain.");
  context.drawImage(image, rectangle.x, rectangle.y, rectangle.width, rectangle.height, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve, reject) => canvas.toBlob(
    result => result ? resolve(result) : reject(new Error("Crop foto gagal. Coba pilih ulang foto.")),
    "image/webp", 0.92,
  ));
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-crop.${blob.type === "image/webp" ? "webp" : "png"}`, {type: blob.type});
}
