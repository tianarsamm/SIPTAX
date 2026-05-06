'use client'

import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Building2,
  Users,
  ShoppingCart,
  Clock,
  ChevronRight,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/Sidebar'

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title, value, icon, trend, trendUp, iconBg,
}: {
  title: string; value: string; icon: React.ReactNode
  trend: string; trendUp: boolean; iconBg: string
}) {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-title">{title}</span>
        <div className={`stat-icon ${iconBg}`}>{icon}</div>
      </div>
      <div className="stat-value">{value}</div>
      <div className={`stat-trend ${trendUp ? 'up' : 'down'}`}>
        {trendUp ? '↗' : '↘'} {trend}
      </div>
    </div>
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const displayName    = hasMounted ? user?.namaWP || 'User'                          : 'User'
  const displayRole    = hasMounted ? user?.profil?.bidangUsaha || 'Wajib Pajak'      : 'Wajib Pajak'
  const displayAvatar  = hasMounted
    ? user?.namaWP?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'U'
    : 'U'

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', sans-serif; background: #f1f5f9; }
        .layout { display: flex; min-height: 100vh; }

        /* ── Topbar ── */
        .topbar {
          position: fixed; top: 0; left: 220px; right: 0; height: 64px;
          background: #fff; border-bottom: 1px solid #e8ecf0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 2rem; z-index: 10;
        }
        .topbar-left { font-size: 1.35rem; font-weight: 700; color: #1e293b; }
        .topbar-right { display: flex; align-items: center; }

        /* User info — clickable */
        .user-info-btn {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.45rem 0.75rem; border-radius: 12px;
          cursor: pointer; border: none; background: transparent;
          transition: background 0.15s;
          text-align: right;
        }
        .user-info-btn:hover { background: #f1f5f9; }
        .user-info-btn:hover .avatar { box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }
        .user-info-btn:hover .chevron-hint { color: #3b82f6; transform: translateX(2px); }

        .user-info { text-align: right; }
        .user-name { font-size: 0.875rem; font-weight: 600; color: #1e293b; display: block; }
        .user-role { font-size: 0.75rem; color: #94a3b8; display: block; }

        .avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 0.85rem; font-weight: 700;
          flex-shrink: 0; transition: box-shadow 0.15s;
        }
        .chevron-hint {
          color: #cbd5e1;
          transition: color 0.15s, transform 0.15s;
          flex-shrink: 0;
        }

        /* ── Main ── */
        .main { margin-left: 220px; padding-top: 64px; min-height: 100vh; }
        .main-content { padding: 2rem; }

        /* ── Stats ── */
        .stats-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem; margin-bottom: 1.75rem;
        }
        .stat-card {
          background: #fff; border-radius: 12px;
          padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,.06);
        }
        .stat-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
        .stat-title { font-size: 0.8rem; color: #94a3b8; font-weight: 500; }
        .stat-icon {
          width: 42px; height: 42px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
        }
        .stat-icon.blue   { background: #eff6ff; }
        .stat-icon.yellow { background: #fffbeb; }
        .stat-icon.green  { background: #f0fdf4; }
        .stat-icon.red    { background: #fff1f2; }
        .stat-value { font-size: 1.6rem; font-weight: 700; color: #1e293b; margin-bottom: 0.4rem; }
        .stat-trend { font-size: 0.8rem; display: flex; align-items: center; gap: 0.25rem; }
        .stat-trend.up   { color: #10b981; }
        .stat-trend.down { color: #ef4444; }

        /* ── CTA ── */
        .cta-card {
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
          border-radius: 12px; padding: 2rem; color: #fff;
          margin-bottom: 1.75rem;
          display: flex; align-items: center; justify-content: space-between;
        }
        .cta-text h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 0.4rem; }
        .cta-text p  { font-size: 0.875rem; opacity: 0.85; max-width: 400px; }
        .btn-cta {
          background: #fff; color: #3b82f6;
          padding: 0.7rem 1.5rem; border-radius: 8px;
          font-weight: 600; font-size: 0.9rem;
          border: none; cursor: pointer;
          display: flex; align-items: center; gap: 0.5rem;
          white-space: nowrap; transition: transform 0.15s;
        }
        .btn-cta:hover { transform: translateY(-1px); }

        /* ── Info Cards ── */
        .info-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        .info-card {
          background: #fff; border-radius: 12px;
          padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,.06);
        }
        .info-card h4 { font-size: 0.95rem; font-weight: 600; color: #1e293b; margin-bottom: 1rem; }

        .flow-step {
          display: flex; align-items: flex-start; gap: 0.75rem;
          margin-bottom: 0.9rem; padding-bottom: 0.9rem;
          border-bottom: 1px solid #f1f5f9;
        }
        .flow-step:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .flow-num {
          width: 26px; height: 26px; border-radius: 50%;
          background: #eff6ff; color: #3b82f6;
          font-size: 0.75rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .flow-text h5 { font-size: 0.85rem; font-weight: 600; color: #1e293b; }
        .flow-text p  { font-size: 0.78rem; color: #64748b; margin-top: 0.15rem; }
        .condition-tag {
          display: inline-block; font-size: 0.7rem; font-weight: 600;
          padding: 0.15rem 0.5rem; border-radius: 9999px; margin-top: 0.3rem;
        }
        .condition-tag.green { background: #f0fdf4; color: #16a34a; }
        .condition-tag.blue  { background: #eff6ff; color: #3b82f6; }
      `}</style>

      <div className="layout">
        <Sidebar />

        {/* ── Topbar ── */}
        <header className="topbar">
          <div className="topbar-left">Dashboard</div>
          <div className="topbar-right">
            <button
              className="user-info-btn"
              onClick={() => router.push('/dashboard/profil')}
              title="Lihat Profil"
            >
              <div className="user-info">
                <span className="user-name" suppressHydrationWarning>{displayName}</span>
                <span className="user-role"  suppressHydrationWarning>{displayRole}</span>
              </div>
              <div className="avatar" suppressHydrationWarning>{displayAvatar}</div>
              <ChevronRight size={14} className="chevron-hint" />
            </button>
          </div>
        </header>

        {/* ── Main Content ── */}
        <main className="main">
          <div className="main-content">

            {/* Stat Cards */}
            <div className="stats-grid">
              <StatCard
                title="Total User"    value="40,689"
                icon={<Users size={20} color="#3b82f6" />}
                iconBg="blue"  trend="8.5% Up from yesterday"  trendUp
              />
              <StatCard
                title="Total Order"   value="10,293"
                icon={<ShoppingCart size={20} color="#f59e0b" />}
                iconBg="yellow" trend="1.3% Up from past week" trendUp
              />
              <StatCard
                title="Total Sales"   value="$89,000"
                icon={<LayoutDashboard size={20} color="#10b981" />}
                iconBg="green" trend="4.3% Down from yesterday" trendUp={false}
              />
              <StatCard
                title="Total Pending" value="2,040"
                icon={<Clock size={20} color="#ef4444" />}
                iconBg="red"   trend="1.8% Up from yesterday"  trendUp
              />
            </div>

            {/* CTA */}
            <div className="cta-card">
              <div className="cta-text">
                <h3>Mulai Transaksi Sekarang</h3>
                <p>Hitung kewajiban PPN Anda secara otomatis. Alur dipandu berdasarkan profil PKP dan jenis pihak transaksi.</p>
              </div>
              <button className="btn-cta" onClick={() => router.push('/dashboard/cekppn')}>
                <Building2 size={16} /> Transaksi
              </button>
            </div>

            {/* Info Cards */}
            <div className="info-row-grid">
              <div className="info-card">
                <h4>Alur Transaksi</h4>
                <div className="flow-step">
                  <div className="flow-num">1</div>
                  <div className="flow-text">
                    <h5>Input Profil</h5>
                    <p>Masukkan data wajib pajak dan status PKP.</p>
                    <span className="condition-tag blue">Jika PKP → Input PPN</span>
                  </div>
                </div>
                <div className="flow-step">
                  <div className="flow-num">2</div>
                  <div className="flow-text">
                    <h5>Input Transaksi</h5>
                    <p>Detail transaksi dan nilai DPP.</p>
                    <span className="condition-tag blue">Jika Badan/Bendahara Pemerintah → Draft Bupot</span>
                  </div>
                </div>
                <div className="flow-step">
                  <div className="flow-num">3</div>
                  <div className="flow-text">
                    <h5>Tagihan</h5>
                    <p>Hasil akhir perhitungan PPN dan/atau Bupot.</p>
                    <span className="condition-tag green">Final</span>
                  </div>
                </div>
              </div>

              <div className="info-card">
                <h4>Informasi Pajak</h4>
                <div className="flow-step">
                  <div className="flow-num" style={{ background: '#f0fdf4', color: '#16a34a' }}>%</div>
                  <div className="flow-text">
                    <h5>Tarif PPN</h5>
                    <p>11% dari Dasar Pengenaan Pajak (DPP) berlaku 2022–sekarang.</p>
                  </div>
                </div>
                <div className="flow-step">
                  <div className="flow-num" style={{ background: '#fffbeb', color: '#d97706' }}>B</div>
                  <div className="flow-text">
                    <h5>Bupot (PPh Psl 22/23)</h5>
                    <p>Dipotong oleh Badan atau Bendahara Pemerintah saat pembayaran.</p>
                  </div>
                </div>
                <div className="flow-step">
                  <div className="flow-num" style={{ background: '#f5f3ff', color: '#7c3aed' }}>P</div>
                  <div className="flow-text">
                    <h5>PKP</h5>
                    <p>Pengusaha Kena Pajak wajib memungut, menyetor, dan melaporkan PPN.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </>
  )
}