import { createRoot } from "react-dom/client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  defaultWhatsappTemplate,
  invitationMessage,
  whatsappUrl,
} from "../whatsapp.js";
import { guestSummary, findGuests, mediaType } from "../admin-data.js";
import type { Account, Session, Guest, Content, API, Confirm } from "./types";
import "../admin.css";

const pages = {
  tamu: "Tamu Undangan",
  pesan: "Pesan & Preview",
  media: "Foto & Lagu",
  acara: "Detail Acara",
};
type Page = keyof typeof pages;
const currentPage = (): Page =>
  Object.hasOwn(pages, location.hash.slice(1))
    ? (location.hash.slice(1) as Page)
    : "tamu";
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Perubahan belum berhasil.";
const NavIcon = ({ index }: { index: number }) =>
  [
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3" />
    </svg>,
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 6 9 7 9-7" />
    </svg>,
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8" cy="8" r="1.5" />
      <path d="m3 17 5-5 4 4 4-6 5 7" />
    </svg>,
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 2v6m8-6v6m-9 7h3v3H7z" />
    </svg>,
  ][index];
const Brand = () => (
  <a className="brand" href="/">
    weddinvita<span aria-hidden="true">•</span>
  </a>
);
function Navigation({
  page,
  close = () => {},
}: {
  page: Page;
  close?: () => void;
}) {
  return (
    <nav className="page-nav" aria-label="Halaman pengelolaan">
      {Object.entries(pages).map(([key, title], i) => (
        <a
          key={key}
          href={`#${key}`}
          aria-current={key === page ? "page" : undefined}
          onClick={close}
        >
          <span aria-hidden="true">
            <NavIcon index={i} />
          </span>
          {title}
        </a>
      ))}
    </nav>
  );
}
function Modal({
  children,
  onClose,
  className = "",
  label,
  description,
  busy = false,
}: {
  children: ReactNode;
  onClose: () => void;
  className?: string;
  label: string;
  description?: string;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    dialog.querySelector("input")?.focus();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      id={className === "navigation-dialog" ? "navigation" : undefined}
      ref={ref}
      className={className}
      aria-labelledby={label}
      aria-describedby={description}
      onClose={onClose}
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
    >
      {children}
    </dialog>
  );
}
function Login({
  api,
  onLogin,
}: {
  api: API;
  onLogin: (s: Session) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      const s = await api<Session>(
        "/api/admin/login",
        "POST",
        Object.fromEntries(new FormData(form)),
      );
      form.reset();
      await onLogin(s);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      id="login-screen"
      className="login-screen"
      aria-labelledby="login-title"
    >
      <div className="login-story">
        <Brand />
        <div>
          <p className="eyebrow">Setiap undangan, sebuah cerita</p>
          <h2>
            Hari Istimewa.
            <br />
            Lebih Tertata.
          </h2>
          <p>
            Satu ruang untuk merangkai undangan dan menyambut orang-orang
            tersayang.
          </p>
          <div className="event-signature">weddinvita</div>
        </div>
        <p className="story-footer">Dibuat untuk momen yang berarti.</p>
      </div>
      <div className="login-content">
        <div className="mobile-brand">
          <Brand />
        </div>
        <form id="login" className="login-panel" onSubmit={submit}>
          <p className="eyebrow">CMS pengelola undangan</p>
          <h1 id="login-title">Selamat Datang Kembali.</h1>
          <p>Masuk untuk mengelola undangan Anda.</p>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              placeholder="nama@email.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={1024}
              placeholder="Masukkan password"
            />
          </label>
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Memeriksa…" : "Masuk ke dasbor →"}
          </button>
          {error && (
            <p id="login-error" className="form-error" role="alert">
              {error}
            </p>
          )}
          <p className="login-help">Akses khusus pengelola undangan.</p>
        </form>
        <p className="login-footer">weddinvita</p>
      </div>
    </section>
  );
}
function GuestEditor({
  guest,
  api,
  onSaved,
  onClose,
}: {
  guest: Guest | null;
  api: API;
  onSaved: (result: { link?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      const result = await api<{ link?: string }>(
        guest ? `/api/admin/guests/${guest.id}` : "/api/admin/guests",
        guest ? "PATCH" : "POST",
        values,
      );
      await onSaved(result);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      className="editor-dialog"
      label="guest-editor-title"
      onClose={onClose}
      busy={busy}
    >
      <form id="guest-form" onSubmit={submit}>
        <div className="section-heading">
          <h2 id="guest-editor-title">{guest ? "Edit Tamu" : "Tambah Tamu"}</h2>
          <button
            type="button"
            aria-label="Tutup formulir tamu"
            onClick={onClose}
            disabled={busy}
          >
            ×
          </button>
        </div>
        <p>
          Setiap undangan memiliki tautan pribadi dan tiga slot
          browser/perangkat.
        </p>
        <label>
          Nama tamu
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={guest?.name || ""}
            placeholder="Bapak/Ibu atau keluarga"
            autoComplete="off"
            autoFocus
            disabled={busy}
          />
        </label>
        <label>
          Nomor WhatsApp <span className="muted">(opsional)</span>
          <input
            name="phone"
            type="tel"
            maxLength={40}
            defaultValue={guest?.phone || ""}
            placeholder="0812… atau +62812…"
            autoComplete="off"
            aria-describedby="phone-help"
            disabled={busy}
          />
        </label>
        <p id="phone-help" className="help">
          Nomor 08… otomatis diubah ke 62…. Nomor internasional dapat memakai
          +kode negara.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" onClick={onClose} disabled={busy}>
            Batal
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Menyimpan…" : guest ? "Simpan perubahan" : "Tambah Tamu"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function GuestRow({
  guest,
  template,
  api,
  refresh,
  confirm,
  edit,
  copy,
  showLink,
  notice,
}: {
  guest: Guest;
  template: string;
  api: API;
  refresh: () => Promise<void>;
  confirm: Confirm;
  edit: () => void;
  copy: (s: string) => Promise<void>;
  showLink: (s: string) => void;
  notice: (s: string, error?: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const menu = useRef<HTMLDetailsElement>(null);
  async function action(kind: "active" | "link" | "devices" | "delete") {
    menu.current?.removeAttribute("open");
    setBusy(true);
    const descriptions = {
      active: [
        `Undangan ${guest.name} tidak bisa dibuka, seluruh sesi dicabut, dan ucapannya disembunyikan. Data tetap tersimpan dan tamu bisa diaktifkan kembali.`,
        "Nonaktifkan Undangan?",
      ],
      link: [
        `Tautan lama ${guest.name}, seluruh sesi, dan slot perangkat akan dicabut. Kirim tautan pengganti kepada tamu.`,
        "Ganti Tautan Undangan?",
      ],
      devices: [
        `Seluruh sesi ${guest.name} akan dicabut dan ketiga slot dikosongkan. Tautan yang sama dapat dipakai untuk mendaftarkan perangkat kembali.`,
        "Reset Slot Perangkat?",
      ],
      delete: [
        `Hapus ${guest.name} beserta tautan, seluruh akses, konfirmasi, dan ucapannya? Data tidak dapat dipulihkan.`,
        "Hapus Tamu?",
      ],
    };
    try {
      if (
        (kind !== "active" || guest.active) &&
        !(await confirm(descriptions[kind][0], descriptions[kind][1]))
      )
        return;
      const result = await api<{ link?: string }>(
        `/api/admin/guests/${guest.id}${kind === "link" ? "/link" : kind === "devices" ? "/devices" : ""}`,
        kind === "active" ? "PATCH" : kind === "link" ? "POST" : "DELETE",
        kind === "active"
          ? { active: !guest.active }
          : kind === "link"
            ? {}
            : undefined,
      );
      await refresh();
      if (result.link) showLink(result.link);
      notice(
        {
          active: "Status tamu disimpan.",
          link: "Tautan pengganti dibuat.",
          devices: "Slot perangkat direset.",
          delete: "Tamu dihapus.",
        }[kind],
      );
    } catch (e) {
      notice(errorMessage(e), true);
    } finally {
      setBusy(false);
    }
  }
  const attendance = guest.response?.attendance;
  const label = attendance
    ? {
        attending: `Hadir · ${guest.response!.guestCount} orang`,
        not_attending: "Tidak hadir",
        unsure: "Belum pasti",
      }[attendance]
    : "Belum konfirmasi";
  return (
    <tr>
      <td>
        <p className="guest-name">{guest.name}</p>
        <p className="guest-phone">{guest.phone || "Tanpa WhatsApp"}</p>
      </td>
      <td>
        <span className={`tag ${guest.active ? "active" : "inactive"}`}>
          ● {guest.active ? "Aktif" : "Nonaktif"}
        </span>
      </td>
      <td>
        <span className={`tag${guest.deviceCount === 3 ? " device-full" : ""}`}>
          {guest.deviceCount} / 3{guest.deviceCount === 3 ? " · Penuh" : ""}
        </span>
      </td>
      <td>
        <span className={`tag ${attendance || ""}`}>{label}</span>
      </td>
      <td>
        {guest.response?.message ? (
          <details className="guest-wish">
            <summary aria-label={`Baca ucapan ${guest.name}`}>
              <span className="wish-excerpt">{guest.response.message}</span>
              <span className="wish-action">Baca ucapan</span>
            </summary>
            <p className="wish-full">{guest.response.message}</p>
          </details>
        ) : (
          <p className="guest-wish">Belum ada ucapan</p>
        )}
      </td>
      <td>
        <div className="row-actions">
          <button
            type="button"
            disabled={!guest.link}
            aria-label={`Salin tautan ${guest.name}`}
            onClick={() => copy(guest.link!)}
          >
            Salin
          </button>
          {guest.phone && guest.link && guest.active ? (
            <a
              className="send-link secondary"
              href={whatsappUrl(template, guest)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Kirim undangan ${guest.name} melalui WhatsApp`}
            >
              Kirim
            </a>
          ) : (
            <button
              type="button"
              disabled
              title="Isi nomor WhatsApp, gunakan tautan tersimpan, dan aktifkan tamu untuk mengirim."
            >
              Kirim
            </button>
          )}
          <details className="guest-menu" name="guest-actions" ref={menu}>
            <summary aria-label={`Menu tindakan ${guest.name}`}>⋯</summary>
            <div className="menu-actions">
              <button
                onClick={() => {
                  menu.current?.removeAttribute("open");
                  edit();
                }}
                disabled={busy}
              >
                Edit tamu
              </button>
              <button onClick={() => action("active")} disabled={busy}>
                {guest.active ? "Nonaktifkan" : "Aktifkan"}
              </button>
              <button onClick={() => action("link")} disabled={busy}>
                Tautan baru
              </button>
              <button onClick={() => action("devices")} disabled={busy}>
                Reset perangkat
              </button>
              <button
                onClick={() => action("delete")}
                className="danger"
                disabled={busy}
              >
                Hapus tamu
              </button>
            </div>
          </details>
        </div>
        {!guest.link && (
          <p className="legacy-link">
            Tautan lama belum tersimpan. Buat tautan baru jika tautan asli
            hilang.
          </p>
        )}
      </td>
    </tr>
  );
}
function MediaCard({
  slot,
  title,
  src,
  api,
  onContent,
  confirm,
  notice,
}: {
  slot: string;
  title: string;
  src?: string;
  api: API;
  onContent: (c: Content) => void;
  confirm: Confirm;
  notice: (s: string, error?: boolean) => void;
}) {
  const [file, setFile] = useState<File>(),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState(""),
    [error, setError] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const music = slot === "music";
  useEffect(() => () => audio.current?.pause(), []);
  function select(file?: File) {
    setFeedback("");
    setError(false);
    setFile(undefined);
    try {
      mediaType(file, music);
      setFile(file);
    } catch (e) {
      if (file) {
        setFeedback(errorMessage(e));
        setError(true);
      }
    }
  }
  async function update(method: "PUT" | "DELETE") {
    if (
      method === "DELETE" &&
      !(await confirm(
        slot === "preview"
          ? "Thumbnail publik dan URL gambar lama akan dicabut dari preview tautan."
          : `${title} akan dihapus. Undangan kembali menampilkan bingkai kosong untuk media ini.`,
        "Hapus Media?",
      ))
    )
      return;
    setBusy(true);
    setError(false);
    setFeedback(method === "PUT" ? "Mengunggah berkas…" : "Menghapus media…");
    try {
      const type = method === "PUT" ? mediaType(file, music) : undefined;
      const content = await api<Content>(
        `/api/admin/media/${slot}`,
        method,
        method === "PUT" ? file : undefined,
        type,
      );
      audio.current?.pause();
      onContent(content);
      setFile(undefined);
      if (input.current) input.current.value = "";
      setFeedback("");
      notice(`${title} ${method === "PUT" ? "disimpan" : "dihapus"}.`);
      input.current?.focus();
    } catch (e) {
      setFeedback(errorMessage(e));
      setError(true);
      notice(errorMessage(e), true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article
      className={`media-card${music ? " music-card" : ""}`}
      data-slot={slot}
      aria-busy={busy}
    >
      <h3>
        {title}
        <span className="media-state">
          {src ? "Terpasang" : "Belum diunggah"}
        </span>
      </h3>
      {src ? (
        music ? (
          <audio src={src} controls preload="none" ref={audio} />
        ) : (
          <img src={src} alt={title} loading="lazy" decoding="async" />
        )
      ) : (
        <div className="placeholder" aria-hidden="true">
          {music ? "♫" : "▧"}
          <span>{music ? "Lengkapi suasana" : "Bingkai cerita Anda"}</span>
        </div>
      )}
      <label>
        {music ? "Pilih MP3" : "Pilih foto"}
        <input
          type="file"
          ref={input}
          accept={music ? "audio/mpeg,.mp3" : "image/jpeg,image/png,image/webp"}
          aria-label={`Pilih berkas ${title}`}
          disabled={busy}
          onChange={(e) => select(e.target.files?.[0])}
        />
      </label>
      <p className="file-name">{file?.name || "Belum ada berkas dipilih"}</p>
      <div className="media-actions">
        <button
          type="button"
          className="primary"
          disabled={busy || !file}
          onClick={() => update("PUT")}
        >
          {src ? "Ganti" : "Unggah"}
        </button>
        {src && (
          <button
            type="button"
            className="danger"
            disabled={busy}
            onClick={() => update("DELETE")}
          >
            Hapus
          </button>
        )}
      </div>
      {feedback && (
        <p role="status" className={`media-feedback${error ? " error" : ""}`}>
          {feedback}
        </p>
      )}
    </article>
  );
}
function SettingsForm({
  kind,
  content,
  api,
  onContent,
  notice,
  account,
}: {
  kind: "messages" | "event";
  content: Content;
  api: API;
  onContent: (c: Content) => void;
  notice: (s: string, error?: boolean) => void;
  account: Account;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => ({
      ...content.settings,
      whatsappTemplate:
        content.settings.whatsappTemplate ?? defaultWhatsappTemplate,
    })),
    [busy, setBusy] = useState(false);
  const field = (
    name: string,
    label: string,
    maxLength: number,
    placeholder = "",
    textarea = false,
    type = "text",
  ) => (
    <label>
      {label}
      {textarea ? (
        <textarea
          name={name}
          value={values[name] || ""}
          maxLength={maxLength}
          rows={name === "whatsappTemplate" ? 10 : 4}
          placeholder={placeholder}
          required={name === "whatsappTemplate"}
          onChange={(e) => {
            e.target.setCustomValidity(
              name === "whatsappTemplate" && !e.target.value.includes("{link}")
                ? "Sertakan {link} agar tamu menerima tautan undangannya."
                : "",
            );
            setValues({ ...values, [name]: e.target.value });
          }}
        />
      ) : (
        <input
          name={name}
          type={type}
          value={values[name] || ""}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => setValues({ ...values, [name]: e.target.value })}
        />
      )}
    </label>
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      onContent(await api<Content>("/api/admin/content", "PUT", value));
      notice(
        kind === "messages"
          ? "Pesan WhatsApp dan preview tautan disimpan."
          : "Detail acara disimpan.",
      );
    } catch (e) {
      notice(errorMessage(e), true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      id={kind === "messages" ? "whatsapp-settings" : "settings"}
      className="panel"
      onSubmit={submit}
    >
      {kind === "messages" ? (
        <>
          <h2>Pesan WhatsApp</h2>
          <p>Pesan yang sama, dengan nama dan tautan setiap tamu.</p>
          {field("whatsappTemplate", "Template pesan global", 4000, "", true)}
          <p id="template-help" className="help">
            Gunakan {"{nama}"} untuk nama tamu dan {"{link}"} untuk tautannya.{" "}
            {"{link}"} wajib ada.
          </p>
          <details className="message-example" open>
            <summary>Contoh Pesan</summary>
            <pre id="message-preview" className="message-preview">
              {invitationMessage(values.whatsappTemplate, {
                name: "Bapak/Ibu Tamu Undangan",
                link: `${account.invitationOrigin}/${account.tenant.publicId}#contoh-tautan`,
              })}
            </pre>
          </details>
          <div className="panel-divider">
            <h2>Preview Tautan</h2>
            {field(
              "linkPreviewTitle",
              "Judul preview",
              120,
              "Firsta & Talitha — Undangan",
            )}
            {field(
              "linkPreviewDescription",
              "Deskripsi preview",
              300,
              "22 November 2026 · Arjuna Ballroom Alam Indah Resto.",
              true,
            )}
            <p className="help">
              Kosongkan judul atau deskripsi untuk memakai teks bawaan. Simpan
              sebelum menggunakan tombol Kirim.
            </p>
          </div>
        </>
      ) : (
        <>
          <h2>Rangkaian Acara</h2>
          <div className="two-columns">
            {field(
              "ceremonyTitle",
              "Nama acara pertama",
              80,
              "Prosesi Pernikahan",
            )}
            {field("receptionTitle", "Nama acara kedua", 80, "Resepsi")}
          </div>
          <div className="two-columns">
            {field(
              "ceremonyTime",
              "Waktu acara pertama",
              80,
              "Contoh: 09.00 WIB",
            )}
            {field(
              "receptionTime",
              "Waktu acara kedua",
              80,
              "Contoh: 11.00–13.00 WIB",
            )}
          </div>
          <p className="help">
            Waktu yang kosong ditampilkan sebagai “Waktu akan diinformasikan”.
          </p>
          <div className="panel-divider">
            <h2>Hitung Mundur</h2>
            {field(
              "countdownTime",
              "Jam mulai countdown (WIB)",
              5,
              "",
              false,
              "time",
            )}
            <p className="help">
              Menuju 22 November 2026. Jika kosong, memakai pukul 00.00 WIB.
            </p>
          </div>
          <div className="panel-divider">
            <h2>Lokasi Acara</h2>
            {field(
              "mapEmbedUrl",
              "URL embed Google Maps",
              4096,
              "https://www.google.com/maps/embed?pb=…",
              true,
            )}
            <p className="help">
              Google Maps → Bagikan → Sematkan peta. Salin URL pada atribut src,
              bukan seluruh kode iframe. Tamu membuka Google Maps melalui tombol
              di peta embed.
            </p>
          </div>
        </>
      )}
      <div className="form-footer">
        <button className="primary" disabled={busy}>
          {busy
            ? "Menyimpan…"
            : kind === "messages"
              ? "Simpan pesan & preview"
              : "Simpan detail acara"}
        </button>
      </div>
    </form>
  );
}
function App() {
  const [session, setSession] = useState<Session>(),
    [loading, setLoading] = useState(true),
    [guests, setGuests] = useState<Guest[]>([]),
    [content, setContent] = useState<Content>(),
    [page, setPage] = useState<Page>(currentPage),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState<{ message: string; error: boolean }>(),
    [navigation, setNavigation] = useState(false),
    [editor, setEditor] = useState<{ guest: Guest | null }>(),
    [newLink, setNewLink] = useState(""),
    [manualLink, setManualLink] = useState(""),
    [loggingOut, setLoggingOut] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    message: string;
    title: string;
  }>();
  const csrf = useRef("");
  const pendingConfirmation = useRef<((yes: boolean) => void) | undefined>(
    undefined,
  );
  const notice = useCallback(
    (message: string, error = false) => setStatus({ message, error }),
    [],
  );
  const clearSession = useCallback(() => {
    csrf.current = "";
    pendingConfirmation.current?.(false);
    pendingConfirmation.current = undefined;
    setConfirmation(undefined);
    setSession(undefined);
    setGuests([]);
    setContent(undefined);
    setSearch("");
    setNavigation(false);
    setEditor(undefined);
    setNewLink("");
    setManualLink("");
    setStatus(undefined);
    setLoading(false);
  }, []);
  const api: API = useCallback(
    async <T,>(
      path: string,
      method = "GET",
      value?: unknown,
      type?: string,
    ): Promise<T> => {
      const token = csrf.current,
        headers: Record<string, string> = {};
      const options: RequestInit = { method, headers };
      if (method !== "GET") headers["X-CSRF-Token"] = token;
      if (value instanceof File) {
        headers["Content-Type"] = type || value.type;
        options.body = value;
      } else if (value !== undefined) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(value);
      }
      let response: Response;
      try {
        response = await fetch(path, options);
      } catch {
        throw new Error("Koneksi terputus. Periksa jaringan lalu coba lagi.");
      }
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("Server belum dapat merespons. Coba lagi sebentar.");
      }
      if (token !== csrf.current)
        throw new Error("Sesi berubah. Silakan masuk kembali.");
      if (!response.ok) {
        if (response.status === 401 && path !== "/api/admin/login")
          clearSession();
        throw Object.assign(
          new Error(result.error || "Perubahan belum berhasil."),
          { status: response.status },
        );
      }
      return result as T;
    },
    [clearSession],
  );
  const refreshGuests = async () =>
    setGuests(await api<Guest[]>("/api/admin/guests"));
  const signedIn = async (s: Session) => {
    csrf.current = s.csrf;
    const [g, c] = await Promise.all([
      api<Guest[]>("/api/admin/guests"),
      api<Content>("/api/admin/content"),
    ]);
    setSession(s);
    setGuests(g);
    setContent(c);
    setStatus(undefined);
    setLoading(false);
  };
  useEffect(() => {
    api<Session>("/api/admin/session")
      .then(signedIn)
      .catch((e) => {
        clearSession();
        if (e.status !== 401) notice(errorMessage(e), true);
      });
  }, [api]);
  useEffect(() => {
    const select = () => {
      setPage(currentPage());
      window.scrollTo(0, 0);
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>(`#page-${currentPage()} h1`)
          ?.focus({ preventScroll: true }),
      );
    };
    window.addEventListener("hashchange", select);
    return () => window.removeEventListener("hashchange", select);
  }, []);
  useEffect(() => {
    document.title = session
      ? `weddinvita — ${pages[page]}`
      : "weddinvita — Masuk CMS";
  }, [session, page]);
  useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      document
        .querySelectorAll<HTMLDetailsElement>(".guest-menu[open]")
        .forEach((menu) => {
          if (e instanceof KeyboardEvent) {
            if (e.key === "Escape") {
              menu.open = false;
              menu.querySelector("summary")?.focus();
            }
          } else if (!menu.contains(e.target as Node)) {
            menu.open = false;
          }
        });
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  const confirm: Confirm = (message, title) =>
    new Promise((resolve) => {
      pendingConfirmation.current = resolve;
      setConfirmation({ message, title });
    });
  function finishConfirmation(yes: boolean) {
    pendingConfirmation.current?.(yes);
    pendingConfirmation.current = undefined;
    setConfirmation(undefined);
  }
  async function logout() {
    setNavigation(false);
    setLoggingOut(true);
    try {
      await api("/api/admin/logout", "POST", {});
      clearSession();
      notice("Anda sudah keluar.");
    } catch (e) {
      notice(errorMessage(e), true);
    } finally {
      setLoggingOut(false);
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      notice("Tautan disalin.");
    } catch {
      setManualLink(value);
    }
  }
  function showLink(value: string) {
    setNewLink(value);
    requestAnimationFrame(() =>
      document
        .querySelector("#new-link")
        ?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
          block: "center",
        }),
    );
  }
  const summary = guestSummary(guests);
  const filtered = findGuests(guests, search) as Guest[];
  const mediaCard = (slot: string, title: string) => (
    <MediaCard
      key={slot}
      slot={slot}
      title={title}
      src={content?.media[slot]}
      api={api}
      onContent={setContent}
      confirm={confirm}
      notice={notice}
    />
  );
  const footer = (
    <div className="sidebar-footer">
      <a
        className="preview-link"
        href="/preview"
        target="_blank"
        rel="noopener"
      >
        Lihat undangan <span aria-hidden="true">↗</span>
      </a>
      <button
        type="button"
        className="quiet danger"
        onClick={logout}
        disabled={loggingOut}
      >
        Keluar <span aria-hidden="true">↪</span>
      </button>
      <p>CMS Pengelola · weddinvita</p>
    </div>
  );
  return (
    <>
      {loading ? (
        <p id="loading" className="loading" role="status">
          Memuat weddinvita…
        </p>
      ) : !session ? (
        <Login api={api} onLogin={signedIn} />
      ) : (
        content && (
          <div id="dashboard" className="dashboard">
            <aside className="sidebar" aria-label="Navigasi CMS">
              <div>
                <Brand />
                <p className="event-chip">{session.account.tenant.name}</p>
                <Navigation page={page} />
              </div>
              {footer}
            </aside>
            <div className="workspace">
              <header className="mobile-header">
                <Brand />
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-controls="navigation"
                  onClick={() => setNavigation(true)}
                >
                  ☰ Menu
                </button>
              </header>
              <div className="mobile-context">
                {session.account.tenant.name}
              </div>
              <main id="main-content">
                <section
                  id="page-tamu"
                  className="page"
                  aria-labelledby="guests-title"
                  hidden={page !== "tamu"}
                >
                  <header className="page-heading">
                    <div>
                      <div className="title-line">
                        <h1 id="guests-title" tabIndex={-1}>
                          Tamu Undangan
                        </h1>
                        <span id="guest-count" className="badge">
                          {summary.total} undangan
                        </span>
                      </div>
                      <p>Kelola penerima undangan dan konfirmasi kehadiran.</p>
                    </div>
                    <button
                      id="add-guest"
                      className="primary"
                      type="button"
                      onClick={() => setEditor({ guest: null })}
                    >
                      + Tambah Tamu
                    </button>
                  </header>
                  <div className="page-body">
                    <div className="metrics" aria-label="Ringkasan undangan">
                      {(
                        [
                          [
                            "Total Undangan",
                            summary.total,
                            "undangan",
                            `${summary.active} aktif · ${summary.inactive} nonaktif`,
                          ],
                          [
                            "Undangan Hadir",
                            summary.attending,
                            "undangan",
                            "Dari undangan aktif",
                          ],
                          [
                            "Jumlah Orang Hadir",
                            summary.people,
                            "orang",
                            "Termasuk penerima undangan",
                          ],
                          [
                            "Belum Konfirmasi",
                            summary.pending,
                            "undangan",
                            "Menunggu jawaban tamu aktif",
                          ],
                        ] as const
                      ).map(([title, value, unit, help]) => (
                        <article className="metric" key={title}>
                          <h2>{title}</h2>
                          <strong>{value}</strong>
                          <span> {unit}</span>
                          <p>{help}</p>
                        </article>
                      ))}
                    </div>
                    <p className="attendance-summary">
                      {summary.declined} undangan tidak hadir · {summary.unsure}{" "}
                      belum pasti · Rekap kehadiran hanya dari undangan aktif.
                    </p>
                    <p className="info-note">
                      <span aria-hidden="true">ⓘ</span> Setiap tautan memiliki
                      maksimal 3 slot browser/perangkat. Browser baru dapat
                      memakai slot baru.
                    </p>
                    {newLink && (
                      <div id="new-link" className="new-link">
                        <div className="section-heading">
                          <h2>Tautan Undangan Siap</h2>
                          <button
                            type="button"
                            className="quiet"
                            aria-label="Tutup tautan baru"
                            onClick={() => setNewLink("")}
                          >
                            ×
                          </button>
                        </div>
                        <label>
                          Tautan sudah tersimpan di daftar tamu
                          <input readOnly value={newLink} />
                        </label>
                        <button type="button" onClick={() => copy(newLink)}>
                          Salin tautan
                        </button>
                        <p>
                          Kirim tautan pengganti jika tautan lama telah dicabut.
                        </p>
                      </div>
                    )}
                    <div className="search-bar">
                      <label className="search-label">
                        <span className="sr-only">
                          Cari tamu berdasarkan nama atau nomor WhatsApp
                        </span>
                        <input
                          id="search"
                          type="search"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Cari nama atau nomor WhatsApp…"
                        />
                      </label>
                      <span role="status">
                        Menampilkan {filtered.length} dari {guests.length}
                      </span>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <caption className="sr-only">
                          Daftar tamu undangan, perangkat, konfirmasi, dan
                          tindakan
                        </caption>
                        <thead>
                          <tr>
                            {[
                              "Nama & WhatsApp",
                              "Status",
                              "Perangkat",
                              "Konfirmasi",
                              "Ucapan & Doa",
                              "Aksi",
                            ].map((title) => (
                              <th scope="col" key={title}>
                                {title}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody id="guests">
                          {filtered.map((guest) => (
                            <GuestRow
                              key={guest.id}
                              guest={guest}
                              template={
                                content.settings.whatsappTemplate ??
                                defaultWhatsappTemplate
                              }
                              api={api}
                              refresh={refreshGuests}
                              confirm={confirm}
                              edit={() => setEditor({ guest })}
                              copy={copy}
                              showLink={showLink}
                              notice={notice}
                            />
                          ))}
                        </tbody>
                      </table>
                      {!filtered.length && (
                        <p className="empty">
                          {guests.length
                            ? "Tidak ada tamu yang cocok. Coba nama atau nomor lain."
                            : "Belum ada tamu. Tambahkan tamu untuk membuat tautan pertama."}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
                <section
                  id="page-pesan"
                  className="page"
                  aria-labelledby="whatsapp-title"
                  hidden={page !== "pesan"}
                >
                  <header className="page-heading">
                    <div>
                      <p className="eyebrow">Kesan pertama yang hangat</p>
                      <h1 id="whatsapp-title" tabIndex={-1}>
                        Pesan &amp; Preview
                      </h1>
                      <p>Atur sapaan dan tampilan tautan saat dibagikan.</p>
                    </div>
                  </header>
                  <div className="page-body messages-layout">
                    <SettingsForm
                      kind="messages"
                      content={content}
                      api={api}
                      onContent={setContent}
                      notice={notice}
                      account={session.account}
                    />
                    <aside
                      className="panel preview-panel"
                      aria-labelledby="thumbnail-title"
                    >
                      <h2 id="thumbnail-title">Thumbnail Tautan</h2>
                      <p>Gambar pertama yang menyambut tamu di WhatsApp.</p>
                      <div id="preview-media">
                        {mediaCard("preview", "Thumbnail WhatsApp")}
                      </div>
                      <p className="help">
                        JPG, PNG, WebP · maksimal 12 MB. Dipotong otomatis
                        menjadi 1200 × 630 piksel. Thumbnail dapat diakses
                        publik agar WhatsApp bisa membacanya.
                      </p>
                      <p className="info-note">
                        Kirim membuka WhatsApp dengan pesan terisi. Tekan kirim
                        di WhatsApp untuk mengirimnya.
                      </p>
                    </aside>
                  </div>
                </section>
                <section
                  id="page-media"
                  className="page"
                  aria-labelledby="media-title"
                  hidden={page !== "media"}
                >
                  <header className="page-heading">
                    <div>
                      <p className="eyebrow">Cerita dalam setiap bingkai</p>
                      <h1 id="media-title" tabIndex={-1}>
                        Foto &amp; Lagu
                      </h1>
                      <p>Lengkapi undangan dengan kenangan dan lagu pilihan.</p>
                    </div>
                  </header>
                  <div className="page-body">
                    <p className="info-note">
                      Foto JPG, PNG, WebP maksimal 12 MB diperkecil otomatis.
                      Lagu MP3 maksimal 25 MB. Pilih berkas, lalu tekan Unggah.
                    </p>
                    <section
                      className="media-section"
                      aria-labelledby="couple-title"
                    >
                      <div className="section-heading">
                        <h2 id="couple-title">Foto Pasangan</h2>
                        <span className="muted">Dua sosok, satu cerita</span>
                      </div>
                      <div id="couple-media" className="media-grid couple-grid">
                        {mediaCard("groom", "Foto Mempelai Pria")}
                        {mediaCard("bride", "Foto Mempelai Wanita")}
                      </div>
                    </section>
                    <section
                      className="media-section"
                      aria-labelledby="gallery-title"
                    >
                      <div className="section-heading">
                        <h2 id="gallery-title">Galeri Kenangan</h2>
                        <span className="badge">9 slot foto</span>
                      </div>
                      <div
                        id="gallery-media"
                        className="media-grid gallery-grid"
                      >
                        {Array.from({ length: 9 }, (_, i) =>
                          mediaCard(
                            `gallery${i + 1}`,
                            `Galeri · Foto ${i + 1}`,
                          ),
                        )}
                      </div>
                    </section>
                    <section
                      className="media-section"
                      aria-labelledby="music-title"
                    >
                      <h2 id="music-title">Lagu Undangan</h2>
                      <div id="music-media">
                        {mediaCard("music", "Lagu Pilihan")}
                      </div>
                    </section>
                  </div>
                </section>
                <section
                  id="page-acara"
                  className="page"
                  aria-labelledby="event-settings-title"
                  hidden={page !== "acara"}
                >
                  <header className="page-heading">
                    <div>
                      <p className="eyebrow">Menuju hari bahagia</p>
                      <h1 id="event-settings-title" tabIndex={-1}>
                        Detail Acara
                      </h1>
                      <p>Pastikan waktu dan lokasi tersampaikan dengan baik.</p>
                    </div>
                  </header>
                  <div className="page-body event-layout">
                    <SettingsForm
                      kind="event"
                      content={content}
                      api={api}
                      onContent={setContent}
                      notice={notice}
                      account={session.account}
                    />
                    <aside className="event-context panel">
                      <p className="eyebrow">Undangan Pernikahan</p>
                      <h2>{session.account.tenant.name}</h2>
                      <p className="help">
                        Pengaturan dan media hanya berlaku untuk undangan akun
                        ini.
                      </p>
                    </aside>
                  </div>
                </section>
              </main>
              <footer className="workspace-footer">
                weddinvita<span aria-hidden="true">•</span>{" "}
                <span>Merangkai momen, menyambut cerita.</span>
              </footer>
            </div>
          </div>
        )
      )}
      {status && (
        <div
          id="status"
          role="status"
          className={`status${status.error ? " error" : ""}`}
        >
          <span>{status.message}</span>
          <button
            type="button"
            aria-label="Tutup pemberitahuan"
            onClick={() => setStatus(undefined)}
          >
            ×
          </button>
        </div>
      )}
      {navigation && session && (
        <Modal
          label="navigation-title"
          className="navigation-dialog"
          onClose={() => setNavigation(false)}
        >
          <div>
            <div className="section-heading">
              <h2 id="navigation-title" className="brand">
                weddinvita<span aria-hidden="true">•</span>
              </h2>
              <button
                type="button"
                aria-label="Tutup menu"
                onClick={() => setNavigation(false)}
              >
                ×
              </button>
            </div>
            <p className="event-chip">{session.account.tenant.name}</p>
            <Navigation page={page} close={() => setNavigation(false)} />
            {footer}
          </div>
        </Modal>
      )}
      {editor && (
        <GuestEditor
          guest={editor.guest}
          api={api}
          onClose={() => setEditor(undefined)}
          onSaved={async (result) => {
            await refreshGuests();
            if (result.link) showLink(result.link);
            notice(editor.guest ? "Data tamu disimpan." : "Tamu ditambahkan.");
          }}
        />
      )}
      {confirmation && (
        <Modal
          label="confirm-title"
          description="confirm-message"
          onClose={() => finishConfirmation(false)}
        >
          <form
            method="dialog"
            onSubmit={(e) => {
              e.preventDefault();
              finishConfirmation(
                (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
                  "value",
                ) === "confirm",
              );
            }}
          >
            <p className="eyebrow">Konfirmasi Perubahan</p>
            <h2 id="confirm-title">{confirmation.title}</h2>
            <p id="confirm-message">{confirmation.message}</p>
            <div className="dialog-actions">
              <button value="cancel" autoFocus>
                Batal
              </button>
              <button value="confirm" className="primary">
                Lanjutkan
              </button>
            </div>
          </form>
        </Modal>
      )}
      {manualLink && (
        <Modal label="copy-title" onClose={() => setManualLink("")}>
          <form
            method="dialog"
            onSubmit={(e) => {
              e.preventDefault();
              setManualLink("");
            }}
          >
            <h2 id="copy-title">Salin Tautan Undangan</h2>
            <p>
              Clipboard tidak tersedia. Salin tautan yang sudah dipilih di
              bawah.
            </p>
            <label>
              Tautan undangan
              <input
                readOnly
                value={manualLink}
                autoFocus
                onFocus={(e) => e.target.select()}
              />
            </label>
            <div className="dialog-actions">
              <button className="primary">Selesai</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
