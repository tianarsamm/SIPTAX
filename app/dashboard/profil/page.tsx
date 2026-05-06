'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/Sidebar'
import {
  User,
  Building2,
  MapPin,
  CreditCard,
  Calendar,
  ShieldCheck,
  Copy,
  Check,
  ChevronRight,
  BadgeCheck,
  AlertTriangle,
  LogOut,          // ← tambahan
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  mono,
  copyable,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
  copyable?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="info-row">
      <div className="info-icon">{icon}</div>
      <div className="info-body">
        <span className="info-label">{label}</span>
        <span className={`info-value ${mono ? 'mono' : ''}`}>{value || '—'}</span>
      </div>
      {copyable && value && (
        <button className="copy-btn" onClick={handleCopy} title="Salin">
          {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
        </button>
      )}
    </div>
  )
}

// ─── Profile Page ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const { user, logout } = useAuth()   // ← tambahkan logout
  const [hasMounted, setHasMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)  // ← konfirmasi logout

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) return null

  const profil = user?.profil
  const namaWP = user?.namaWP || 'Pengguna'
  const initials = getInitials(namaWP)
  const isPKP = profil?.status === 'PKP'

  // ── Logout handler ──
  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --sidebar-w: 220px;
          --topbar-h: 60px;
          --blue: #3b82f6;
          --indigo: #6366f1;
          --dark: #1e293b;
          --mid: #475569;
          --soft: #94a3b8;
          --line: #e8ecf0;
          --bg: #f1f5f9;
        }

        body { font-family: 'Segoe UI', sans-serif; background: var(--bg); }

        /* ── Layout ── */
        .layout { display: flex; min-height: 100vh; }

        /* ── Topbar ── */
        .topbar {
          position: fixed; top: 0; left: var(--sidebar-w); right: 0;
          height: var(--topbar-h);
          background: #fff; border-bottom: 1px solid var(--line);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 1.75rem; z-index: 20;
          transition: left 0.25s;
        }
        .topbar-left { display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; color: var(--soft); }
        .topbar-left .current { font-weight: 700; color: var(--dark); font-size: 1.1rem; }
        .topbar-right { display: flex; align-items: center; gap: 0.85rem; }
        .avatar-sm {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, var(--blue), var(--indigo));
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 0.8rem; font-weight: 700;
        }
        .hamburger {
          display: none; background: none; border: none; cursor: pointer;
          padding: 0.35rem; color: var(--mid);
        }

        /* ── Main ── */
        .main {
          margin-left: var(--sidebar-w);
          padding-top: var(--topbar-h);
          flex: 1;
          min-height: 100vh;
          transition: margin-left 0.25s;
        }
        .main-content {
          padding: 1.75rem;
          max-width: 1100px;
          margin: 0 auto;
        }

        /* ── Page Title ── */
        .page-title { font-size: 1.4rem; font-weight: 800; color: var(--dark); margin-bottom: 0.2rem; }
        .page-sub { font-size: 0.82rem; color: var(--soft); margin-bottom: 1.5rem; }

        /* ── Hero Card (landscape) ── */
        .hero-card {
          background: linear-gradient(135deg, #1e40af 0%, #6366f1 100%);
          border-radius: 16px;
          padding: 1.75rem 2rem;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 1.75rem;
          margin-bottom: 1.25rem;
          position: relative;
          overflow: hidden;
        }
        .hero-card::before {
          content: ''; position: absolute;
          top: -60px; right: -60px;
          width: 220px; height: 220px;
          background: rgba(255,255,255,0.07); border-radius: 50%;
        }
        .hero-card::after {
          content: ''; position: absolute;
          bottom: -80px; left: 35%;
          width: 260px; height: 260px;
          background: rgba(255,255,255,0.04); border-radius: 50%;
        }
        .hero-avatar {
          width: 72px; height: 72px; border-radius: 50%;
          background: rgba(255,255,255,0.2);
          border: 3px solid rgba(255,255,255,0.4);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.75rem; font-weight: 800; color: #fff;
          flex-shrink: 0; position: relative; z-index: 1;
        }
        .hero-info { position: relative; z-index: 1; }
        .hero-name { font-size: 1.35rem; font-weight: 800; color: #fff; margin-bottom: 0.35rem; }
        .hero-meta { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
        .hero-npwp { font-size: 0.8rem; color: rgba(255,255,255,0.75); font-family: monospace; letter-spacing: 0.05em; }
        .badge-pkp {
          display: inline-flex; align-items: center; gap: 0.35rem;
          font-size: 0.7rem; font-weight: 700;
          padding: 0.22rem 0.6rem; border-radius: 999px;
          letter-spacing: 0.04em;
        }
        .badge-pkp.pkp { background: rgba(16,185,129,0.25); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.4); }
        .badge-pkp.non-pkp { background: rgba(251,191,36,0.2); color: #fde68a; border: 1px solid rgba(251,191,36,0.35); }
        .hero-actions { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 0.55rem; align-items: flex-end; }
        .hero-btn {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.55rem 1.1rem; border-radius: 9px;
          font-size: 0.8rem; font-weight: 600; cursor: pointer;
          white-space: nowrap; transition: all 0.15s;
        }
        .hero-btn.outline {
          background: rgba(255,255,255,0.12);
          border: 1.5px solid rgba(255,255,255,0.3);
          color: #fff;
        }
        .hero-btn.outline:hover { background: rgba(255,255,255,0.22); }
        .hero-btn.solid {
          background: #fff; border: none;
          color: #1e40af;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .hero-btn.solid:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }

        /* ── Logout button ── */
        .hero-btn.logout {
          background: rgba(239,68,68,0.18);
          border: 1.5px solid rgba(239,68,68,0.4);
          color: #fca5a5;
        }
        .hero-btn.logout:hover {
          background: rgba(239,68,68,0.32);
          border-color: rgba(239,68,68,0.65);
          color: #fff;
        }

        /* ── Confirm Modal ── */
        .modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 100;
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
        }
        .modal {
          background: #fff; border-radius: 16px;
          padding: 1.75rem 2rem;
          max-width: 380px; width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          text-align: center;
        }
        .modal-icon {
          width: 52px; height: 52px; border-radius: 50%;
          background: #fef2f2; display: flex; align-items: center;
          justify-content: center; margin: 0 auto 1rem;
        }
        .modal-title { font-size: 1.05rem; font-weight: 800; color: #1e293b; margin-bottom: 0.4rem; }
        .modal-desc { font-size: 0.82rem; color: #94a3b8; line-height: 1.55; margin-bottom: 1.5rem; }
        .modal-actions { display: flex; gap: 0.75rem; justify-content: center; }
        .modal-btn {
          flex: 1; padding: 0.65rem; border-radius: 9px;
          font-size: 0.85rem; font-weight: 600; cursor: pointer;
          transition: all 0.15s; border: none;
        }
        .modal-btn.cancel {
          background: #f1f5f9; color: #475569;
        }
        .modal-btn.cancel:hover { background: #e2e8f0; }
        .modal-btn.confirm {
          background: #ef4444; color: #fff;
        }
        .modal-btn.confirm:hover { background: #dc2626; }

        /* ── Landscape Grid ── */
        .cards-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.1rem;
        }

        /* ── Card ── */
        .card {
          background: #fff; border-radius: 14px;
          box-shadow: 0 1px 4px rgba(0,0,0,.06);
          padding: 1.35rem; overflow: hidden;
        }
        .card-full { grid-column: 1 / -1; }
        .card-header {
          display: flex; align-items: center; gap: 0.6rem;
          margin-bottom: 1.1rem; padding-bottom: 0.85rem;
          border-bottom: 1px solid #f1f5f9;
        }
        .card-header-icon {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .card-header-icon.blue { background: #eff6ff; }
        .card-header-icon.green { background: #f0fdf4; }
        .card-title { font-size: 0.875rem; font-weight: 700; color: var(--dark); }
        .card-sub { font-size: 0.7rem; color: var(--soft); margin-top: 0.1rem; }

        /* ── Info Row ── */
        .info-row {
          display: flex; align-items: center; gap: 0.8rem;
          padding: 0.65rem 0;
          border-bottom: 1px solid #f8fafc;
        }
        .info-row:last-child { border-bottom: none; padding-bottom: 0; }
        .info-row:first-child { padding-top: 0; }
        .info-icon {
          width: 32px; height: 32px; border-radius: 8px;
          background: #f8fafc; border: 1px solid #e8ecf0;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .info-body { flex: 1; min-width: 0; }
        .info-label { display: block; font-size: 0.68rem; color: var(--soft); font-weight: 500; margin-bottom: 0.1rem; }
        .info-value {
          display: block; font-size: 0.855rem; font-weight: 600;
          color: var(--dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .info-value.mono { font-family: monospace; letter-spacing: 0.04em; color: var(--blue); }
        .copy-btn {
          background: none; border: none; cursor: pointer;
          color: var(--soft); padding: 0.3rem;
          border-radius: 6px; transition: background 0.15s;
          display: flex; align-items: center;
        }
        .copy-btn:hover { background: #f1f5f9; color: var(--mid); }

        /* ════════════════════════════════════
           RESPONSIVE BREAKPOINTS
        ════════════════════════════════════ */

        @media (max-width: 1024px) {
          :root { --sidebar-w: 200px; }
        }

        @media (max-width: 768px) {
          :root { --sidebar-w: 0px; }
          .topbar { left: 0; padding: 0 1rem; }
          .hamburger { display: flex; }
          .main { margin-left: 0; }
          .main-content { padding: 1.25rem; }

          .hero-card {
            grid-template-columns: auto 1fr;
            grid-template-rows: auto auto;
          }
          .hero-actions {
            grid-column: 1 / -1;
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
          }

          .cards-grid { grid-template-columns: 1fr; }
          .card-full { grid-column: 1; }
        }

        @media (max-width: 480px) {
          .hero-card {
            grid-template-columns: 1fr;
            text-align: center;
            padding: 1.35rem 1.25rem;
          }
          .hero-avatar {
            width: 60px; height: 60px; font-size: 1.4rem;
            margin: 0 auto;
          }
          .hero-meta { justify-content: center; }
          .hero-actions {
            align-items: center;
            justify-content: center;
          }
          .hero-name { font-size: 1.15rem; }
          .page-title { font-size: 1.2rem; }
        }

        @media (max-height: 500px) and (orientation: landscape) {
          .main-content { padding: 1rem; }
          .hero-card { padding: 1.1rem 1.5rem; gap: 1.25rem; }
          .hero-avatar { width: 56px; height: 56px; font-size: 1.3rem; }
          .hero-name { font-size: 1.1rem; }
          .cards-grid { grid-template-columns: 1fr 1fr; }
        }

        .sidebar-overlay {
          display: none;
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 29;
        }
        .sidebar-overlay.open { display: block; }
      `}</style>

      <div className="layout">
        <Sidebar />

        {/* Mobile sidebar overlay */}
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* ── Confirm Logout Modal ── */}
        {showConfirm && (
          <div className="modal-backdrop" onClick={() => setShowConfirm(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-icon">
                <LogOut size={22} color="#ef4444" />
              </div>
              <div className="modal-title">Keluar dari Akun?</div>
              <div className="modal-desc">
                Anda akan keluar dari sesi ini. Pastikan semua pekerjaan sudah tersimpan sebelum melanjutkan.
              </div>
              <div className="modal-actions">
                <button className="modal-btn cancel" onClick={() => setShowConfirm(false)}>
                  Batal
                </button>
                <button className="modal-btn confirm" onClick={handleLogout}>
                  Ya, Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span>Dashboard</span>
            <ChevronRight size={13} />
            <span className="current">Profil Saya</span>
          </div>
          <div className="topbar-right">
            <div className="avatar-sm">{initials}</div>
          </div>
        </header>

        {/* Main */}
        <main className="main">
          <div className="main-content">
            <h1 className="page-title">Profil Wajib Pajak</h1>
            <p className="page-sub">Informasi akun dan data perusahaan terdaftar di SiPTax</p>

            {/* ── Hero Card ── */}
            <div className="hero-card">
              <div className="hero-avatar">{initials}</div>

              <div className="hero-info">
                <div className="hero-name">{namaWP}</div>
                <div className="hero-meta">
                  <span className="hero-npwp">NPWP: {profil?.npwp || '—'}</span>
                  <span className={`badge-pkp ${isPKP ? 'pkp' : 'non-pkp'}`}>
                    {isPKP
                      ? <><BadgeCheck size={11} /> PKP</>
                      : <><AlertTriangle size={11} /> Non PKP</>
                    }
                  </span>
                </div>
              </div>

              <div className="hero-actions">
                <button className="hero-btn outline" onClick={() => window.history.back()}>
                  Kembali
                </button>
                {/* Tombol Logout ↓ */}
                <button className="hero-btn logout" onClick={() => setShowConfirm(true)}>
                  {/* <LogOut size={13} /> Logout */}Logout
                </button>
              </div>
            </div>

            {/* ── Cards Grid ── */}
            <div className="cards-grid">

              {/* Data Perusahaan */}
              <div className="card">
                <div className="card-header">
                  <div className="card-header-icon blue">
                    <Building2 size={15} color="#3b82f6" />
                  </div>
                  <div>
                    <div className="card-title">Data Perusahaan</div>
                    <div className="card-sub">Informasi wajib pajak</div>
                  </div>
                </div>
                <InfoRow
                  icon={<User size={14} color="#3b82f6" />}
                  label="Nama Wajib Pajak"
                  value={namaWP}
                />
                <InfoRow
                  icon={<CreditCard size={14} color="#6366f1" />}
                  label="NPWP"
                  value={profil?.npwp || ''}
                  mono
                  copyable
                />
                <InfoRow
                  icon={<Building2 size={14} color="#f59e0b" />}
                  label="Bidang Usaha"
                  value={profil?.bidangUsaha || ''}
                />
                <InfoRow
                  icon={<MapPin size={14} color="#ef4444" />}
                  label="Alamat"
                  value={profil?.alamat || ''}
                />
              </div>

              {/* Status Pajak */}
              <div className="card">
                <div className="card-header">
                  <div className="card-header-icon green">
                    <ShieldCheck size={15} color="#10b981" />
                  </div>
                  <div>
                    <div className="card-title">Status Pajak</div>
                    <div className="card-sub">Klasifikasi & periode pelaporan</div>
                  </div>
                </div>
                <InfoRow
                  icon={<ShieldCheck size={14} color={isPKP ? '#10b981' : '#f59e0b'} />}
                  label="Status PKP"
                  value={profil?.status || 'Non PKP'}
                />
                <InfoRow
                  icon={<Calendar size={14} color="#6366f1" />}
                  label="Periode Pajak"
                  value={profil?.periode || '—'}
                />
              </div>

            </div>
          </div>
        </main>
      </div>
    </>
  )
}