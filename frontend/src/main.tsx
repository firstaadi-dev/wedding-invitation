import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  defaultWhatsappTemplate,
  invitationMessage,
  whatsappUrl,
} from "../whatsapp.js";
import { guestSummary, queryGuests, mediaType } from "../admin-data.js";
import type {
  Account,
  Session,
  Guest,
  Content,
  GiftOption,
  API,
  Confirm,
} from "./types";
import "../admin.css";

const pages = {
  tamu: "Tamu Undangan",
  pesan: "Pesan dan pratinjau",
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
    <span className="brand-mark" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
    </span>
    <span className="brand-name">weddinvita</span>
    <span className="brand-caption">Portal Undangan</span>
  </a>
);
function ActionIcon({
  kind,
}: {
  kind: "copy" | "send" | "edit" | "filter" | "search";
}) {
  const paths = {
    copy: (
      <>
        <rect x="8" y="8" width="12" height="13" rx="2" />
        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
      </>
    ),
    send: <path d="m21 3-7 18-4-7-7-4L21 3ZM10 14 21 3" />,
    edit: <path d="m16 3 5 5M4 15 16 3l5 5L9 20l-6 1 1-6Z" />,
    filter: <path d="M3 4h18l-7 8v7l-4 2v-9L3 4Z" />,
    search: (
      <>
        <circle cx="10" cy="10" r="7" />
        <path d="m15 15 6 6" />
      </>
    ),
  };
  return (
    <svg
      className="action-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      {paths[kind]}
    </svg>
  );
}
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
  return createPortal(
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
    </dialog>,
    document.body,
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
      const session = await api<Session>(
        "/api/admin/login",
        "POST",
        Object.fromEntries(new FormData(form)),
      );
      form.reset();
      await onLogin(session);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      id="login-screen"
      className="login-screen"
      aria-labelledby="login-title"
    >
      <section className="login-story" aria-labelledby="login-story-title">
        <a href="/" className="login-wordmark">
          weddinvita<span aria-hidden="true">.</span>
        </a>
        <div className="login-statement">
          <p className="login-eyebrow">Kelola undangan pernikahan Anda</p>
          <h1 id="login-story-title">
            Siapkan
            <br />
            undangan Anda
          </h1>
          <p>
            Atur detail acara, bagikan undangan, dan lihat konfirmasi tamu.
          </p>
          <span className="login-signature">weddinvita</span>
        </div>
        <span className="login-watermark" aria-hidden="true">
          W
        </span>
      </section>
      <section className="login-form-side">
        <div className="login-panel">
          <p className="login-eyebrow">Portal Undangan</p>
          <h2 id="login-title">Selamat datang</h2>
          <p>Masuk untuk menyiapkan dan memantau undangan pernikahan Anda.</p>
          <form id="login" onSubmit={submit} aria-busy={busy}>
            {error && (
              <p id="login-error" className="form-error" role="alert">
                {error}
              </p>
            )}
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                placeholder="nama@email.com"
                disabled={busy}
              />
            </label>
            <label>
              Kata sandi
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={1024}
                placeholder="Masukkan kata sandi"
                disabled={busy}
              />
            </label>
            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Memeriksa…" : "Masuk ke akun"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="login-help">Akses khusus untuk pasangan pengantin.</p>
        </div>
        <p className="login-footer">weddinvita</p>
      </section>
    </main>
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
  onSaved: (result: { link?: string }) => void;
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
        { ...values, ...(guest ? { unlimited: values.unlimited === "true" } : {}) },
      );
      onSaved(result);
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
          Setiap undangan memiliki tautan pribadi. Batas browser mengikuti
          pengaturan global. Browser berbeda pada perangkat yang sama dapat
          memakai slot terpisah.
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
        {guest && (
          <label>
            Batas browser
            <select
              name="unlimited"
              defaultValue={String(guest.unlimited)}
              disabled={busy}
            >
              <option value="false">Ikuti pengaturan global</option>
              <option value="true">Tanpa limit</option>
            </select>
            <span className="help">Perubahan ini tetap menyimpan riwayat akses.</span>
          </label>
        )}
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
  selected,
  onSelect,
  bulkBusy,
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
  selected: boolean;
  onSelect: () => void;
  bulkBusy: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [menuOpen, setMenuOpen] = useState(false),
    [wishOpen, setWishOpen] = useState(false);
  async function action(kind: "active" | "link" | "devices" | "delete") {
    setMenuOpen(false);
    setBusy(true);
    const descriptions = {
      active: [
        `Undangan ${guest.name} tidak dapat dibuka lagi dan ucapannya disembunyikan. Semua akses saat ini akan dihentikan. Data tetap tersimpan dan undangan dapat diaktifkan kembali.`,
        "Nonaktifkan undangan?",
        "Nonaktifkan undangan",
      ],
      link: [
        `Tautan lama ${guest.name} tidak dapat digunakan lagi. Semua akses browser akan direset. Kirim tautan pengganti kepada tamu.`,
        "Ganti tautan undangan?",
        "Ganti tautan",
      ],
      devices: [
        `Semua akses browser ${guest.name} akan direset. Tamu dapat membuka kembali undangan melalui tautan yang sama.`,
        "Reset akses browser?",
        "Reset akses browser",
      ],
      delete: [
        `Hapus ${guest.name} beserta tautan, seluruh akses, konfirmasi, dan ucapannya? Data tidak dapat dipulihkan.`,
        "Hapus tamu?",
        "Hapus tamu",
      ],
    };
    try {
      if (
        (kind !== "active" || guest.active) &&
        !(await confirm(
          descriptions[kind][0],
          descriptions[kind][1],
          descriptions[kind][2],
        ))
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
          devices: "Akses browser direset.",
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
        attending: "Hadir",
        not_attending: "Tidak hadir",
        unsure: "Belum pasti",
      }[attendance]
    : "Belum konfirmasi";
  const disabled = busy || bulkBusy;
  return (
    <>
      <tr className={selected ? "selected" : ""} aria-busy={busy}>
        <td>
          <label className="row-select">
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelect}
              disabled={disabled}
              aria-label={`Pilih ${guest.name}`}
            />
          </label>
        </td>
        <th scope="row">
          <span className="guest-name">{guest.name}</span>
        </th>
        <td className="guest-phone">
          {guest.phone || <span className="muted">—</span>}
        </td>
        <td>
          <span className={`tag ${guest.active ? "active" : "inactive"}`}>
            {guest.active ? "Aktif" : "Nonaktif"}
          </span>
        </td>
        <td>
          <span className={`tag ${attendance || "pending"}`}>{label}</span>
        </td>
        <td>{guest.response?.guestCount ?? "—"}</td>
        <td>
          <span
            className={`device-count${guest.deviceLimit !== null && guest.deviceCount >= guest.deviceLimit ? " full" : ""}`}
            title={`${guest.deviceCount} browser tercatat${guest.deviceLimit === null ? "; tanpa limit" : `; batas ${guest.deviceLimit} browser`}`}
          >
            {guest.deviceCount} / {guest.deviceLimit ?? "∞"}
          </span>
        </td>
        <td>
          {guest.response?.message ? (
            <button
              className="read-wish"
              type="button"
              onClick={() => setWishOpen(true)}
              aria-label={`Baca ucapan ${guest.name}`}
            >
              Baca
            </button>
          ) : (
            <span className="muted">—</span>
          )}
        </td>
        <td>
          <div className="row-actions">
            <button
              className="copy-link"
              type="button"
              disabled={!guest.link || disabled}
              aria-label={`Salin tautan ${guest.name}`}
              onClick={() => copy(guest.link!)}
            >
              <ActionIcon kind="copy" />
              <span>Salin tautan</span>
            </button>
            {guest.phone && guest.link && guest.active && !disabled ? (
              <a
                className="send-link secondary"
                href={whatsappUrl(template, guest)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Buka WhatsApp untuk mengirim undangan ${guest.name}`}
              >
                <ActionIcon kind="send" />
                <span>Buka WhatsApp</span>
              </a>
            ) : (
              <button
                className="send-link"
                type="button"
                disabled
                title="Untuk membuka WhatsApp, isi nomor tamu, pastikan tautannya tersedia, dan aktifkan undangannya."
              >
                <ActionIcon kind="send" />
                <span>Buka WhatsApp</span>
              </button>
            )}
            <button
              className="icon-button quiet"
              type="button"
              disabled={disabled}
              onClick={edit}
              title="Edit tamu"
              aria-label={`Edit ${guest.name}`}
            >
              <ActionIcon kind="edit" />
            </button>
            <button
              className="icon-button quiet"
              type="button"
              disabled={disabled}
              onClick={() => setMenuOpen(true)}
              aria-haspopup="dialog"
              aria-label={`Menu tindakan ${guest.name}`}
            >
              ⋯
            </button>
          </div>
        </td>
      </tr>
      {menuOpen && (
        <Modal
          label={`actions-${guest.id}`}
          onClose={() => setMenuOpen(false)}
          busy={busy}
        >
          <div className="section-heading">
            <h2 id={`actions-${guest.id}`}>Aksi undangan</h2>
            <button
              className="icon-button quiet"
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Tutup aksi undangan"
            >
              ×
            </button>
          </div>
          <p>{guest.name}</p>
          {!guest.link && (
            <p className="info-note">
              Tautan lama belum tersimpan. Buat tautan baru jika tautan asli
              hilang.
            </p>
          )}
          <div className="menu-actions">
            <button onClick={() => action("active")} disabled={busy}>
              {guest.active ? "Nonaktifkan undangan" : "Aktifkan undangan"}
            </button>
            <button onClick={() => action("link")} disabled={busy}>
              Buat tautan baru
            </button>
            <button onClick={() => action("devices")} disabled={busy}>
              Reset akses browser
            </button>
            <button
              onClick={() => action("delete")}
              className="danger"
              disabled={busy}
            >
              Hapus tamu
            </button>
          </div>
        </Modal>
      )}
      {wishOpen && (
        <Modal label={`wish-${guest.id}`} onClose={() => setWishOpen(false)}>
          <div className="section-heading">
            <h2 id={`wish-${guest.id}`}>Ucapan dan doa</h2>
            <button
              className="icon-button quiet"
              type="button"
              onClick={() => setWishOpen(false)}
              aria-label="Tutup ucapan"
            >
              ×
            </button>
          </div>
          <p>
            <strong>{guest.name}</strong>
          </p>
          <p className="wish-full">{guest.response?.message}</p>
        </Modal>
      )}
    </>
  );
}
function GuestsPage({
  guests,
  template,
  api,
  refresh,
  confirm,
  copy,
  showLink,
  newLink,
  dismissLink,
  edit,
  add,
  notice,
}: {
  guests: Guest[];
  template: string;
  api: API;
  refresh: () => Promise<void>;
  confirm: Confirm;
  copy: (value: string) => Promise<void>;
  showLink: (value: string) => void;
  newLink: string;
  dismissLink: () => void;
  edit: (guest: Guest) => void;
  add: () => void;
  notice: (message: string, error?: boolean) => void;
}) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [attendance, setAttendance] = useState("all"),
    [devices, setDevices] = useState("all"),
    [sort, setSort] = useState("name-asc");
  const [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(25),
    [selected, setSelected] = useState<string[]>([]),
    [filtersOpen, setFiltersOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false),
    [bulkProgress, setBulkProgress] = useState(0);
  const scroller = useRef<HTMLDivElement>(null),
    selectAll = useRef<HTMLInputElement>(null);
  const filtered = useMemo(
    () =>
      queryGuests(guests, {
        query: search,
        status,
        attendance,
        devices,
        sort,
      }) as Guest[],
    [guests, search, status, attendance, devices, sort],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize)),
    currentPage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const summary = guestSummary(guests);
  useEffect(() => {
    setSelected([]);
  }, [guests, search, status, attendance, devices, sort, page, pageSize]);
  useEffect(() => {
    if (selectAll.current)
      selectAll.current.indeterminate =
        selected.length > 0 && selected.length < visible.length;
  }, [selected.length, visible.length]);
  function resetPage() {
    setPage(1);
    setSelected([]);
    if (scroller.current) scroller.current.scrollTop = 0;
  }
  function changePage(value: number) {
    const next = Math.max(1, Math.min(totalPages, Math.trunc(value) || 1));
    setPage(next);
    setSelected([]);
    if (scroller.current) scroller.current.scrollTop = 0;
    return next;
  }
  function sortBy(key: string) {
    setSort(sort === `${key}-asc` ? `${key}-desc` : `${key}-asc`);
    resetPage();
  }
  function reset() {
    setSearch("");
    setStatus("all");
    setAttendance("all");
    setDevices("all");
    setSort("name-asc");
    resetPage();
  }
  async function setActive(active: boolean) {
    if (!selected.length) return;
    const ids = [...selected];
    setBulkBusy(true);
    setBulkProgress(0);
    try {
      if (
        !(await confirm(
          active
            ? `${ids.length} undangan yang dipilih dapat kembali dibuka.`
            : `${ids.length} undangan yang dipilih tidak dapat dibuka dan semua akses saat ini dihentikan. Data tetap tersimpan.`,
          `${active ? "Aktifkan" : "Nonaktifkan"} ${ids.length} undangan?`,
          active ? "Aktifkan undangan" : "Nonaktifkan undangan",
        ))
      )
        return;
      let done = 0,
        failed = "";
      for (let i = 0; i < ids.length; i += 4) {
        const results = await Promise.allSettled(
          ids
            .slice(i, i + 4)
            .map((id) => api(`/api/admin/guests/${id}`, "PATCH", { active })),
        );
        done += results.filter(
          (result) => result.status === "fulfilled",
        ).length;
        setBulkProgress(done);
        const failure = results.find((result) => result.status === "rejected");
        if (failure?.status === "rejected") {
          failed = errorMessage(failure.reason);
          break;
        }
      }
      try {
        await refresh();
      } catch (e) {
        failed = failed || errorMessage(e);
      }
      setSelected([]);
      notice(
        failed
          ? `${done} dari ${ids.length} undangan diperbarui. ${failed}`
          : `Status ${done} undangan disimpan.`,
        Boolean(failed),
      );
    } catch (e) {
      notice(errorMessage(e), true);
    } finally {
      setBulkBusy(false);
    }
  }
  const sortHeader = (key: string, label: string) => (
    <button type="button" disabled={bulkBusy} onClick={() => sortBy(key)}>
      {label}
      <span aria-hidden="true">
        {sort === `${key}-asc` ? "↑" : sort === `${key}-desc` ? "↓" : "↕"}
      </span>
    </button>
  );
  return (
    <section
      id="page-tamu"
      className="page guest-page"
      aria-labelledby="guests-title"
    >
      <div className="guest-workspace">
        <header className="page-heading">
          <div>
            <h1 id="guests-title" tabIndex={-1}>
              Tamu Undangan
            </h1>
            <p>Kelola tautan undangan dan konfirmasi tamu.</p>
          </div>
          <button
            id="add-guest"
            className="primary"
            type="button"
            onClick={add}
            disabled={bulkBusy}
          >
            + Tambah tamu
          </button>
        </header>
        <div className="guest-toolbar">
          <label className="search-label">
            <span className="sr-only">Cari nama atau nomor WhatsApp</span>
            <ActionIcon kind="search" />
            <input
              id="search"
              type="search"
              placeholder="Cari nama atau WhatsApp…"
              value={search}
              disabled={bulkBusy}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
            />
          </label>
          <label>
            <span className="sr-only">Status undangan</span>
            <select
              value={status}
              disabled={bulkBusy}
              onChange={(e) => {
                setStatus(e.target.value);
                resetPage();
              }}
              aria-label="Status undangan"
            >
              <option value="all">Semua status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Konfirmasi kehadiran</span>
            <select
              value={attendance}
              disabled={bulkBusy}
              onChange={(e) => {
                setAttendance(e.target.value);
                resetPage();
              }}
              aria-label="Konfirmasi kehadiran"
            >
              <option value="all">Semua konfirmasi</option>
              <option value="attending">Hadir</option>
              <option value="pending">Belum konfirmasi</option>
              <option value="not_attending">Tidak hadir</option>
              <option value="unsure">Belum pasti</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            disabled={bulkBusy}
            aria-haspopup="dialog"
          >
            <ActionIcon kind="filter" />
            Filter{devices !== "all" && <span className="filter-count">1</span>}
          </button>
          <button
            className="quiet"
            type="button"
            onClick={reset}
            disabled={bulkBusy}
          >
            Reset
          </button>
        </div>
        <div className="metrics" aria-label="Ringkasan undangan">
          {[
            ["Total undangan", summary.total, "total"],
            ["Konfirmasi hadir", summary.attending, "attending"],
            ["Belum konfirmasi", summary.pending, "pending"],
            ["Nonaktif", summary.inactive, "inactive"],
          ].map(([label, value, key]) => (
            <article className={`metric ${key}`} key={key}>
              <h2>{label}</h2>
              <strong>{Number(value).toLocaleString("id-ID")}</strong>
            </article>
          ))}
        </div>
        {newLink && (
          <div id="new-link" className="new-link">
            <div className="section-heading">
              <h2>Tautan undangan siap</h2>
              <button
                type="button"
                className="icon-button quiet"
                aria-label="Tutup tautan baru"
                onClick={dismissLink}
              >
                ×
              </button>
            </div>
            <label>
              Tautan sudah tersimpan di daftar tamu
              <input readOnly value={newLink} />
            </label>
            <button type="button" onClick={() => copy(newLink)}>
              <ActionIcon kind="copy" />
              Salin tautan
            </button>
            <p>Kirim tautan pengganti jika tautan lama telah dicabut.</p>
          </div>
        )}
        <div className="selection-bar">
          <span role="status">
            {selected.length ? (
              <strong>{selected.length} tamu dipilih pada halaman ini</strong>
            ) : (
              <>
                <strong id="guest-count">
                  {filtered.length.toLocaleString("id-ID")}
                </strong>{" "}
                tamu
                {filtered.length !== guests.length &&
                  ` dari ${guests.length.toLocaleString("id-ID")}`}
              </>
            )}
          </span>
          {selected.length ? (
            <div>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => setActive(true)}
              >
                Aktifkan
              </button>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => setActive(false)}
              >
                Nonaktifkan
              </button>
              <button
                className="quiet"
                type="button"
                disabled={bulkBusy}
                onClick={() => setSelected([])}
              >
                Batal pilihan
              </button>
              {bulkBusy && (
                <span role="status">
                  Menyimpan {bulkProgress}/{selected.length}…
                </span>
              )}
            </div>
          ) : (
            <span className="muted">
              Ringkasan dihitung per undangan aktif, kecuali total undangan dan nonaktif.
            </span>
          )}
        </div>
        <p className="table-hint">
          Geser tabel untuk melihat kolom dan aksi lainnya.
        </p>
        <div
          className="table-wrap"
          ref={scroller}
          tabIndex={0}
          role="region"
          aria-label="Tabel tamu, dapat digulir untuk melihat seluruh kolom dan baris"
        >
          <table>
            <caption className="sr-only">
              Daftar tamu, WhatsApp, status, konfirmasi, jumlah kehadiran,
              browser, ucapan, dan aksi
            </caption>
            <colgroup>
              <col className="select-col" />
              <col className="name-col" />
              <col className="phone-col" />
              <col className="status-col" />
              <col className="attendance-col" />
              <col className="guest-count-col" />
              <col className="devices-col" />
              <col className="wish-col" />
              <col className="actions-col" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">
                  <label className="row-select">
                    <input
                      type="checkbox"
                      ref={selectAll}
                      checked={
                        Boolean(visible.length) &&
                        selected.length === visible.length
                      }
                      disabled={!visible.length || bulkBusy}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked ? visible.map((g) => g.id) : [],
                        )
                      }
                      aria-label={`Pilih semua ${visible.length} tamu pada halaman ini`}
                    />
                  </label>
                </th>
                <th
                  scope="col"
                  aria-sort={
                    sort.startsWith("name-")
                      ? sort.endsWith("asc")
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {sortHeader("name", "Nama tamu")}
                </th>
                <th scope="col">WhatsApp</th>
                <th scope="col">Status</th>
                <th
                  scope="col"
                  aria-sort={
                    sort.startsWith("attendance-")
                      ? sort.endsWith("asc")
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {sortHeader("attendance", "Konfirmasi")}
                </th>
                <th scope="col">Jumlah kehadiran</th>
                <th scope="col">Browser</th>
                <th scope="col">Ucapan</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody id="guests">
              {visible.map((guest) => (
                <GuestRow
                  key={guest.id}
                  guest={guest}
                  template={template}
                  api={api}
                  refresh={refresh}
                  confirm={confirm}
                  edit={() => edit(guest)}
                  copy={copy}
                  showLink={showLink}
                  notice={notice}
                  selected={selected.includes(guest.id)}
                  onSelect={() =>
                    setSelected(
                      selected.includes(guest.id)
                        ? selected.filter((id) => id !== guest.id)
                        : [...selected, guest.id],
                    )
                  }
                  bulkBusy={bulkBusy}
                />
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <p className="empty">
              {guests.length
                ? "Tidak ada tamu yang cocok. Ubah pencarian atau reset filter."
                : "Belum ada tamu. Tambahkan tamu untuk membuat tautan pertama."}
            </p>
          )}
        </div>
        <footer className="table-footer">
          <p role="status">
            {filtered.length
              ? ((currentPage - 1) * pageSize + 1).toLocaleString("id-ID")
              : 0}
            –
            {Math.min(currentPage * pageSize, filtered.length).toLocaleString(
              "id-ID",
            )}{" "}
            dari <strong>{filtered.length.toLocaleString("id-ID")}</strong>{" "}
            hasil
          </p>
          <div className="pagination">
            <label>
              Baris per halaman
              <select
                value={pageSize}
                disabled={bulkBusy}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  resetPage();
                }}
              >
                {[25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <nav aria-label="Halaman tabel tamu">
              <button
                type="button"
                disabled={currentPage === 1 || bulkBusy}
                onClick={() => changePage(currentPage - 1)}
                aria-label="Halaman sebelumnya"
              >
                ‹
              </button>
              <label>
                Halaman
                <input
                  key={`${currentPage}-${totalPages}`}
                  type="number"
                  min={1}
                  max={totalPages}
                  defaultValue={currentPage}
                  disabled={bulkBusy}
                  aria-label="Nomor halaman"
                  onBlur={(e) => {
                    e.currentTarget.value = String(
                      changePage(Number(e.currentTarget.value)),
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.value = String(
                        changePage(Number(e.currentTarget.value)),
                      );
                    }
                  }}
                />
                dari {totalPages.toLocaleString("id-ID")}
              </label>
              <button
                type="button"
                disabled={currentPage === totalPages || bulkBusy}
                onClick={() => changePage(currentPage + 1)}
                aria-label="Halaman berikutnya"
              >
                ›
              </button>
            </nav>
          </div>
        </footer>
      </div>
      {filtersOpen && (
        <Modal
          label="guest-filters-title"
          onClose={() => setFiltersOpen(false)}
        >
          <div className="section-heading">
            <h2 id="guest-filters-title">Filter tamu</h2>
            <button
              className="icon-button quiet"
              type="button"
              onClick={() => setFiltersOpen(false)}
              aria-label="Tutup filter"
            >
              ×
            </button>
          </div>
          <label>
            Browser
            <select
              value={devices}
              onChange={(e) => {
                setDevices(e.target.value);
                resetPage();
              }}
            >
              <option value="all">Semua browser</option>
              <option value="full">Batas tercapai</option>
              <option value="unused">Belum digunakan</option>
            </select>
          </label>
          <p className="help">
            Batas browser mengikuti pengaturan global dan pengecualian per
            undangan. Browser berbeda pada perangkat yang sama dapat memakai slot
            terpisah.
          </p>
          <div className="dialog-actions">
            <button
              className="primary"
              type="button"
              onClick={() => setFiltersOpen(false)}
            >
              Selesai
            </button>
          </div>
        </Modal>
      )}
    </section>
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
          ? "Gambar pratinjau akan dihapus dan tautan gambar lama tidak dapat diakses lagi."
          : music
            ? "Musik latar akan dihapus dari undangan."
            : `${title} akan dihapus. Undangan kembali menampilkan bingkai kosong untuk foto ini.`,
        "Hapus media?",
        music ? "Hapus lagu" : "Hapus foto",
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
          <span>{music ? "Belum ada lagu" : "Belum ada foto"}</span>
        </div>
      )}
      <label className="file-picker">
        <span>{music ? "Pilih MP3" : "Pilih foto"}</span>
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
  confirm,
  previewMedia,
}: {
  kind: "messages" | "event";
  content: Content;
  api: API;
  onContent: (content: Content) => void;
  notice: (message: string, error?: boolean) => void;
  account: Account;
  confirm: Confirm;
  previewMedia?: ReactNode;
}) {
  const textSetting = (key: string, fallback: string) =>
    typeof content.settings[key] === "string"
      ? (content.settings[key] as string)
      : fallback;
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...(Object.fromEntries(
      Object.entries(content.settings).filter(
        ([, value]) => typeof value === "string",
      ),
    ) as Record<string, string>),
    deviceLimit: textSetting("deviceLimit", "3"),
    deviceLimitEnabled: textSetting("deviceLimitEnabled", "true"),
    whatsappTemplate: textSetting("whatsappTemplate", defaultWhatsappTemplate),
    partnerOneName: textSetting("partnerOneName", "Firsta Adi Pradana"),
    partnerTwoName: textSetting("partnerTwoName", "Talitha Syahda Arundatie"),
    partnerOneFather: textSetting("partnerOneFather", "Nugroho Andang Hapsoro"),
    partnerOneMother: textSetting("partnerOneMother", "Arieta Rahmasari"),
    partnerTwoFather: textSetting("partnerTwoFather", "Sudaryatno"),
    partnerTwoMother: textSetting("partnerTwoMother", "Wuri Wahyuningsih"),
  }));
  const [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  const templateInput = useRef<HTMLTextAreaElement>(null);
  const [giftEnabled, setGiftEnabled] = useState(
    content.settings.giftEnabled !== "false",
  );
  const [giftAccounts, setGiftAccounts] = useState<GiftOption[]>(() =>
    Array.isArray(content.settings.giftAccounts)
      ? (content.settings.giftAccounts.map((item) =>
          item.type === "address" ? item : { ...item, type: "account" },
        ) as GiftOption[])
      : [
          {
            type: "account",
            bank: "blu by BCA Digital",
            number: "0033 1600 0000",
            owner: "Firsta Adi Pradana",
          },
          {
            type: "account",
            bank: "Bank Mandiri",
            number: "1350018340537",
            owner: "TALITHA SYAHDA ARUND",
          },
        ],
  );
  const field = (
    name: string,
    label: string,
    maxLength: number,
    placeholder = "",
    textarea = false,
    type = "text",
  ) => (
    <label>
      <span className="field-label">
        <span>{label}</span>
        {kind === "messages" && (
          <span className="character-count">
            {(values[name] || "").length}/{maxLength}
          </span>
        )}
      </span>
      {textarea ? (
        <textarea
          ref={name === "whatsappTemplate" ? templateInput : undefined}
          name={name}
          value={values[name] || ""}
          maxLength={maxLength}
          rows={
            name === "whatsappTemplate"
              ? 11
              : name === "linkPreviewDescription"
                ? 3
                : 4
          }
          placeholder={placeholder}
          required={name === "whatsappTemplate"}
          onChange={(e) => {
            e.target.setCustomValidity(
              name === "whatsappTemplate" && !e.target.value.includes("{link}")
                ? "Sertakan {link} agar tamu menerima tautan undangannya."
                : "",
            );
            setValues({ ...values, [name]: e.target.value });
            setDirty(true);
          }}
        />
      ) : (
        <input
          name={name}
          type={type}
          value={values[name] || ""}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => {
            setValues({ ...values, [name]: e.target.value });
            setDirty(true);
          }}
        />
      )}
    </label>
  );
  function insertToken(token: string) {
    const input = templateInput.current;
    if (!input) return;
    const start = input.selectionStart,
      end = input.selectionEnd;
    const text =
      values.whatsappTemplate.slice(0, start) +
      token +
      values.whatsappTemplate.slice(end);
    if (text.length > 4000) {
      notice("Template pesan maksimal 4000 karakter.", true);
      return;
    }
    input.setCustomValidity(
      text.includes("{link}")
        ? ""
        : "Sertakan {link} agar tamu menerima tautan undangannya.",
    );
    setValues({ ...values, whatsappTemplate: text });
    setDirty(true);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + token.length, start + token.length);
    });
  }
  function updateGift(index: number, item: GiftOption) {
    setGiftAccounts((accounts) =>
      accounts.map((value, i) => (i === index ? item : value)),
    );
    setDirty(true);
  }
  async function changeGiftType(index: number, type: string) {
    const item = giftAccounts[index];
    const populated =
      item.type === "account"
        ? item.bank || item.number || item.owner
        : item.recipient || item.address || item.phone;
    if (
      populated &&
      !(await confirm(
        "Isian pada informasi hadiah ini akan dikosongkan untuk jenis yang baru.",
        "Ganti jenis informasi?",
        "Ganti jenis informasi",
      ))
    )
      return;
    updateGift(
      index,
      type === "address"
        ? { type: "address", recipient: "", address: "", phone: "" }
        : { type: "account", bank: "", number: "", owner: "" },
    );
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload: Record<string, unknown> = Object.fromEntries(
      new FormData(e.currentTarget),
    );
    if (kind === "event") {
      payload.giftEnabled = String(giftEnabled);
      payload.giftAccounts = giftAccounts;
    }
    setBusy(true);
    try {
      onContent(await api<Content>("/api/admin/content", "PUT", payload));
      setDirty(false);
      notice(
        kind === "messages"
          ? "Pesan WhatsApp dan pratinjau tautan disimpan."
          : "Detail acara disimpan.",
      );
    } catch (e) {
      notice(errorMessage(e), true);
    } finally {
      setBusy(false);
    }
  }
  let mapPreview = "";
  try {
    const url = new URL(values.mapEmbedUrl || "");
    if (
      url.origin === "https://www.google.com" &&
      !url.username &&
      !url.password &&
      url.pathname.startsWith("/maps/embed")
    )
      mapPreview = url.href;
  } catch {}
  const previewTitle =
    values.linkPreviewTitle?.trim() ||
    `Undangan Pernikahan ${textSetting("partnerOneName", values.partnerOneName).trim().split(/\s+/)[0]} & ${textSetting("partnerTwoName", values.partnerTwoName).trim().split(/\s+/)[0]}`;
  const previewDescription =
    values.linkPreviewDescription?.trim() ||
    "Minggu, 22 November 2026 · Arjuna Ballroom, Alam Indah Resto.";
  const exampleLink = `${account.invitationOrigin}/u/AbCdEfGhIjKlMnOpQrStUvWxYz0`;
  return (
    <form
      id={kind === "messages" ? "whatsapp-settings" : "settings"}
      className={`settings-form ${kind === "messages" ? "messages-form" : "event-form"}`}
      onSubmit={submit}
      aria-busy={busy}
    >
      {kind === "messages" ? (
        <>
          <header className="page-heading">
            <div>
              <h1 id="whatsapp-title" tabIndex={-1}>
                Pesan dan pratinjau
              </h1>
              <p>
                Atur template pesan WhatsApp dan tampilan pratinjau tautan
                undangan.
              </p>
            </div>
            <div className="settings-actions">
              <span className="save-state" role="status">
                {busy
                  ? "Menyimpan…"
                  : dirty
                    ? "Perubahan belum disimpan"
                    : "Pengaturan tersimpan"}
              </span>
              <button className="primary" disabled={busy}>
                {busy ? "Menyimpan…" : "Simpan pesan dan pratinjau"}
              </button>
            </div>
          </header>
          <div className="messages-layout">
            <fieldset disabled={busy} className="message-edit">
              <section className="panel">
                <div className="section-heading">
                  <h2>Template pesan</h2>
                  <span className="tag">Wajib {"{link}"}</span>
                </div>
                <p>
                  Gunakan {"{nama}"} untuk nama tamu dan {"{link}"} untuk tautan
                  undangan. Sertakan {"{link}"} agar tamu dapat membuka undangannya.
                </p>
                <div className="token-list">
                  <span>Sisipkan nama atau tautan:</span>
                  {["{nama}", "{link}"].map((token) => (
                    <button
                      type="button"
                      key={token}
                      onClick={() => insertToken(token)}
                      aria-label={`Sisipkan ${token}`}
                    >
                      + <code>{token}</code>
                    </button>
                  ))}
                </div>
                {field(
                  "whatsappTemplate",
                  "Pesan untuk semua tamu",
                  4000,
                  "",
                  true,
                )}
                <p className="help">
                  Pesan yang sama akan memakai nama dan tautan pribadi setiap
                  tamu.
                </p>
              </section>
              <section className="panel">
                <div className="section-heading">
                  <h2>Pratinjau tautan</h2>
                </div>
                <p>
                  Judul dan deskripsi saat dibagikan di WhatsApp. Kosongkan
                  untuk memakai bawaan.
                </p>
                <div className="field-stack">
                  {field(
                    "linkPreviewTitle",
                    "Judul pratinjau",
                    120,
                    "Undangan Pernikahan Nama Pasangan",
                  )}
                  {field(
                    "linkPreviewDescription",
                    "Deskripsi pratinjau",
                    300,
                    "Deskripsi undangan",
                    true,
                  )}
                </div>
              </section>
              <section className="panel">
                <div className="section-heading">
                  <h2>Gambar pratinjau WhatsApp</h2>
                </div>
                <p>
                  JPG, PNG, WebP maksimal 12 MB. Dipotong otomatis menjadi 1200
                  × 630 piksel dan dapat diakses publik untuk pratinjau WhatsApp.
                </p>
                {previewMedia}
              </section>
            </fieldset>
            <aside
              className="panel preview-panel"
              aria-labelledby="message-preview-title"
            >
              <h2 id="message-preview-title">Pratinjau Pesan WhatsApp</h2>
              <p>Simulasi untuk Bapak/Ibu Tamu Undangan.</p>
              <div className="whatsapp-preview">
                <div className="wa-bubble">
                  <div className="link-preview">
                    <div className="link-image">
                      {content.media.preview ? (
                        <img
                          src={content.media.preview}
                          alt="Gambar pratinjau tautan WhatsApp"
                        />
                      ) : (
                        <span>Gambar pratinjau belum diunggah</span>
                      )}
                    </div>
                    <div className="link-description">
                      <strong>{previewTitle}</strong>
                      <p>{previewDescription}</p>
                      <span>{new URL(account.invitationOrigin).host}</span>
                    </div>
                  </div>
                  <pre id="message-preview" className="message-preview">
                    {invitationMessage(values.whatsappTemplate, {
                      name: "Bapak/Ibu Tamu Undangan",
                      link: exampleLink,
                    })}
                  </pre>
                </div>
              </div>
              <p className="info-note">
                Pilih Buka WhatsApp pada halaman Tamu Undangan. Periksa pesannya,
                lalu kirim dari WhatsApp.
              </p>
            </aside>
          </div>
        </>
      ) : (
        <>
          <fieldset disabled={busy} className="event-fields">
            <section className="panel">
              <h2>Batas akses undangan</h2>
              <p>
                Berlaku untuk semua undangan dalam akun ini, kecuali undangan
                yang diatur tanpa limit.
              </p>
              <div className="two-columns">
                <label>
                  Pembatasan browser
                  <select
                    name="deviceLimitEnabled"
                    value={values.deviceLimitEnabled}
                    onChange={(e) => {
                      setValues({ ...values, deviceLimitEnabled: e.target.value });
                      setDirty(true);
                    }}
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif — tanpa limit</option>
                  </select>
                </label>
                <label>
                  Maksimal browser per undangan
                  <input
                    name="deviceLimit"
                    type="number"
                    min="1"
                    max="2147483647"
                    step="1"
                    required
                    value={values.deviceLimit}
                    onChange={(e) => {
                      setValues({ ...values, deviceLimit: e.target.value });
                      setDirty(true);
                    }}
                  />
                </label>
              </div>
              <p className="help">
                Riwayat akses tetap tersimpan dan browser baru tetap dicatat saat
                limit nonaktif. Setelah limit diaktifkan kembali atau diturunkan,
                browser yang sudah tercatat tetap bisa masuk; browser baru
                mengikuti batas yang berlaku. Atur pengecualian melalui Edit Tamu.
              </p>
            </section>
            <section className="panel">
              <div className="section-heading">
                <h2>Mempelai</h2>
              </div>
              <div className="two-columns">
                {field(
                  "partnerOneName",
                  "Nama mempelai pertama",
                  120,
                  "Nama lengkap mempelai pertama",
                )}
                {field(
                  "partnerTwoName",
                  "Nama mempelai kedua",
                  120,
                  "Nama lengkap mempelai kedua",
                )}
              </div>
              <p className="help">
                Gelar akademik atau kehormatan dapat ditulis langsung pada nama.
              </p>
            </section>
            <section className="panel">
              <div className="section-heading">
                <h2>Keluarga &amp; Orang Tua</h2>
              </div>
              <div className="two-columns">
                <div className="family-group">
                  <h3>Keluarga mempelai pertama</h3>
                  {field("partnerOneFather", "Nama ayah", 120, "Nama ayah")}
                  {field("partnerOneMother", "Nama ibu", 120, "Nama ibu")}
                </div>
                <div className="family-group">
                  <h3>Keluarga mempelai kedua</h3>
                  {field("partnerTwoFather", "Nama ayah", 120, "Nama ayah")}
                  {field("partnerTwoMother", "Nama ibu", 120, "Nama ibu")}
                </div>
              </div>
            </section>
            <section className="panel">
              <div className="section-heading">
                <h2>Rangkaian Acara</h2>
              </div>
              <div className="event-group">
                <h3>
                  <span>1</span>Acara pertama
                </h3>
                <div className="two-columns">
                  {field("ceremonyTitle", "Nama acara", 80, "Akad Nikah")}
                  {field(
                    "ceremonyTime",
                    "Waktu acara",
                    80,
                    "Contoh: 09.00 WIB",
                  )}
                </div>
              </div>
              <div className="event-group">
                <h3>
                  <span>2</span>Acara kedua
                </h3>
                <div className="two-columns">
                  {field("receptionTitle", "Nama acara", 80, "Resepsi")}
                  {field(
                    "receptionTime",
                    "Waktu acara",
                    80,
                    "Contoh: 11.00–13.00 WIB",
                  )}
                </div>
              </div>
              <p className="help">
                Waktu kosong ditampilkan sebagai “Waktu akan diinformasikan”.
              </p>
            </section>
            <section className="panel">
              <div className="section-heading">
                <h2>Hitung Mundur</h2>
              </div>
              <div className="countdown-field">
                {field(
                  "countdownTime",
                  "Waktu tujuan hitung mundur (WIB)",
                  5,
                  "",
                  false,
                  "time",
                )}
              </div>
              <p className="help">
                Menuju 22 November 2026. Jika kosong, memakai pukul 00.00 WIB.
              </p>
            </section>
            <section className="panel">
              <div className="section-heading">
                <h2>Lokasi Acara</h2>
              </div>
              {field(
                "mapEmbedUrl",
                "URL embed Google Maps",
                4096,
                "https://www.google.com/maps/embed?pb=…",
                true,
              )}
              <p className="help">
                Di Google Maps, pilih Bagikan, lalu Sematkan peta. Dari kode yang
                muncul, salin alamat di dalam tanda kutip setelah src=.
                Contoh: https://www.google.com/maps/embed?pb=…
              </p>
              <div className="map-preview">
                {mapPreview ? (
                  <iframe
                    src={mapPreview}
                    title="Pratinjau peta lokasi acara"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <p>
                    Tambahkan URL embed Google Maps untuk melihat pratinjau
                    peta.
                  </p>
                )}
              </div>
            </section>
            <section className="panel gift-panel">
              <div className="section-heading">
                <div>
                  <h2>Informasi Hadiah</h2>
                  <p>
                    Tampilkan rekening atau alamat pengiriman hadiah pada
                    undangan.
                  </p>
                </div>
                <div className="gift-controls">
                  <span className="tag">
                    {giftAccounts.length}/10 informasi
                  </span>
                  <button
                    className={`gift-switch${giftEnabled ? " is-on" : ""}`}
                    type="button"
                    role="switch"
                    aria-checked={giftEnabled}
                    aria-label="Tampilkan bagian hadiah"
                    onClick={() => {
                      setGiftEnabled(!giftEnabled);
                      setDirty(true);
                    }}
                  >
                    <span>{giftEnabled ? "ON" : "OFF"}</span>
                    <i aria-hidden="true" />
                  </button>
                </div>
              </div>
              {!giftEnabled && (
                <p className="info-note">
                  Bagian hadiah disembunyikan pada undangan. Data tetap
                  tersedia; aktifkan untuk mengubah isian.
                </p>
              )}
              <fieldset disabled={!giftEnabled} className="gift-fields">
                {giftAccounts.map((item, index) => (
                  <article className="gift-card" key={index}>
                    <div className="gift-card-heading">
                      <div>
                        <span className="tag">Informasi {index + 1}</span>
                        <label>
                          Jenis informasi
                          <select
                            value={item.type}
                            onChange={(e) =>
                              changeGiftType(index, e.target.value)
                            }
                            aria-label={`Jenis informasi hadiah ${index + 1}`}
                          >
                            <option value="account">Rekening</option>
                            <option value="address">Alamat pengiriman</option>
                          </select>
                        </label>
                      </div>
                      <button
                        type="button"
                        className="quiet danger"
                        onClick={() => {
                          setGiftAccounts(
                            giftAccounts.filter((_, i) => i !== index),
                          );
                          setDirty(true);
                        }}
                        aria-label={`Hapus informasi hadiah ${index + 1}`}
                      >
                        Hapus
                      </button>
                    </div>
                    {item.type === "account" ? (
                      <div className="account-fields">
                        <label>
                          Nama bank
                          <input
                            required
                            value={item.bank}
                            maxLength={80}
                            onChange={(e) =>
                              updateGift(index, {
                                ...item,
                                bank: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Nomor rekening
                          <input
                            required
                            value={item.number}
                            maxLength={40}
                            pattern="[0-9 ]+"
                            inputMode="numeric"
                            onChange={(e) =>
                              updateGift(index, {
                                ...item,
                                number: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Nama pemilik rekening
                          <input
                            required
                            value={item.owner}
                            maxLength={120}
                            onChange={(e) =>
                              updateGift(index, {
                                ...item,
                                owner: e.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="address-fields">
                        <div className="two-columns">
                          <label>
                            Nama penerima
                            <input
                              required
                              value={item.recipient}
                              maxLength={120}
                              onChange={(e) =>
                                updateGift(index, {
                                  ...item,
                                  recipient: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            Nomor kontak (opsional)
                            <input
                              type="tel"
                              value={item.phone}
                              maxLength={40}
                              onChange={(e) =>
                                updateGift(index, {
                                  ...item,
                                  phone: e.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
                        <label>
                          Alamat lengkap pengiriman
                          <textarea
                            required
                            value={item.address}
                            maxLength={1000}
                            rows={3}
                            onChange={(e) =>
                              updateGift(index, {
                                ...item,
                                address: e.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                    )}
                  </article>
                ))}
                {!giftAccounts.length && (
                  <p className="empty">Belum ada informasi hadiah.</p>
                )}
                <button
                  className="add-gift"
                  type="button"
                  disabled={giftAccounts.length >= 10}
                  onClick={() => {
                    setGiftAccounts([
                      ...giftAccounts,
                      { type: "account", bank: "", number: "", owner: "" },
                    ]);
                    setDirty(true);
                  }}
                >
                  + Tambah informasi hadiah
                </button>
              </fieldset>
            </section>
          </fieldset>
          <div className="form-footer">
            <button className="primary" disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan detail acara"}
            </button>
            <p className="save-state" role="status">
              {busy
                ? "Menyimpan…"
                : dirty
                  ? "Perubahan belum disimpan"
                  : "Pengaturan tersimpan"}
            </p>
          </div>
        </>
      )}
    </form>
  );
}
function App() {
  const [session, setSession] = useState<Session>(),
    [loading, setLoading] = useState(true),
    [guests, setGuests] = useState<Guest[]>([]),
    [content, setContent] = useState<Content>(),
    [page, setPage] = useState<Page>(currentPage),
    [status, setStatus] = useState<{ message: string; error: boolean }>(),
    [navigation, setNavigation] = useState(false),
    [editor, setEditor] = useState<{ guest: Guest | null }>(),
    [newLink, setNewLink] = useState(""),
    [manualLink, setManualLink] = useState(""),
    [loggingOut, setLoggingOut] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    message: string;
    title: string;
    action: string;
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
  // shortcut: guests load in one request; move paging to the API if loading the full list becomes slow.
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
      : "weddinvita — Masuk ke akun";
  }, [session, page]);
  const confirm: Confirm = (message, title, action) =>
    new Promise((resolve) => {
      pendingConfirmation.current = resolve;
      setConfirmation({ message, title, action });
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
      document.querySelector("#new-link")?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "center",
      }),
    );
  }
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
            <aside className="sidebar" aria-label="Navigasi portal undangan">
              <Brand />
              <Navigation page={page} />
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
              <div className="account-context">
                <span>Undangan pernikahan</span>
                <span title={session.account.tenant.name}>
                  {session.account.tenant.name}
                </span>
              </div>
              <main id="main-content">
                <div hidden={page !== "tamu"}>
                  <GuestsPage
                    guests={guests}
                    template={
                      typeof content.settings.whatsappTemplate === "string"
                        ? content.settings.whatsappTemplate
                        : defaultWhatsappTemplate
                    }
                    api={api}
                    refresh={refreshGuests}
                    confirm={confirm}
                    copy={copy}
                    showLink={showLink}
                    newLink={newLink}
                    dismissLink={() => setNewLink("")}
                    edit={(guest) => setEditor({ guest })}
                    add={() => setEditor({ guest: null })}
                    notice={notice}
                  />
                </div>
                <section
                  id="page-pesan"
                  className="page"
                  aria-labelledby="whatsapp-title"
                  hidden={page !== "pesan"}
                >
                  <SettingsForm
                    kind="messages"
                    content={content}
                    api={api}
                    onContent={setContent}
                    notice={notice}
                    account={session.account}
                    confirm={confirm}
                    previewMedia={mediaCard("preview", "Gambar pratinjau WhatsApp")}
                  />
                </section>
                <section
                  id="page-media"
                  className="page"
                  aria-labelledby="media-title"
                  hidden={page !== "media"}
                >
                  <header className="page-heading">
                    <div>
                      <h1 id="media-title" tabIndex={-1}>
                        Foto &amp; Lagu
                      </h1>
                      <p>
                        Kelola foto mempelai, galeri kenangan, dan musik latar
                        undangan.
                      </p>
                    </div>
                  </header>
                  <p className="info-note">
                    Foto JPG, PNG, WebP maksimal 12 MB diperkecil otomatis. Lagu
                    MP3 maksimal 25 MB. Pilih berkas, lalu tekan Unggah.
                  </p>
                  <section
                    className="media-section"
                    aria-labelledby="couple-title"
                  >
                    <div className="section-heading">
                      <h2 id="couple-title">Foto Mempelai</h2>
                      <span className="muted">2 slot foto</span>
                    </div>
                    <div id="couple-media" className="media-grid couple-grid">
                      {mediaCard("groom", "Foto mempelai pertama")}
                      {mediaCard("bride", "Foto mempelai kedua")}
                    </div>
                  </section>
                  <section
                    className="media-section"
                    aria-labelledby="gallery-title"
                  >
                    <div className="section-heading">
                      <h2 id="gallery-title">Galeri Foto Undangan</h2>
                      <span className="tag">
                        {
                          Array.from(
                            { length: 9 },
                            (_, i) => content.media[`gallery${i + 1}`],
                          ).filter(Boolean).length
                        }
                        /9 terpasang
                      </span>
                    </div>
                    <div id="gallery-media" className="media-grid gallery-grid">
                      {Array.from({ length: 9 }, (_, i) =>
                        mediaCard(`gallery${i + 1}`, `Galeri ${i + 1}`),
                      )}
                    </div>
                  </section>
                  <section
                    className="media-section"
                    aria-labelledby="music-title"
                  >
                    <div className="section-heading">
                      <h2 id="music-title">Musik Latar Belakang (MP3)</h2>
                    </div>
                    <div id="music-media">
                      {mediaCard("music", "Lagu undangan")}
                    </div>
                  </section>
                </section>
                <section
                  id="page-acara"
                  className="page"
                  aria-labelledby="event-settings-title"
                  hidden={page !== "acara"}
                >
                  <header className="page-heading">
                    <div>
                      <h1 id="event-settings-title" tabIndex={-1}>
                        Detail Acara
                      </h1>
                      <p>
                        Kelola informasi mempelai, keluarga, waktu rangkaian
                        acara, lokasi, dan hadiah.
                      </p>
                    </div>
                  </header>
                  <SettingsForm
                    kind="event"
                    content={content}
                    api={api}
                    onContent={(c) => {
                      setContent(c);
                      void refreshGuests().catch(() =>
                        notice("Gagal memuat ulang daftar tamu.", true),
                      );
                    }}
                    notice={notice}
                    account={session.account}
                    confirm={confirm}
                  />
                </section>
              </main>
              <footer className="workspace-footer">weddinvita</footer>
            </div>
          </div>
        )
      )}
      {status && (
        <div
          id="status"
          role={status.error ? "alert" : "status"}
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
          <div className="section-heading">
            <h2 id="navigation-title">Menu Undangan</h2>
            <button
              className="icon-button quiet"
              type="button"
              aria-label="Tutup menu"
              onClick={() => setNavigation(false)}
            >
              ×
            </button>
          </div>
          <Navigation page={page} close={() => setNavigation(false)} />
          {footer}
        </Modal>
      )}
      {editor && (
        <GuestEditor
          guest={editor.guest}
          api={api}
          onClose={() => setEditor(undefined)}
          onSaved={(result) => {
            if (result.link) showLink(result.link);
            notice(editor.guest ? "Data tamu disimpan." : "Tamu ditambahkan.");
            void refreshGuests().catch(() =>
              notice("Tamu tersimpan. Muat ulang daftar untuk melihat perubahan.", true),
            );
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
            <h2 id="confirm-title">{confirmation.title}</h2>
            <p id="confirm-message">{confirmation.message}</p>
            <div className="dialog-actions">
              <button value="cancel" autoFocus>
                Batal
              </button>
              <button value="confirm" className="primary">
                {confirmation.action}
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
            <h2 id="copy-title">Salin tautan undangan</h2>
            <p>
              Tautan belum dapat disalin otomatis. Silakan salin tautan di bawah.
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
