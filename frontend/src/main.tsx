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
  whatsappTokens,
  whatsappEvent,
} from "../whatsapp.js";
import { guestSummary, queryGuests, mediaType, updateSelectedGuests } from "../admin-data.js";
import { importRows, saveImportedGuests } from "../guest-import.js";
import { defaultEventDate, defaultVenueName, eventDateLabels } from "../event.js";
import type {
  Account,
  Billing,
  Payment,
  Session,
  Guest,
  Content,
  GiftOption,
  API,
  Confirm,
} from "./types";
import "../admin.css";
import "../studio.css";

const pages = {
  tamu: "Tamu Undangan",
  pesan: "Pesan & Preview",
  media: "Foto & Lagu",
  acara: "Detail Acara",
};
type Page = keyof typeof pages;
type EventContext = ReturnType<typeof whatsappEvent>;
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
  <a className="brand" href="#tamu" aria-label="weddinvita — Tamu Undangan">weddinvita</a>
);
type EditorSection = { id: string; title: string; short: string };
const eventSections: EditorSection[] = [
  {id:"pasangan",title:"Pasangan & keluarga",short:"Nama mempelai dan orang tua"},
  {id:"waktu",title:"Acara & waktu",short:"Tanggal, rangkaian, countdown"},
  {id:"lokasi",title:"Lokasi acara",short:"Tempat dan Google Maps"},
  {id:"hadiah",title:"Hadiah",short:"Rekening atau alamat pengiriman"},
  {id:"akses",title:"Akses undangan",short:"Pengaturan limit akses"},
];
const messageSections: EditorSection[] = [
  {id:"template",title:"Pesan WhatsApp",short:"Template dan token tamu"},
  {id:"link",title:"Pratinjau tautan",short:"Judul, deskripsi, dan gambar"},
];
const mediaSections: EditorSection[] = [
  {id:"couple",title:"Foto pasangan",short:"Dua foto mempelai"},
  {id:"gallery",title:"Galeri undangan",short:"Sembilan slot foto"},
  {id:"music",title:"Lagu undangan",short:"Musik latar acara"},
];
function SectionNavigation({sections, current, onChange, prefix, disabled = false}: {
  sections: EditorSection[]; current: string; onChange: (id:string)=>void; prefix:string; disabled?:boolean;
}) {
  return <nav className="event-section-nav" aria-label="Bagian pengaturan">
    <p className="event-nav-title">Informasi undangan</p>
    <label className="event-mobile-select">Bagian yang diatur
      <select id={`${prefix}-section-select`} value={current} onChange={e=>onChange(e.target.value)} disabled={disabled}>
        {sections.map(section=><option key={section.id} value={section.id}>{section.title}</option>)}
      </select>
    </label>
    <div className="event-section-buttons">{sections.map(section=><button key={section.id} type="button" data-section={section.id}
      disabled={disabled} aria-current={current===section.id ? "step" : undefined} aria-controls={`${prefix}-part-${section.id}`}
      onClick={()=>onChange(section.id)}><span>{section.title}</span><small>{section.short}</small></button>)}</div>
    <p className="event-nav-help">Pilih bagian yang ingin Anda atur. Isian tetap ada saat berpindah bagian.</p>
  </nav>;
}
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
  const [registering,setRegistering]=useState(location.hash==="#register");
  const [recovering,setRecovering]=useState(false);
  const [message,setMessage]=useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      if(recovering){
        await api("/api/admin/password-reset","POST",Object.fromEntries(new FormData(form)));
        setMessage("Jika alamat ini memiliki akun Firebase Weddinvita, tautan pemulihan akan dikirim. Periksa inbox dan spam. Untuk akun lama yang belum dimigrasikan, hubungi support@weddinvita.id.");
        return;
      }
      const session = await api<Session>(
        registering ? "/api/admin/register" : "/api/admin/login",
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
          weddinvita
        </a>
        <div className="login-statement">
          <h1 id="login-story-title">
            Siapkan
            <br />
            undangan Anda
          </h1>
          <p>
            Atur detail acara, bagikan undangan, dan lihat konfirmasi tamu.
          </p>
        </div>
      </section>
      <section className="login-form-side">
        <div className="login-panel">
          <h2 id="login-title">{recovering ? "Atur ulang kata sandi" : registering ? "Buat akun undangan" : "Selamat datang"}</h2>
          <p>{recovering ? "Masukkan email akun Anda untuk meminta tautan pemulihan." : registering ? "Rp199.000 untuk akses 12 bulan. Buat akun, bayar dengan QRIS, lalu siapkan undangan Anda." : "Masuk untuk menyiapkan dan memantau undangan pernikahan Anda."}</p>
          {message && <p role="status" className="info-note">{message}</p>}
          <form id="login" onSubmit={submit} aria-busy={busy}>
            {error && (
              <p id="login-error" className="form-error" role="alert">
                {error}
              </p>
            )}
            {registering && <label>Nama pasangan<input name="name" required maxLength={120} autoComplete="name" placeholder="Contoh: Nama kedua mempelai" disabled={busy}/></label>}
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
            {!recovering && <label>
              Kata sandi
              <input
                name="password"
                type="password"
                autoComplete={registering ? "new-password" : "current-password"}
                required
                maxLength={1024}
                minLength={registering ? 8 : undefined}
                pattern={registering ? "(?=.*[A-Z])(?=.*[0-9])(?=.*[\\x21-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\x7e]).{8,1024}" : undefined}
                aria-describedby={registering ? "password-requirements" : undefined}
                placeholder={registering ? "8+ karakter, kapital, angka dan simbol" : "Masukkan kata sandi"}
                disabled={busy}
              />
              {registering && <span id="password-requirements" className="help">Minimal 8 karakter, satu huruf kapital (A–Z), satu angka (0–9), dan satu simbol seperti !, @, atau #.</span>}
            </label>}
            {registering && <label className="legal-consent"><input type="checkbox" name="acceptedTerms" value="2026-10-28" required disabled={busy}/><span>Saya menyetujui <a href="/terms" target="_blank" rel="noopener">Syarat Layanan</a>, termasuk kebijakan No Refund dengan hak konsumen yang tetap berlaku, dan telah membaca <a href="/privacy" target="_blank" rel="noopener">Kebijakan Privasi</a>.</span></label>}
            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Memeriksa…" : recovering ? "Kirim tautan pemulihan" : registering ? "Buat akun & lanjut bayar" : "Masuk ke akun"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="login-help">{recovering ? "Sudah ingat kata sandinya?" : registering ? "Sudah punya akun?" : "Belum punya akun?"} <button type="button" className="auth-switch" disabled={busy} onClick={()=>{setRegistering(recovering ? false : !registering);setRecovering(false);setError("");setMessage("");history.replaceState(null,"",registering || recovering ? "#masuk" : "#register");}}>{recovering || registering ? "Masuk" : "Buat akun"}</button></p>
          {!registering && !recovering && <p className="login-help"><button type="button" className="auth-switch" disabled={busy} onClick={()=>{setRecovering(true);setError("");setMessage("");}}>Lupa kata sandi?</button></p>}
          <p className="login-help"><a href="/terms">Syarat layanan</a> · <a href="/privacy">Privasi</a> · <a href="mailto:support@weddinvita.id">Bantuan</a></p>
        </div>
        <p className="login-footer">weddinvita</p>
      </section>
    </main>
  );
}
function VerificationScreen({api,session,onVerified,onLogout}:{api:API;session:Session;onVerified:(s:Session)=>Promise<void>;onLogout:()=>void}){
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(session.emailSent===false ? "Email verifikasi belum terkirim. Gunakan tombol Kirim ulang email untuk mencoba lagi." : "Buka tautan verifikasi di email Anda, lalu periksa status di sini. Periksa folder spam jika belum terlihat.");
  async function check(){setBusy(true);setError("");try{const s=await api<Session>("/api/admin/session");if(!s.account.verificationRequired)await onVerified(s);else setMessage("Email belum terverifikasi. Buka tautan verifikasi yang dikirim ke alamat akun Anda.");}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
  async function resend(){setBusy(true);setError("");try{await api("/api/admin/verification-email","POST",{});setMessage("Email verifikasi dikirim. Periksa inbox dan spam, lalu pilih Saya sudah verifikasi.");}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
  return <main className="billing-screen"><section className="panel billing-panel" aria-labelledby="verification-title"><a href="/" className="login-wordmark">weddinvita</a><h1 id="verification-title">Verifikasi email Anda</h1><p>Alamat akun: <strong>{session.account.email}</strong></p><p>Verifikasi diperlukan sebelum pembayaran dan akses undangan.</p><p role="status">{message}</p>{error && <p role="alert" className="form-error">{error}</p>}<button className="primary" disabled={busy} onClick={check}>Saya sudah verifikasi · Periksa status</button><button disabled={busy} onClick={resend}>Kirim ulang email</button><a href="mailto:support@weddinvita.id">Hubungi bantuan</a><button className="auth-switch" disabled={busy} onClick={onLogout}>Keluar dari akun</button></section></main>;
}
function BillingScreen({api, onActivated, onLogout}: {api:API;onActivated:(s:Session)=>Promise<void>;onLogout:()=>void}) {
  const [billing,setBilling]=useState<Billing>();
  const [initialChecked,setInitialChecked]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const activated=useRef(onActivated); activated.current=onActivated;
  useEffect(()=>{
    let live=true,checking=false;
    const check=async()=>{
      if(checking)return;checking=true;
      try {
        const value=await api<Billing>("/api/admin/billing/refresh","POST",{});
        if(!live)return;
        setBilling(value);setError("");
        if(value.subscription.active)await activated.current(await api<Session>("/api/admin/session"));
      }catch(e){if(live)setError(errorMessage(e));}finally{checking=false;if(live)setInitialChecked(true);}
    };
    api<Billing>("/api/admin/billing").then(v=>{if(live)setBilling(v);}).catch(e=>{if(live)setError(errorMessage(e));});
    void check(); const timer=setInterval(check,20000);
    return ()=>{live=false;clearInterval(timer);};
  },[api]);
  async function pay(){
    setBusy(true);setError("");
    try{const p=await api<Payment>("/api/admin/billing/payments","POST",{});if(!p.checkoutUrl)throw new Error("Pembayaran sedang disiapkan. Coba lagi sebentar.");location.assign(p.checkoutUrl);}
    catch(e){setError(errorMessage(e));setBusy(false);}
  }
  async function refresh(){setBusy(true);setError("");try{const b=await api<Billing>("/api/admin/billing/refresh","POST",{});setBilling(b);if(b.subscription.active)await onActivated(await api<Session>("/api/admin/session"));}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
  if(!initialChecked) return <main className="billing-screen"><p role="status">Memeriksa status pembayaran…</p></main>;
  const expired=!!billing?.subscription.expiresAt;
  const status=billing?.payment?.status;
  return <main className="billing-screen"><section className="panel billing-panel" aria-labelledby="billing-title">
    <a href="/" className="login-wordmark">weddinvita</a>
    <p className="eyebrow">{expired ? "Perpanjang undangan Anda" : "Akun Anda sudah dibuat"}</p>
    <h1 id="billing-title">{expired ? "Aktifkan kembali akses Anda" : "Satu langkah lagi menuju undangan Anda"}</h1>
    <p>Bayar dengan QRIS melalui Midtrans. Akses dashboard dan undangan aktif setelah pembayaran terkonfirmasi.</p>
    <div className="billing-price"><strong>Rp199.000</strong><span>Akses 12 bulan sejak pembayaran dikonfirmasi</span></div>
    <ul><li>Kelola detail acara, foto, musik, dan tamu</li><li>Tautan undangan personal dan pembatasan browser</li><li>Konfirmasi kehadiran dan ucapan tamu</li></ul>
    <p>Tidak ada tagihan otomatis.</p>
    {billing?.available===false && <p role="status">Pembayaran sedang disiapkan. Silakan coba lagi nanti.</p>}
    {status && <p role="status">Status pembayaran: {({creating:"sedang disiapkan",pending:"menunggu pembayaran",settlement:"terkonfirmasi",expire:"kedaluwarsa",cancel:"dibatalkan",deny:"ditolak",failure:"belum berhasil",refund:"dikembalikan",partial_refund:"dikembalikan sebagian"} as Record<string,string>)[status] || status}.</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <button className="primary" onClick={pay} disabled={busy || !billing?.available}>{busy ? "Memproses…" : "Bayar Rp199.000 dengan QRIS"}</button>
    <button onClick={refresh} disabled={busy}>Saya sudah bayar · Periksa status</button>
    <button className="auth-switch" onClick={onLogout} disabled={busy}>Keluar dari akun</button>
  </section></main>;
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
          Setiap undangan memiliki tautan pribadi. Jumlah Limit Akses mengikuti
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
            Jumlah Limit Akses
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
function GuestImport({api, refresh, onClose}: {api: API; refresh: () => Promise<void>; onClose: () => void}) {
  const [guests, setGuests] = useState<{name: string; phone: string}[]>([]);
  const [busy, setBusy] = useState(false), [reading, setReading] = useState(false);
  const [error, setError] = useState(""), [saved, setSaved] = useState(0);
  async function read(file?: File) {
    setGuests([]);
    setError("");
    setSaved(0);
    if (!file) return;
    setReading(true);
    try {
      if (!/\.xlsx$/i.test(file.name) || file.size > 5 * 1024 * 1024)
        throw new Error("Pilih file Excel .xlsx, maksimal 5 MB.");
      const {readSheet} = await import("read-excel-file/browser");
      setGuests(importRows(await readSheet(file, 1)));
    } catch (e) {
      setError(`File belum dapat dibaca. ${errorMessage(e)}`);
    } finally {
      setReading(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!guests.length || busy || reading) return;
    setBusy(true);
    setError("");
    const result = await saveImportedGuests(guests,
      (guest: {name: string; phone: string}) => api("/api/admin/guests", "POST", guest), (count: number) => setSaved(saved + count));
    setGuests(guests.slice(result.saved));
    let message = result.error ? `Import berhenti: ${errorMessage(result.error)} Periksa daftar tamu sebelum melanjutkan agar tidak ada duplikat.` : "";
    try { await refresh(); } catch (e) { message += ` Daftar belum diperbarui: ${errorMessage(e)} Muat ulang halaman.`; }
    setError(message);
    setBusy(false);
  }
  return <Modal className="editor-dialog" label="guest-import-title" onClose={onClose} busy={busy || reading}>
    <form onSubmit={submit}>
      <h2 id="guest-import-title">Import Excel</h2>
      <p>Gunakan sheet pertama dengan judul kolom <strong>Nama</strong> dan <strong>WhatsApp</strong>. Nama wajib diisi; WhatsApp boleh kosong. Baris kosong dilewati. Maksimal 1.000 tamu.</p>
      <p className="help">Isi WhatsApp dengan angka berawalan kode negara, misalnya 628123456789. Kolom pada template memakai format angka tanpa desimal. Import menambah tamu baru, termasuk nama yang sudah ada.</p>
      <p><a href="/assets/template-tamu.xlsx" download="template-tamu.xlsx">Download template Excel</a></p>
      <label>File Excel (.xlsx, maksimal 5 MB)
        <input type="file" accept=".xlsx" disabled={busy || reading} onChange={e => { void read(e.target.files?.[0]); }} />
      </label>
      {reading && <p role="status">Membaca file…</p>}
      {guests.length > 0 && <div>
        <p>{guests.length} tamu siap diimport. Pratinjau {Math.min(5, guests.length)} baris pertama:</p>
        <ul>{guests.slice(0, 5).map((guest, i) => <li key={i}>{guest.name} — {guest.phone || "Tanpa WhatsApp"}</li>)}</ul>
      </div>}
      {saved > 0 && <p role="status">{saved} tamu berhasil diimport.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button type="button" onClick={onClose} disabled={busy || reading}>Tutup</button>
        <button className="primary" disabled={busy || reading || !guests.length}>{busy ? "Mengimport…" : "Import tamu"}</button>
      </div>
    </form>
  </Modal>;
}
function GuestRow({
  guest,
  template,
  event,
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
  event: EventContext;
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
                href={whatsappUrl(template, guest, event)}
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
  event,
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
  event: EventContext;
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
  const [importOpen, setImportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  async function exportGuests() {
    setExportBusy(true);
    try {
      const {guestExport} = await import('../guest-export.js');
      const buffer = await guestExport(guests, template, event);
      const url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'daftar-tamu.xlsx';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notice(`${guests.length} tamu diexport. Status kirim dimulai dari false dan dapat diubah di Excel.`);
    } catch (e) {
      notice(errorMessage(e), true);
    } finally {
      setExportBusy(false);
    }
  }
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
  async function setActive(active: boolean | null) {
    if (!selected.length) return;
    const ids = [...selected];
    setBulkBusy(true);
    setBulkProgress(0);
    try {
      if (
        !(await confirm(
          active === null
            ? `Hapus ${ids.length} tamu yang dipilih beserta tautan, seluruh akses, konfirmasi, dan ucapannya? Data tidak dapat dipulihkan.`
            : active
            ? `${ids.length} undangan yang dipilih dapat kembali dibuka.`
            : `${ids.length} undangan yang dipilih tidak dapat dibuka dan semua akses saat ini dihentikan. Data tetap tersimpan.`,
          active === null ? `Hapus ${ids.length} tamu?` : `${active ? "Aktifkan" : "Nonaktifkan"} ${ids.length} undangan?`,
          active === null ? "Hapus tamu" : active ? "Aktifkan undangan" : "Nonaktifkan undangan",
        ))
      )
        return;
      const {done, error} = await updateSelectedGuests(ids, active, api, setBulkProgress);
      let failed = error ? errorMessage(error) : "";
      try {
        await refresh();
      } catch (e) {
        failed = failed || errorMessage(e);
      }
      setSelected([]);
      notice(
        failed
          ? `${done} dari ${ids.length} undangan ${active === null ? "dihapus" : "diperbarui"}. ${failed}`
          : active === null ? `${done} tamu berhasil dihapus.` : `Status ${done} undangan disimpan.`,
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
          <div className="guest-heading-actions">
          <button type="button" onClick={exportGuests} disabled={bulkBusy || exportBusy || !guests.length} title="Export seluruh tamu; status kirim dilacak di Excel">{exportBusy ? 'Mengexport…' : 'Export Excel'}</button>
          <button type="button" onClick={() => setImportOpen(true)} disabled={bulkBusy}>Import Excel</button>
          <button
            id="add-guest"
            className="primary"
            type="button"
            onClick={add}
            disabled={bulkBusy}
          >
            + Tambah tamu
          </button>
          </div>
        </header>
        {importOpen && <GuestImport api={api} refresh={refresh} onClose={() => setImportOpen(false)} />}
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
            ["Perkiraan orang hadir", summary.people, "people"],
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
                className="danger"
                type="button"
                disabled={bulkBusy}
                onClick={() => setActive(null)}
              >
                Hapus tamu
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
                  Memproses {bulkProgress}/{selected.length}…
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
                <th scope="col">Limit</th>
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
                  event={event}
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
            Limit
            <select
              value={devices}
              onChange={(e) => {
                setDevices(e.target.value);
                resetPage();
              }}
            >
              <option value="all">Semua limit</option>
              <option value="full">Batas tercapai</option>
              <option value="unused">Belum digunakan</option>
            </select>
          </label>
          <p className="help">
            Jumlah Limit Akses mengikuti pengaturan global dan pengecualian per
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
type MediaState = { busy:boolean; label:string };
function MediaPage({content, api, onContent, confirm, notice, active}: {
  content:Content;api:API;onContent:(c:Content)=>void;confirm:Confirm;notice:(message:string,error?:boolean)=>void;active:boolean;
}) {
  const [part,setPart]=useState("couple");
  const [slot,setSlot]=useState("gallery1");
  const [states,setStates]=useState<Record<string,MediaState>>({});
  const [dialogOpen,setDialogOpen]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const galleryBusy=Object.entries(states).some(([key,state])=>key.startsWith("gallery") && state.busy);
  const reportState=useCallback((key:string,state:MediaState)=>setStates(previous=>({...previous,[key]:state})),[]);
  const closeGallery=useCallback(()=>{
    if(matchMedia("(max-width:899px)").matches) dialog.current?.close();
    setDialogOpen(false);
    if(trigger.current?.checkVisibility()) trigger.current.focus();
  },[]);
  useEffect(()=>{
    const query=matchMedia("(max-width:899px)");
    const sync=()=>{
      const element=dialog.current!;
      if(element.open) element.close();
      if(!query.matches && active && part==="gallery") element.show();
      setDialogOpen(false);
    };
    sync();query.addEventListener("change",sync);
    return()=>query.removeEventListener("change",sync);
  },[active,part]);
  function showPart(id:string) {
    setPart(id);
    requestAnimationFrame(()=>document.getElementById(`media-part-${id}`)?.querySelector<HTMLElement>("h2")?.focus());
  }
  const card=(key:string,title:string,compact=false)=><MediaCard key={key} slot={key} title={title} src={content.media[key]} api={api} onContent={onContent} confirm={confirm} notice={notice} compact={compact} active={active && part==="music"} onStateChange={reportState}/>;
  return <>
    <header className="page-heading"><div><h1 id="media-title" tabIndex={-1}>Foto &amp; Lagu</h1><p>Foto pasangan, koleksi galeri, dan musik. Kelola satu per satu dengan jelas.</p></div></header>
    <p className="media-format-note">2 foto pasangan · 9 foto galeri · 1 lagu. Foto JPG, PNG, WebP maksimal 12 MiB. Audio MP3, M4A, AAC, WAV, OGG/Opus, FLAC, WebM maksimal 25 MiB. Pilih berkas, lalu Unggah.</p>
    <div className="settings-workspace media-workspace">
      <SectionNavigation sections={mediaSections} current={part} onChange={showPart} prefix="media" disabled={galleryBusy && dialogOpen}/>
      <div className="media-content-column">
        <section id="media-part-couple" hidden={part!=="couple"}>
          <div className="section-heading"><h2 tabIndex={-1}>Foto pasangan</h2><span className="muted">2 slot foto</span></div>
          <div id="couple-media" className="media-grid couple-grid">{card("groom","Foto mempelai pertama",true)}{card("bride","Foto mempelai kedua",true)}</div>
        </section>
        <section id="media-part-gallery" hidden={part!=="gallery"}>
          <div className="section-heading"><h2 tabIndex={-1}>Galeri undangan</h2><span className="tag">{Array.from({length:9},(_,i)=>content.media[`gallery${i+1}`]).filter(Boolean).length}/9 terpasang</span></div>
          <div className="gallery-workbench">
            <div className="gallery-tile-grid" role="group" aria-label="Sembilan slot galeri">{Array.from({length:9},(_,i)=>{
              const key=`gallery${i+1}`;
              return <button key={key} type="button" className="gallery-tile" data-gallery-slot={key} aria-pressed={slot===key} disabled={galleryBusy}
                aria-controls="gallery-slot-dialog" onClick={e=>{
                  setSlot(key); trigger.current=e.currentTarget;
                  if(matchMedia("(max-width:899px)").matches){dialog.current?.showModal();setDialogOpen(true);}
                  requestAnimationFrame(()=>dialog.current?.querySelector<HTMLElement>(`[data-gallery-editor="${key}"] h3`)?.focus());
                }}>
                <span className="gallery-tile-image">{content.media[key] ? <img src={content.media[key]} alt=""/> : <NavIcon index={2}/>}</span>
                <span className="gallery-tile-caption"><strong>Foto {i+1}</strong><span>{states[key]?.label || "Belum diunggah"}</span></span>
              </button>;
            })}</div>
            <dialog ref={dialog} className="gallery-slot-dialog" id="gallery-slot-dialog" aria-labelledby="gallery-dialog-title"
              onCancel={e=>{if(galleryBusy)e.preventDefault();}} onClose={()=>{setDialogOpen(false);if(trigger.current?.checkVisibility())trigger.current.focus();}}>
              <div className="dialog-heading"><h2 id="gallery-dialog-title">Kelola foto galeri</h2><button type="button" disabled={galleryBusy} onClick={closeGallery} aria-label="Tutup editor foto">Tutup</button></div>
              {Array.from({length:9},(_,i)=>{const key=`gallery${i+1}`;return <div key={key} data-gallery-editor={key} hidden={slot!==key}>{card(key,`Galeri ${i+1}`)}</div>;})}
            </dialog>
          </div>
        </section>
        <section id="media-part-music" hidden={part!=="music"}>
          <div className="section-heading"><h2 tabIndex={-1}>Lagu undangan</h2></div>
          <div id="music-media">{card("music","Lagu undangan")}</div>
        </section>
      </div>
    </div>
  </>;
}
function MediaCard({
  slot,
  title,
  src,
  api,
  onContent,
  confirm,
  notice,
  compact = false,
  active = true,
  onStateChange,
}: {
  compact?: boolean;
  active?: boolean;
  onStateChange?: (slot:string, state:MediaState)=>void;
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
  const [expanded, setExpanded] = useState(false);
  useEffect(()=>{ if(!active) audio.current?.pause(); },[active]);
  useEffect(()=>{onStateChange?.(slot,{busy, label:busy ? "Memproses…" : error ? "Periksa berkas" : file ? "Berkas dipilih" : src ? "Terpasang" : "Belum diunggah"});},[slot,busy,error,file,src,onStateChange]);
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
      className={`media-card${music ? " music-card" : ""}${compact ? " couple-photo-card" : ""}`}
      data-slot={slot}
      aria-busy={busy}
    >
      <h3 tabIndex={-1}>
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
          <NavIcon index={music ? 1 : 2} />
          <span>{music ? "Belum ada lagu" : "Belum ada foto"}</span>
        </div>
      )}
      {compact && <button type="button" className="couple-edit-button" disabled={busy} aria-expanded={expanded} aria-controls={`media-controls-${slot}`} onClick={()=>setExpanded(!expanded)}>{expanded ? "Tutup editor" : "Kelola foto"}</button>}
      <div className="media-controls" id={`media-controls-${slot}`} hidden={compact && !expanded}>
      <label className="file-picker">
        <span>{music ? "Pilih audio" : "Pilih foto"}</span>
        <input
          type="file"
          ref={input}
          accept={
            music
              ? "audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/ogg,audio/flac,audio/webm,.mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.flac,.webm"
              : "image/jpeg,image/png,image/webp"
          }
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
      </div>
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
    eventDate: textSetting("eventDate", defaultEventDate),
    venueName: textSetting("venueName", ""),
    partnerOneName: textSetting("partnerOneName", ""),
    partnerTwoName: textSetting("partnerTwoName", ""),
    partnerOneFather: textSetting("partnerOneFather", ""),
    partnerOneMother: textSetting("partnerOneMother", ""),
    partnerTwoFather: textSetting("partnerTwoFather", ""),
    partnerTwoMother: textSetting("partnerTwoMother", ""),
  }));
  const [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  const [part, setPart] = useState(kind === "messages" ? "template" : "pasangan");
  const [messageView, setMessageView] = useState("edit");
  const formRef = useRef<HTMLFormElement>(null);
  const sections = kind === "messages" ? messageSections : eventSections;
  const prefix = kind === "messages" ? "message" : "event";
  function showPart(id: string) {
    setPart(id);
    requestAnimationFrame(()=>{
      const target = document.getElementById(`${prefix}-part-${id}`);
      target?.querySelector<HTMLElement>("h2")?.focus({preventScroll:true});
      target?.scrollIntoView({block:"start", behavior:"instant"});
    });
  }
  useEffect(()=>{
    if(kind!=="event") return;
    const query=matchMedia("(min-width:1200px)");
    const update=()=>{const overview=formRef.current?.querySelector<HTMLDetailsElement>(".event-overview"); if(overview) overview.open=query.matches;};
    update();query.addEventListener("change",update);return()=>query.removeEventListener("change",update);
  },[kind]);
  const templateInput = useRef<HTMLTextAreaElement>(null);
  const [giftEnabled, setGiftEnabled] = useState(
    content.settings.giftEnabled !== "false",
  );
  const [giftAccounts, setGiftAccounts] = useState<GiftOption[]>(() =>
    Array.isArray(content.settings.giftAccounts)
      ? (content.settings.giftAccounts.map((item) =>
          item.type === "address" ? item : { ...item, type: "account" },
        ) as GiftOption[])
      : []
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
    const form = e.currentTarget;
    const template = templateInput.current;
    template?.setCustomValidity(template.value.includes("{link}") ? "" : "Sertakan {link} agar tamu menerima tautan undangannya.");
    const invalid = Array.from(form.elements).find((element) =>
      element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
        ? element.willValidate && !element.checkValidity() : false,
    ) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | undefined;
    if (invalid) {
      const section = invalid.closest<HTMLElement>("[data-settings-part]");
      if (section) setPart(section.dataset.settingsPart!);
      setMessageView("edit");
      requestAnimationFrame(()=>{ invalid.focus(); invalid.reportValidity(); });
      return;
    }
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
  const eventDate =
    (kind === "messages" ? textSetting("eventDate", defaultEventDate) : values.eventDate) || defaultEventDate;
  const venueName =
    (kind === "messages" ? textSetting("venueName", defaultVenueName) : values.venueName).trim() || defaultVenueName;
  const event = whatsappEvent(kind === "messages" ? content.settings : values);
  const previewTitle =
    values.linkPreviewTitle?.trim() ||
    `Undangan Pernikahan ${textSetting("partnerOneName", values.partnerOneName).trim().split(/\s+/)[0]} & ${textSetting("partnerTwoName", values.partnerTwoName).trim().split(/\s+/)[0]}`;
  const previewDescription =
    values.linkPreviewDescription?.trim() ||
    `${event.date} · ${event.venue}.`;
  const exampleLink = `${account.invitationOrigin}/u/AbCdEfGhIjKlMnOpQrStUvWxYz0`;
  return (
    <form
      id={kind === "messages" ? "whatsapp-settings" : "settings"}
      className={`settings-form ${kind === "messages" ? "messages-form" : "event-form"}`}
      ref={formRef}
      onFocusCapture={e=>{
        const field=e.target as HTMLElement;
        if(!field.matches("input,textarea,select")) return;
        requestAnimationFrame(()=>{
          const bar=formRef.current?.querySelector<HTMLElement>(".settings-save-bar.has-changes");
          const bounds=field.getBoundingClientRect();
          const bottom=bar && getComputedStyle(bar).position==="sticky" ? Math.min(bar.getBoundingClientRect().top-16,innerHeight-16) : innerHeight-16;
          if(bounds.bottom>bottom || bounds.top<16) field.scrollIntoView({block:"center",behavior:"instant"});
        });
      }}
      noValidate
      onSubmit={submit}
      aria-busy={busy}
    >
      {kind === "messages" ? (
        <>
          <header className="page-heading">
            <div>
              <h1 id="whatsapp-title" tabIndex={-1}>
                Pesan &amp; Preview
              </h1>
              <p>
                Atur template pesan WhatsApp dan tampilan pratinjau tautan
                undangan.
              </p>
            </div>
          </header>
          <div className="settings-workspace message-workspace" data-view={messageView}>
            <SectionNavigation sections={sections} current={part} onChange={showPart} prefix={prefix} disabled={busy}/>
            <div className="message-content-column">
              <div className="message-view-switch" role="group" aria-label="Tampilan pesan">
                <button type="button" aria-pressed={messageView==="edit"} onClick={()=>setMessageView("edit")}>Edit</button>
                <button type="button" aria-pressed={messageView==="preview"} onClick={()=>setMessageView("preview")}>Pratinjau final</button>
              </div>
              <div className="messages-layout">
            <div className="message-editor-pane">
            <fieldset disabled={busy} className="message-edit">
              <section className="panel" id="message-part-template" data-settings-part="template" hidden={part!=="template"}>
                <div className="section-heading">
                  <h2 tabIndex={-1}>Template pesan</h2>
                  <span className="tag">Wajib {"{link}"}</span>
                </div>
                <p>
                  Gunakan {"{nama}"} untuk nama tamu, {"{link}"} untuk tautan,
                  {"{tanggal}"} untuk tanggal acara utama, dan {"{tempat}"} untuk tempat utama.
                  Gunakan {"{jam_acara_1}"} untuk jam acara pertama dan {"{jam_acara_2}"} untuk jam acara kedua.
                  Tanggal, tempat, dan jam mengikuti Detail Acara. Sertakan {"{link}"} agar tamu dapat membuka undangannya.
                </p>
                <div className="token-list">
                  <span>Sisipkan informasi acara:</span>
                  {whatsappTokens.map(([key, label]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => insertToken(`{${key}}`)}
                      aria-label={`Sisipkan ${label}`}
                      title={`{${key}}`}
                    >
                      + {label}
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
              <section className="panel" id="message-part-link" data-settings-part="link" hidden={part!=="link"}>
                <div className="section-heading">
                  <h2 tabIndex={-1}>Pratinjau tautan</h2>
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
            </fieldset>
              <section className="panel thumbnail-panel" hidden={part!=="link"}>
                <div className="section-heading">
                  <h2>Gambar pratinjau WhatsApp</h2>
                </div>
                <p>
                  JPG, PNG, WebP maksimal 12 MB. Dipotong otomatis menjadi 1200
                  × 630 piksel dan dapat diakses publik untuk pratinjau WhatsApp.
                </p>
                {previewMedia}
              </section>
            </div>
            <aside
              className="panel preview-panel"
              aria-labelledby="message-preview-title"
            >
              <h2 id="message-preview-title">Pratinjau pesan WhatsApp final</h2>
              <p>Gambar, pratinjau tautan, dan seluruh pesan tampil bersama.</p>
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
                    }, event)}
                  </pre>
                </div>
              </div>
              <p className="info-note">
                Pilih Buka WhatsApp pada halaman Tamu Undangan. Periksa pesannya,
                lalu kirim dari WhatsApp.
              </p>
            </aside>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="event-editor-layout">
            <SectionNavigation sections={sections} current={part} onChange={showPart} prefix={prefix} disabled={busy}/>
            <fieldset disabled={busy} className="event-fields">
              <section className="event-part" id="event-part-pasangan" data-settings-part="pasangan" hidden={part!=="pasangan"}>
                <header className="event-part-heading"><h2 tabIndex={-1}>{eventSections.find(item=>item.id==="pasangan")!.title}</h2><p>{eventSections.find(item=>item.id==="pasangan")!.short}</p></header>
<section className="panel">
              <div className="section-heading">
                <h3>Mempelai</h3>
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
                <h3>Keluarga &amp; Orang Tua</h3>
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
              </section>
              <section className="event-part" id="event-part-waktu" data-settings-part="waktu" hidden={part!=="waktu"}>
                <header className="event-part-heading"><h2 tabIndex={-1}>{eventSections.find(item=>item.id==="waktu")!.title}</h2><p>{eventSections.find(item=>item.id==="waktu")!.short}</p></header>
<section className="panel">
              <div className="section-heading">
                <h3>Rangkaian Acara</h3>
              </div>
              {field("eventDate", "Tanggal acara utama", 10, "", false, "date")}
              <div className="event-group">
                <h3>
                  <span>1</span>Acara pertama
                </h3>
                <div className="two-columns">
                  {field("ceremonyTitle", "Nama acara", 80, "Akad Nikah")}
                  {field("ceremonyDate", "Tanggal acara pertama", 10, "", false, "date")}
                  {field("ceremonyVenue", "Tempat acara pertama", 160, "Kosongkan untuk memakai tempat utama")}
                  {field(
                    "ceremonyTime",
                    "Jam acara pertama",
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
                  {field("receptionDate", "Tanggal acara kedua", 10, "", false, "date")}
                  {field("receptionVenue", "Tempat acara kedua", 160, "Kosongkan untuk memakai tempat utama")}
                  {field(
                    "receptionTime",
                    "Jam acara kedua",
                    80,
                    "Contoh: 11.00–13.00 WIB",
                  )}
                </div>
              </div>
              <p className="help">
                Tanggal dan tempat tiap acara boleh berbeda. Jika dikosongkan, memakai tanggal acara utama dan tempat utama. Jam kosong ditampilkan sebagai “Waktu akan diinformasikan”.
              </p>
            </section>
<section className="panel">
              <div className="section-heading">
                <h3>Hitung Mundur</h3>
              </div>
              <div className="countdown-field">
                {field("countdownDate", "Tanggal tujuan hitung mundur", 10, "", false, "date")}
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
                {values.countdownDate || eventDate ? `Menuju ${eventDateLabels(values.countdownDate || eventDate).full}.` : "Hitung mundur tampil setelah tanggal ditentukan."} Tanggal kosong memakai tanggal acara utama; waktu kosong memakai pukul 00.00 WIB.
              </p>
            </section>
              </section>
              <section className="event-part" id="event-part-lokasi" data-settings-part="lokasi" hidden={part!=="lokasi"}>
                <header className="event-part-heading"><h2 tabIndex={-1}>{eventSections.find(item=>item.id==="lokasi")!.title}</h2><p>{eventSections.find(item=>item.id==="lokasi")!.short}</p></header>
<section className="panel">
              <div className="section-heading">
                <h3>Lokasi Acara</h3>
              </div>
              {field("venueName", "Tempat utama", 160, "Nama gedung atau lokasi acara")}
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
                    title={`Pratinjau peta lokasi acara — ${venueName}`}
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
              </section>
              <section className="event-part" id="event-part-hadiah" data-settings-part="hadiah" hidden={part!=="hadiah"}>
                <header className="event-part-heading"><h2 tabIndex={-1}>{eventSections.find(item=>item.id==="hadiah")!.title}</h2><p>{eventSections.find(item=>item.id==="hadiah")!.short}</p></header>
<section className="panel gift-panel">
              <div className="section-heading">
                <div>
                  <h3>Informasi Hadiah</h3>
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
              </section>
              <section className="event-part" id="event-part-akses" data-settings-part="akses" hidden={part!=="akses"}>
                <header className="event-part-heading"><h2 tabIndex={-1}>{eventSections.find(item=>item.id==="akses")!.title}</h2><p>{eventSections.find(item=>item.id==="akses")!.short}</p></header>
<section className="panel">
              <h3>Batas akses undangan</h3>
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
              </section>
              <div className="event-part-pager">
                <button type="button" disabled={busy || part===sections[0].id} onClick={()=>showPart(sections[sections.findIndex(item=>item.id===part)-1].id)}>Sebelumnya</button>
                <span>Bagian {sections.findIndex(item=>item.id===part)+1} dari {sections.length}</span>
                <button type="button" disabled={busy || part===sections.at(-1)!.id} onClick={()=>showPart(sections[sections.findIndex(item=>item.id===part)+1].id)}>Lanjut</button>
              </div>
            </fieldset>
            <details className="event-overview">
              <summary>Ringkasan isian</summary>
              <div className="event-overview-content">
                <h2>{values.partnerOneName} &amp; {values.partnerTwoName}</h2>
                <dl>
                  <div><dt>Tanggal acara</dt><dd>{event.date}</dd></div>
                  <div><dt>Rangkaian acara</dt><dd>{values.ceremonyTitle || "Acara pertama"} · {event.ceremonyDate} · {values.ceremonyTime || "Waktu akan diinformasikan"} · {event.ceremonyVenue}<br/>{values.receptionTitle || "Acara kedua"} · {event.receptionDate} · {values.receptionTime || "Waktu akan diinformasikan"} · {event.receptionVenue}</dd></div>
                  <div><dt>Tempat</dt><dd>{venueName}</dd></div>
                  <div><dt>Tujuan countdown</dt><dd>{eventDateLabels(values.countdownDate || eventDate).full}{(values.countdownDate || eventDate) && ` · ${values.countdownTime || "00:00"} WIB`}</dd></div>
                  <div><dt>Informasi hadiah</dt><dd>{giftEnabled ? "Ditampilkan" : "Disembunyikan"} · {giftAccounts.length} informasi</dd></div>
                  <div><dt>Batas akses</dt><dd>{values.deviceLimitEnabled==="false" ? "Tanpa limit global" : `${values.deviceLimit} browser per undangan`}</dd></div>
                </dl>
                <p>Ringkasan mengikuti isian saat ini. Tekan Simpan untuk menerapkan perubahan.</p>
              </div>
            </details>
          </div>

        </>
      )}
      <div className={`settings-save-bar${dirty ? " has-changes" : ""}`}>
        <div><p>{kind==="messages" ? "Simpan template, judul, dan deskripsi bersama. Gambar diunggah terpisah." : "Menyimpan semua bagian Detail Acara."}</p>
          <span className="save-state" role="status">{busy ? "Menyimpan…" : dirty ? "Perubahan belum disimpan" : "Pengaturan tersimpan"}</span></div>
        <button className="primary" disabled={busy}>{busy ? "Menyimpan…" : kind==="messages" ? "Simpan pesan dan pratinjau" : "Simpan detail acara"}</button>
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
  useEffect(() => {
    if (!status || status.error) return;
    const timer = setTimeout(() => setStatus(undefined), 3000);
    return () => clearTimeout(timer);
  }, [status]);
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
        if(response.status===402){
          const fresh=await fetch("/api/admin/session");
          if(fresh.ok && token===csrf.current){const s=await fresh.json();csrf.current=s.csrf;setSession(s);if(!s.account.subscription.active)setContent(undefined);}
        }
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
    if(s.account.verificationRequired || !s.account.subscription.active){setSession(s);setGuests([]);setContent(undefined);setLoading(false);return;}
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
        if(e.status===402){setLoading(false);return;}
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
      ? (session.account.subscription.active ? `weddinvita — ${pages[page]}` : "weddinvita — Aktivasi akun")
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
  const eventContext = whatsappEvent(content?.settings || {});
  const footer = (
    <div className="sidebar-footer">
      {session?.account.subscription.expiresAt && <p className="help">Akses aktif sampai {new Date(session.account.subscription.expiresAt).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}</p>}
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
      ) : session.account.verificationRequired ? (
        <VerificationScreen api={api} session={session} onVerified={signedIn} onLogout={logout}/>
      ) : !session.account.subscription.active ? (
        <BillingScreen api={api} onActivated={signedIn} onLogout={logout}/>
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
                  Menu
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
                    event={eventContext}
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
                  <MediaPage content={content} api={api} onContent={setContent} confirm={confirm} notice={notice} active={page==="media"}/>

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
