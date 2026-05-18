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
import { supabaseClient } from '@/lib/supabaseClient'
import Sidebar from '@/components/Sidebar'

// ─── Types ────────────────────────────────────────────────────────────────

interface Transaksi {
  id: string
  total_nilai_transaksi: number | null
  jenis_wp: string
  has_ppn: boolean | null
  has_bupot: boolean | null
  status_ppn: string | null
  status_bupot: string | null
}

interface DashboardStats {
  totalTransaksi: number
  totalPPN: number
  totalBupot: number
  transaksiBelumSelesai: number
  totalPenjualan: number
  totalPembelian: number
}

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
  const [stats, setStats] = useState<DashboardStats>({
    totalTransaksi: 0,
    totalPPN: 0,
    totalBupot: 0,
    transaksiBelumSelesai: 0,
    totalPenjualan: 0,
    totalPembelian: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Fetch data transaksi
  useEffect(() => {
    if (!user?.id) return

    const fetchData = async () => {
      try {
        setLoading(true)
        const { data: transaksis, error } = await supabaseClient
          .from('transaksi')
          .select('*')
          .eq('user_id', user.id)

        if (error) {
          console.error('Error fetching transaksi:', error)
          setLoading(false)
          return
        }

        if (!transaksis || transaksis.length === 0) {
          setLoading(false)
          return
        }

        // Calculate stats
        const totalTransaksi = transaksis.length
        let totalPPN = 0
        let totalBupot = 0
        let transaksiBelumSelesai = 0
        let totalPenjualan = 0
        let totalPembelian = 0

        transaksis.forEach((t: Transaksi) => {
          const nilai = t.total_nilai_transaksi || 0

          // Hitung total PPN (11% dari nilai transaksi jika PKP dan has_ppn)
          if (t.has_ppn && t.status_ppn !== 'completed') {
            totalPPN += nilai * 0.11
          }

          // Hitung total Bupot (jika Badan/Bendahara)
          if (t.has_bupot && t.status_bupot !== 'completed') {
            // Bupot bisa berbeda-beda, assumed 2% untuk Pasal 22/23
            totalBupot += nilai * 0.02
          }

          // Count transaksi belum selesai
          if (t.status_ppn !== 'completed' || t.status_bupot !== 'completed') {
            transaksiBelumSelesai++
          }

          // Categorize sebagai penjualan atau pembelian berdasarkan jenis_wp
          // Assuming jenis_wp menunjukkan role: 'badan', 'bendahara_pemerintah', 'orang_pribadi'
          // Jika jenis_wp adalah pembeli, maka ini pembelian, sebaliknya penjualan
          if (t.jenis_wp === 'pembeli' || t.jenis_wp === 'orang_pribadi') {
            totalPembelian += nilai
          } else {
            totalPenjualan += nilai
          }
        })

        setStats({
          totalTransaksi,
          totalPPN,
          totalBupot,
          transaksiBelumSelesai,
          totalPenjualan,
          totalPembelian,
        })
      } catch (err) {
        console.error('Unexpected error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id])

  const displayName    = hasMounted ? user?.namaWP || 'User'                          : 'User'
  const displayRole    = hasMounted ? user?.profil?.bidangUsaha || 'Wajib Pajak'      : 'Wajib Pajak'
  const displayAvatar  = hasMounted
    ? user?.namaWP?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'U'
    : 'U'

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background: #f8fafc; }
        .layout { display: flex; min-height: 100vh; }

        /* ── Topbar ── */
        .topbar {
          position: fixed; top: 0; left: 220px; right: 0; height: 70px;
          background: #fff; border-bottom: 1px solid #e2e8f0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 2.5rem; z-index: 10; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .topbar-left { font-size: 1.5rem; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; }
        .topbar-right { display: flex; align-items: center; gap: 1rem; }

        /* User info — clickable */
        .user-info-btn {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.5rem 1rem; border-radius: 10px;
          cursor: pointer; border: none; background: transparent;
          transition: background 0.2s; text-align: right;
        }
        .user-info-btn:hover { background: #f1f5f9; }
        .user-info-btn:hover .avatar { box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        .user-info-btn:hover .chevron-hint { color: #6366f1; transform: translateX(2px); }

        .user-info { text-align: right; }
        .user-name { font-size: 0.9rem; font-weight: 600; color: #0f172a; display: block; }
        .user-role { font-size: 0.78rem; color: #64748b; display: block; margin-top: 0.15rem; }

        .avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 0.875rem; font-weight: 700;
          flex-shrink: 0; transition: box-shadow 0.2s;
        }
        .chevron-hint {
          color: #cbd5e1;
          transition: color 0.2s, transform 0.2s;
          flex-shrink: 0;
        }

        /* ── Main ── */
        .main { margin-left: 220px; padding-top: 70px; min-height: 100vh; }
        .main-content { padding: 2.5rem; }

        /* ── Welcome Section ── */
        .welcome-section {
          margin-bottom: 2rem;
        }
        .welcome-section h2 {
          font-size: 1.8rem; font-weight: 700; color: #0f172a;
          letter-spacing: -0.5px; margin-bottom: 0.25rem;
        }
        .welcome-section p {
          font-size: 0.95rem; color: #64748b;
        }

        /* ── Stats ── */
        .stats-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem; margin-bottom: 2rem;
        }
        .stat-card {
          background: #fff; border-radius: 14px;
          padding: 1.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
          position: relative; overflow: hidden;
        }
        .stat-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 4px; background: linear-gradient(90deg, #6366f1, #a855f7);
          transform: scaleX(0); transition: transform 0.3s ease;
        }
        .stat-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }
        .stat-card:hover::before { transform: scaleX(1); }

        .stat-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
        .stat-title { font-size: 0.85rem; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-icon {
          width: 48px; height: 48px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem;
        }
        .stat-icon.blue   { background: #eef2ff; }
        .stat-icon.purple { background: #f3e8ff; }
        .stat-icon.green  { background: #f0fdf4; }
        .stat-icon.amber  { background: #fffbeb; }
        .stat-icon.red    { background: #fef2f2; }
        .stat-icon.cyan   { background: #ecf0ff; }

        .stat-value { font-size: 2rem; font-weight: 800; color: #0f172a; margin-bottom: 0.75rem; letter-spacing: -1px; }
        .stat-trend {
          font-size: 0.8rem; display: flex; align-items: center; gap: 0.4rem;
          padding: 0.35rem 0.75rem; border-radius: 6px; width: fit-content;
        }
        .stat-trend.up   { background: #f0fdf4; color: #16a34a; }
        .stat-trend.down { background: #fef2f2; color: #dc2626; }

        /* ── CTA ── */
        .cta-card {
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          border-radius: 14px; padding: 2.5rem; color: #fff;
          margin-bottom: 2rem;
          display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 10px 25px rgba(99,102,241,0.2);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .cta-text h3 { font-size: 1.35rem; font-weight: 700; margin-bottom: 0.5rem; letter-spacing: -0.5px; }
        .cta-text p  { font-size: 0.95rem; opacity: 0.9; max-width: 450px; line-height: 1.5; }
        .btn-cta {
          background: #fff; color: #6366f1;
          padding: 0.85rem 1.75rem; border-radius: 10px;
          font-weight: 600; font-size: 0.95rem;
          border: none; cursor: pointer;
          display: flex; align-items: center; gap: 0.6rem;
          white-space: nowrap; transition: all 0.3s;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .btn-cta:hover { 
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.2);
        }

        /* ── Info Cards ── */
        .info-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .info-card {
          background: #fff; border-radius: 14px;
          padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
        }
        .info-card h4 {
          font-size: 1.1rem; font-weight: 700; color: #0f172a;
          margin-bottom: 1.5rem; letter-spacing: -0.5px;
        }

        .flow-step {
          display: flex; align-items: flex-start; gap: 1rem;
          margin-bottom: 1.5rem; padding-bottom: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .flow-step:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .flow-num {
          width: 36px; height: 36px; border-radius: 10px;
          background: #eef2ff; color: #6366f1;
          font-size: 0.85rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .flow-text h5 { font-size: 0.95rem; font-weight: 600; color: #0f172a; }
        .flow-text p  { font-size: 0.85rem; color: #64748b; margin-top: 0.3rem; line-height: 1.5; }
        .condition-tag {
          display: inline-block; font-size: 0.75rem; font-weight: 600;
          padding: 0.25rem 0.65rem; border-radius: 6px; margin-top: 0.5rem;
        }
        .condition-tag.green { background: #f0fdf4; color: #16a34a; }
        .condition-tag.blue  { background: #eef2ff; color: #6366f1; }
        .condition-tag.amber { background: #fffbeb; color: #ca8a04; }

        @media (max-width: 1024px) {
          .topbar { left: 0; }
          .main { margin-left: 0; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .info-row-grid { grid-template-columns: 1fr; }
          .cta-card { flex-direction: column; text-align: center; gap: 1.5rem; }
        }
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

            {/* Welcome Section */}
            <div className="welcome-section">
              <h2 suppressHydrationWarning>Selamat Datang, {displayName}!</h2>
              <p suppressHydrationWarning>Kelola kewajiban pajak Anda dengan mudah dan transparan</p>
            </div>

            {/* Stat Cards */}
            <div className="stats-grid">
              <StatCard
                title="Total Transaksi"    value={loading ? '---' : stats.totalTransaksi.toString()}
                icon={<ShoppingCart size={24} color="#6366f1" />}
                iconBg="blue"  trend={loading ? "Loading..." : `${stats.totalTransaksi} transaksi tercatat`}  trendUp
              />
              <StatCard
                title="Total PPN"   value={loading ? '---' : `Rp ${(stats.totalPPN / 1_000_000).toFixed(1)}M`}
                icon={<LayoutDashboard size={24} color="#a855f7" />}
                iconBg="purple" trend={loading ? "Loading..." : `11% dari DPP`} trendUp
              />
              <StatCard
                title="Total Bupot"   value={loading ? '---' : `Rp ${(stats.totalBupot / 1_000_000).toFixed(1)}M`}
                icon={<Building2 size={24} color="#10b981" />}
                iconBg="green" trend={loading ? "Loading..." : "Psl 22/23 dipotong"} trendUp
              />
              {/* <StatCard
                title="Transaksi Pending" value={loading ? '---' : stats.transaksiBelumSelesai.toString()}
                icon={<Clock size={24} color="#f59e0b" />}
                iconBg="amber"   trend={loading ? "Loading..." : "Menunggu konfirmasi"}  trendUp={false}
              />
              <StatCard
                title="Nilai Penjualan"   value={loading ? '---' : `Rp ${(stats.totalPenjualan / 1_000_000_000).toFixed(2)}B`}
                icon={<Users size={24} color="#06b6d4" />}
                iconBg="cyan" trend={loading ? "Loading..." : "Transaksi keluar"} trendUp
              />
              <StatCard
                title="Nilai Pembelian"   value={loading ? '---' : `Rp ${(stats.totalPembelian / 1_000_000_000).toFixed(2)}B`}
                icon={<ShoppingCart size={24} color="#ef4444" />}
                iconBg="red"   trend={loading ? "Loading..." : "Transaksi masuk"}  trendUp={false}
              /> */}
            </div>

            {/* CTA */}
            <div className="cta-card">
              <div className="cta-text">
                <h3>🚀 Mulai Transaksi Baru</h3>
                <p>Hitung kewajiban PPN Anda secara real-time. Sistem otomatis kami akan memandu Anda berdasarkan profil PKP dan jenis pihak transaksi untuk hasil yang akurat.</p>
              </div>
              <button className="btn-cta" onClick={() => router.push('/dashboard/cekppn')}>
                <Building2 size={18} /> Buat Transaksi
              </button>
            </div>

            {/* Info Cards */}
            <div className="info-row-grid">
              <div className="info-card">
                <h4>📋 Alur Transaksi Pajak</h4>
                <div className="flow-step">
                  <div className="flow-num">1</div>
                  <div className="flow-text">
                    <h5>Kelengkapan Profil</h5>
                    <p>Input data wajib pajak, NPWP, dan status PKP Anda secara lengkap.</p>
                    <span className="condition-tag blue">Jika PKP → Lanjut ke input PPN</span>
                  </div>
                </div>
                <div className="flow-step">
                  <div className="flow-num">2</div>
                  <div className="flow-text">
                    <h5>Detail Transaksi</h5>
                    <p>Masukkan detail transaksi, jumlah DPP, dan tipe pihak yang bertransaksi.</p>
                    <span className="condition-tag amber">Jika Badan/Bendahara → Generate Bupot</span>
                  </div>
                </div>
                <div className="flow-step">
                  <div className="flow-num">3</div>
                  <div className="flow-text">
                    <h5>Perhitungan Final</h5>
                    <p>Sistem menghitung PPN dan/atau Bupot sesuai regulasi terbaru.</p>
                    <span className="condition-tag green">✓ Siap Disimpan & Dilaporkan</span>
                  </div>
                </div>
              </div>

              <div className="info-card">
                <h4>📊 Informasi Tarif Pajak</h4>
                <div className="flow-step">
                  <div className="flow-num" style={{ background: '#f0fdf4', color: '#16a34a' }}>%</div>
                  <div className="flow-text">
                    <h5>Tarif PPN Standar</h5>
                    <p>11% dari Dasar Pengenaan Pajak (DPP) berlaku sejak 1 Januari 2022 hingga sekarang. Dapat dikurangi untuk kondisi tertentu.</p>
                  </div>
                </div>
                <div className="flow-step">
                  <div className="flow-num" style={{ background: '#fffbeb', color: '#d97706' }}>B</div>
                  <div className="flow-text">
                    <h5>Bupot (PPh Pasal 22/23)</h5>
                    <p>Dipotong oleh Badan Usaha atau Bendahara Pemerintah saat melakukan pembayaran kepada pihak ketiga.</p>
                  </div>
                </div>
                <div className="flow-step">
                  <div className="flow-num" style={{ background: '#eef2ff', color: '#6366f1' }}>P</div>
                  <div className="flow-text">
                    <h5>Status PKP</h5>
                    <p>Pengusaha Kena Pajak wajib memungut, menyetor, dan melaporkan PPN sesuai ketentuan peraturan perpajakan.</p>
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