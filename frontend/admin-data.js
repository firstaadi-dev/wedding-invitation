export function guestSummary(guests) {
  const active = guests.filter((guest) => guest.active);
  const attending = active.filter(
    (guest) => guest.response?.attendance === "attending",
  );
  return {
    total: guests.length,
    active: active.length,
    inactive: guests.length - active.length,
    attending: attending.length,
    people: attending.reduce(
      (total, guest) => total + guest.response.guestCount,
      0,
    ),
    pending: active.filter((guest) => !guest.response).length,
    declined: active.filter(
      (guest) => guest.response?.attendance === "not_attending",
    ).length,
    unsure: active.filter((guest) => guest.response?.attendance === "unsure")
      .length,
  };
}
export function findGuests(guests, query) {
  const term = query.trim().toLocaleLowerCase("id");
  return guests.filter((guest) =>
    `${guest.name} ${guest.phone || ""}`.toLocaleLowerCase("id").includes(term),
  );
}
const guestCollator = new Intl.Collator("id", {
  numeric: true,
  sensitivity: "base",
});
export function queryGuests(
  guests,
  {
    query = "",
    status = "all",
    attendance = "all",
    devices = "all",
    sort = "name-asc",
  } = {},
) {
  const labels = {
    attending: "Hadir",
    not_attending: "Tidak hadir",
    unsure: "Belum pasti",
  };
  const direction = sort.endsWith("-desc") ? -1 : 1;
  return findGuests(guests, query)
    .filter(
      (guest) =>
        (status === "all" || Boolean(guest.active) === (status === "active")) &&
        (attendance === "all" ||
          (guest.response?.attendance || "pending") === attendance) &&
        (devices === "all" ||
          guest.deviceCount === (devices === "full" ? 3 : 0)),
    )
    .sort(
      (a, b) =>
        direction *
        guestCollator.compare(
          sort.startsWith("attendance-")
            ? labels[a.response?.attendance] || "Belum konfirmasi"
            : a.name,
          sort.startsWith("attendance-")
            ? labels[b.response?.attendance] || "Belum konfirmasi"
            : b.name,
        ),
    );
}
export function mediaType(file, music = false) {
  if (!file) throw new Error("Pilih berkas terlebih dahulu.");
  const extensions = music
    ? { mp3: "audio/mpeg" }
    : {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
      };
  const type =
    file.type || extensions[file.name.split(".").pop().toLowerCase()];
  if (!Object.values(extensions).includes(type))
    throw new Error(
      music ? "Gunakan berkas MP3." : "Gunakan foto JPG, PNG, atau WebP.",
    );
  if (!file.size) throw new Error("Berkas kosong. Pilih berkas lain.");
  if (file.size > (music ? 25 : 12) * 1024 * 1024)
    throw new Error(`Ukuran berkas maksimal ${music ? 25 : 12} MB.`);
  return type;
}
