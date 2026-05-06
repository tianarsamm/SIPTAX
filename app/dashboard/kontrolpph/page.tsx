'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabaseClient } from '@/lib/supabaseClient'
import { ChevronRight, Search, SlidersHorizontal, X, ChevronDown, Download } from 'lucide-react'
import Sidebar from '@/components/Sidebar'

interface TransaksiRow {
  id: string
  nomor_transaksi: string
  tanggal: string
  masa: string
  pembeli: string
  npwp_pembeli: string
  jenis_wp: string
  penjual: string
  npwp_penjual: string
  kode_jasa: string
  jenis_jasa: string
  total_jasa: number
  total_barang: number
  total_dpp: number
  total_nilai_transaksi: number
  has_ppn: boolean
  has_bupot: boolean
  status_bupot?: string
  jasa_rows: { nama: string; harga: string }[]
  barang_rows: { nama: string; harga: string }[]
}

const MASA_OPTIONS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const STATUS_BUPOT_OPTIONS = [
  { value: 'terbit',       label: 'Terbit' },
  { value: 'tidak_terbit', label: 'Tidak Terbit' },
  { value: 'proses',       label: 'Proses' },
]

export default function KontrolPPhPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [data, setData]       = useState<TransaksiRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterOpen, setFilterOpen] = useState(false)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage]   = useState(1)

  // ── Status update state ──
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)

  // ── Filter state ──
  const [search, setSearch]             = useState('')
  const [filterMasa, setFilterMasa]     = useState('')
  const [filterTahun, setFilterTahun]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMinDPP, setFilterMinDPP] = useState('')
  const [filterMaxDPP, setFilterMaxDPP] = useState('')

  const hasActiveFilter = search || filterMasa || filterTahun || filterStatus || filterMinDPP || filterMaxDPP

  const clearFilters = () => {
    setSearch(''); setFilterMasa(''); setFilterTahun('')
    setFilterStatus(''); setFilterMinDPP(''); setFilterMaxDPP('')
  }

  // Reset ke halaman 1 saat filter berubah
  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterMasa, filterTahun, filterStatus, filterMinDPP, filterMaxDPP])

  useEffect(() => {
    if (authLoading) return
    if (!user?.id) { router.push('/login'); return }

    const fetchData = async () => {
      setLoading(true)
      const { data: rows } = await supabaseClient
        .from('transaksi')
        .select('*')
        .eq('user_id', user.id)
        .eq('has_bupot', true)
        .order('tanggal', { ascending: false })
      setData(rows ?? [])
      setLoading(false)
    }
    fetchData()
  }, [user?.id, authLoading, router])

  // ── Update status bupot ──
  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    setUpdateError(null)

    const { error } = await supabaseClient
      .from('transaksi')
      .update({ status_bupot: newStatus })
      .eq('id', id)

    if (error) {
      setUpdateError(`Gagal menyimpan status: ${error.message}`)
    } else {
      setData(prev =>
        prev.map(r => r.id === id ? { ...r, status_bupot: newStatus } : r)
      )
    }
    setUpdatingId(null)
  }

  // ── Derived: unique tahun list ──
  const tahunList = useMemo(() => {
    const set = new Set(
      data.map(r => r.tanggal ? new Date(r.tanggal).getFullYear().toString() : '').filter(Boolean)
    )
    return Array.from(set).sort((a, b) => Number(b) - Number(a))
  }, [data])

  // ── Filtered data ──
  const filtered = useMemo(() => {
    return data.filter(row => {
      const dpp = row.total_nilai_transaksi || (row.total_jasa + row.total_barang)
      if (search) {
        const q = search.toLowerCase()
        const match = [row.pembeli, row.nomor_transaksi, row.npwp_pembeli, row.masa, row.kode_jasa, row.jenis_jasa]
          .some(v => v?.toLowerCase().includes(q))
        if (!match) return false
      }
      if (filterMasa && row.masa !== filterMasa) return false
      if (filterTahun && row.tanggal) {
        if (new Date(row.tanggal).getFullYear().toString() !== filterTahun) return false
      }
      if (filterStatus && (row.status_bupot ?? 'tidak_terbit') !== filterStatus) return false
      if (filterMinDPP && dpp < Number(filterMinDPP.replace(/\D/g, ''))) return false
      if (filterMaxDPP && dpp > Number(filterMaxDPP.replace(/\D/g, ''))) return false
      return true
    })
  }, [data, search, filterMasa, filterTahun, filterStatus, filterMinDPP, filterMaxDPP])

  const fmt = (n: number) => n.toLocaleString('id-ID')

  // ── Pagination ──
  const totalPages    = Math.ceil(filtered.length / itemsPerPage)
  const startIndex    = (currentPage - 1) * itemsPerPage
  const endIndex      = Math.min(startIndex + itemsPerPage, filtered.length)
  const displayedData = filtered.slice(startIndex, endIndex)

  const buildPageList = (): (number | '...')[] => {
    const pages: (number | '...')[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i)
      }
      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  const displayName   = user?.namaWP || 'User'
  const displayRole   = user?.profil?.bidangUsaha || 'Wajib Pajak'
  const displayAvatar = user?.namaWP?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'U'

  // ── Summary totals (filtered) ──
  const totalDPP   = filtered.reduce((s, r) => s + (r.total_nilai_transaksi || r.total_jasa + r.total_barang), 0)
  const totalPPh23 = filtered.reduce((s, r) => s + Math.round(r.total_jasa * 0.02), 0)

  const handleExportCSV = () => {
    const headers = ['No','Tanggal','Masa','Invoice','Nama Pemotong','NPWP','Kode Jasa','Jenis Jasa','DPP','Tarif','Pajak PPh23','Status Bupot']
    const rows = filtered.map((row, i) => {
      const dpp   = row.total_nilai_transaksi || (row.total_jasa + row.total_barang)
      const pajak = Math.round(row.total_jasa * 0.02)
      const status = row.status_bupot === 'terbit' ? 'Terbit' : row.status_bupot === 'proses' ? 'Proses' : 'Tidak Terbit'
      return [i+1, row.tanggal ? new Date(row.tanggal).toLocaleDateString('id-ID') : '-', row.masa || '-', row.nomor_transaksi || '-', row.pembeli || '-', row.npwp_pembeli || '-', row.kode_jasa || '-', row.jenis_jasa || '-', dpp, '2%', pajak, status].join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'kontrol_pph23.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', sans-serif; background: #f1f5f9; }
        .layout { display: flex; min-height: 100vh; }

        /* ── Topbar ── */
        .topbar { position: fixed; top: 0; left: 220px; right: 0; height: 64px; background: #fff; border-bottom: 1px solid #e8ecf0; display: flex; align-items: center; justify-content: space-between; padding: 0 2rem; z-index: 10; }
        .topbar-left { font-size: 1.35rem; font-weight: 700; color: #1e293b; }
        .topbar-right { display: flex; align-items: center; gap: 0.75rem; }
        .user-info-btn { display: flex; align-items: center; gap: 0.75rem; padding: 0.45rem 0.75rem; border-radius: 12px; cursor: pointer; border: none; background: transparent; transition: background 0.15s; text-align: right; }
        .user-info-btn:hover { background: #f1f5f9; }
        .user-info { text-align: right; }
        .user-name { font-size: 0.875rem; font-weight: 600; color: #1e293b; display: block; }
        .user-role { font-size: 0.75rem; color: #94a3b8; display: block; }
        .avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #6366f1); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.85rem; font-weight: 700; flex-shrink: 0; }
        .chevron-hint { color: #cbd5e1; flex-shrink: 0; }
        .btn-export { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.48rem 1rem; border-radius: 9px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 0.8rem; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .btn-export:hover { border-color: #3b82f6; color: #3b82f6; }

        .main { margin-left: 220px; padding-top: 64px; min-height: 100vh; }
        .main-content { padding: 1.75rem; }

        /* ── Error Toast ── */
        .error-toast { background: #fee2e2; border: 1.5px solid #fca5a5; border-radius: 10px; padding: 0.65rem 1rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem; color: #dc2626; font-weight: 600; }
        .error-toast button { background: none; border: none; cursor: pointer; color: #dc2626; display: flex; align-items: center; }

        /* ── Summary Cards ── */
        .summary-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .summary-card { background: #fff; border-radius: 12px; padding: 1.1rem 1.25rem; border: 1.5px solid #e2e8f0; }
        .summary-card .card-label { font-size: 0.68rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.35rem; }
        .summary-card .card-value { font-size: 1.25rem; font-weight: 800; color: #1e293b; }
        .summary-card .card-value.orange { color: #d97706; }
        .summary-card .card-value.blue   { color: #2563eb; }

        /* ── Toolbar ── */
        .toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .search-box { display: flex; align-items: center; gap: 0.5rem; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 9px; padding: 0.5rem 0.85rem; flex: 1; min-width: 200px; max-width: 340px; transition: border-color 0.15s; }
        .search-box:focus-within { border-color: #3b82f6; }
        .search-box input { border: none; outline: none; background: transparent; font-size: 0.84rem; color: #1e293b; width: 100%; }
        .search-box input::placeholder { color: #94a3b8; }
        .btn-filter { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.52rem 1rem; border-radius: 9px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 0.82rem; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.15s; white-space: nowrap; position: relative; }
        .btn-filter:hover { border-color: #3b82f6; color: #3b82f6; }
        .btn-filter.active { border-color: #3b82f6; background: #eff6ff; color: #2563eb; }
        .filter-badge { position: absolute; top: -6px; right: -6px; width: 17px; height: 17px; border-radius: 50%; background: #ef4444; color: #fff; font-size: 0.65rem; font-weight: 800; display: flex; align-items: center; justify-content: center; }
        .btn-clear { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.52rem 0.9rem; border-radius: 9px; border: 1.5px solid #fecaca; background: #fff5f5; font-size: 0.8rem; font-weight: 600; color: #ef4444; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .btn-clear:hover { background: #fee2e2; }
        .result-count { font-size: 0.78rem; color: #94a3b8; margin-left: auto; }
        .result-count strong { color: #1e293b; }

        /* ── Filter Panel ── */
        .filter-panel { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 1rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem 1.25rem; animation: slideDown 0.18s ease; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .filter-group label { display: block; font-size: 0.68rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; }
        .filter-group select, .filter-group input[type="text"] { width: 100%; padding: 0.45rem 0.7rem; border: 1.5px solid #e2e8f0; border-radius: 7px; font-size: 0.82rem; color: #1e293b; background: #fff; outline: none; transition: border-color 0.15s; appearance: none; -webkit-appearance: none; }
        .filter-group select:focus, .filter-group input[type="text"]:focus { border-color: #3b82f6; }
        .select-wrap { position: relative; }
        .select-wrap svg { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #94a3b8; }
        .filter-range { display: flex; align-items: center; gap: 0.4rem; }
        .filter-range input { flex: 1; }
        .filter-range span { font-size: 0.75rem; color: #94a3b8; flex-shrink: 0; }
        .filter-panel-footer { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 0.6rem; padding-top: 0.75rem; border-top: 1px solid #f1f5f9; }
        .btn-apply { padding: 0.5rem 1.25rem; border-radius: 8px; border: none; background: #2563eb; color: #fff; font-size: 0.82rem; font-weight: 700; cursor: pointer; transition: background 0.15s; }
        .btn-apply:hover { background: #1d4ed8; }

        /* ── Active Filter Tags ── */
        .filter-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
        .filter-tag { display: inline-flex; align-items: center; gap: 0.3rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 999px; padding: 0.2rem 0.65rem 0.2rem 0.5rem; font-size: 0.72rem; font-weight: 600; color: #2563eb; }
        .filter-tag button { background: none; border: none; cursor: pointer; color: #93c5fd; display: flex; align-items: center; padding: 0; line-height: 1; }
        .filter-tag button:hover { color: #2563eb; }

        /* ── Table ── */
        .excel-wrap { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); overflow: hidden; }
        .excel-title-bar { background: #2563eb; padding: 0.85rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
        .excel-title-bar h2 { color: #fff; font-size: 1rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
        .excel-title-bar span { font-size: 0.75rem; color: rgba(255,255,255,0.65); }
        .table-wrap { overflow-x: auto; }
        table.excel { width: 100%; border-collapse: collapse; font-size: 0.78rem; white-space: nowrap; }
        table.excel thead tr { background: #1d4ed8; }
        table.excel thead th { padding: 0.55rem 0.65rem; color: #fff; font-weight: 700; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.03em; border-right: 1px solid #2563eb; text-align: center; }
        table.excel thead th.right { text-align: right; }
        table.excel tbody tr:nth-child(odd)  { background: #dbeafe; }
        table.excel tbody tr:nth-child(even) { background: #eff6ff; }
        table.excel tbody tr:hover td { background: #bfdbfe; }
        table.excel td { padding: 0.45rem 0.65rem; color: #1e293b; border-right: 1px solid #bfdbfe; border-bottom: 1px solid #bfdbfe; vertical-align: middle; text-align: center; }
        table.excel td.left  { text-align: left; }
        table.excel td.right { text-align: right; }
        table.excel td.muted { color: #64748b; font-size: 0.72rem; }
        table.excel td.mono  { font-family: 'Courier New', monospace; font-size: 0.72rem; font-weight: 700; }
        table.excel td.bold  { font-weight: 700; }
        table.excel tfoot tr { background: #1e3a5f; }
        table.excel tfoot td { padding: 0.6rem 0.65rem; color: #fff; font-weight: 700; font-size: 0.78rem; border-right: 1px solid #2d4a6f; text-align: center; }
        table.excel tfoot td.right { text-align: right; }
        table.excel tfoot td.left  { text-align: left; }
        .empty-state   { text-align: center; padding: 3rem 1rem; color: #94a3b8; font-size: 0.875rem; }
        .loading-state { text-align: center; padding: 3rem 1rem; color: #94a3b8; font-size: 0.875rem; }
        .no-results { text-align: center; padding: 2.5rem 1rem; color: #94a3b8; font-size: 0.84rem; }
        .no-results strong { display: block; color: #475569; font-size: 0.9rem; margin-bottom: 0.3rem; }

        /* ── Status Dropdown ── */
        .status-cell { position: relative; display: inline-flex; align-items: center; gap: 0.35rem; }
        .status-select { appearance: none; -webkit-appearance: none; border-radius: 999px; padding: 0.22rem 1.75rem 0.22rem 0.7rem; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.04em; cursor: pointer; outline: none; transition: box-shadow 0.15s, opacity 0.15s; background-repeat: no-repeat; background-position: right 0.45rem center; background-size: 10px; border: 1.5px solid transparent; }
        .status-select:hover:not(:disabled) { box-shadow: 0 0 0 2.5px rgba(59,130,246,0.35); }
        .status-select:focus:not(:disabled) { box-shadow: 0 0 0 2.5px rgba(59,130,246,0.5); }
        .status-select:disabled { opacity: 0.55; cursor: wait; }
        .status-select.s-terbit { background-color: #dcfce7; color: #15803d; border-color: #86efac; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2315803d' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); }
        .status-select.s-tidak_terbit { background-color: #fee2e2; color: #dc2626; border-color: #fca5a5; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23dc2626' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); }
        .status-select.s-proses { background-color: #fef9c3; color: #a16207; border-color: #fde047; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23a16207' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); }
        .status-spinner { width: 13px; height: 13px; border: 2px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.55s linear infinite; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Pagination ── */
        .pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1.25rem; border-top: 1px solid #e2e8f0; flex-wrap: wrap; gap: 0.75rem; }
        .pagination-info { font-size: 0.78rem; color: #64748b; }
        .pagination-info strong { color: #1e293b; }
        .pagination-controls { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
        .per-page-wrap { display: flex; align-items: center; gap: 0.5rem; }
        .per-page-wrap span { font-size: 0.78rem; color: #64748b; white-space: nowrap; }
        .per-page-select-wrap { position: relative; }
        .per-page-select { appearance: none; -webkit-appearance: none; padding: 0.38rem 2rem 0.38rem 0.65rem; border-radius: 6px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 0.8rem; font-weight: 600; color: #1e293b; cursor: pointer; outline: none; transition: border-color 0.15s; }
        .per-page-select:focus { border-color: #3b82f6; }
        .per-page-select-wrap svg { position: absolute; right: 0.45rem; top: 50%; transform: translateY(-50%); pointer-events: none; color: #94a3b8; }
        .page-btns { display: flex; align-items: center; gap: 0.3rem; }
        .page-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; border: 1.5px solid #e2e8f0; background: #fff; color: #475569; font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: all 0.15s; line-height: 1; }
        .page-btn:hover:not(:disabled):not(.active) { border-color: #3b82f6; color: #2563eb; }
        .page-btn.active { border: 2px solid #2563eb; background: #2563eb; color: #fff; }
        .page-btn:disabled { color: #cbd5e1; cursor: not-allowed; }
        .page-ellipsis { width: 32px; text-align: center; font-size: 0.8rem; color: #94a3b8; line-height: 32px; }

        @media (max-width: 768px) {
          .topbar { left: 0; }
          .main { margin-left: 0; }
          .pagination-bar { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <div className="layout">
        <Sidebar />

        {/* ── Topbar ── */}
        <header className="topbar">
          <div className="topbar-left">Kontrol PPh</div>
          <div className="topbar-right">
            <button className="btn-export" onClick={handleExportCSV}>
              <Download size={13} /> Export CSV
            </button>
            <button className="user-info-btn" onClick={() => router.push('/dashboard/profil')} title="Lihat Profil">
              <div className="user-info">
                <span className="user-name">{displayName}</span>
                <span className="user-role">{displayRole}</span>
              </div>
              <div className="avatar">{displayAvatar}</div>
              <ChevronRight size={14} className="chevron-hint" />
            </button>
          </div>
        </header>

        <main className="main">
          <div className="main-content">

            {/* ── Error Toast ── */}
            {updateError && (
              <div className="error-toast">
                <span>{updateError}</span>
                <button onClick={() => setUpdateError(null)}><X size={14} /></button>
              </div>
            )}

            {/* ── Summary Cards ── */}
            {!loading && (
              <div className="summary-cards">
                <div className="summary-card">
                  <div className="card-label">Total Transaksi</div>
                  <div className="card-value blue">{filtered.length}</div>
                </div>
                <div className="summary-card">
                  <div className="card-label">Total DPP</div>
                  <div className="card-value">Rp {fmt(totalDPP)}</div>
                </div>
                <div className="summary-card">
                  <div className="card-label">Total PPh 23 (2%)</div>
                  <div className="card-value orange">Rp {fmt(totalPPh23)}</div>
                </div>
                <div className="summary-card">
                  <div className="card-label">Bupot Terbit</div>
                  <div className="card-value" style={{ color: '#15803d' }}>
                    {filtered.filter(r => r.status_bupot === 'terbit').length}
                  </div>
                </div>
                <div className="summary-card">
                  <div className="card-label">Bupot Belum Terbit</div>
                  <div className="card-value" style={{ color: '#dc2626' }}>
                    {filtered.filter(r => (r.status_bupot ?? 'tidak_terbit') === 'tidak_terbit').length}
                  </div>
                </div>
              </div>
            )}

            {/* ── Toolbar ── */}
            <div className="toolbar">
              <div className="search-box">
                <Search size={14} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Cari nama pemotong, invoice, kode jasa..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }} onClick={() => setSearch('')}>
                    <X size={13} />
                  </button>
                )}
              </div>

              <button
                className={`btn-filter ${filterOpen ? 'active' : ''}`}
                onClick={() => setFilterOpen(v => !v)}
              >
                <SlidersHorizontal size={14} />
                Filter
                <ChevronDown size={13} style={{ transform: filterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                {hasActiveFilter && <span className="filter-badge">!</span>}
              </button>

              {hasActiveFilter && (
                <button className="btn-clear" onClick={clearFilters}>
                  <X size={13} /> Reset Filter
                </button>
              )}

              <span className="result-count">
                Menampilkan <strong>{filtered.length}</strong> dari <strong>{data.length}</strong> transaksi
              </span>
            </div>

            {/* ── Filter Panel ── */}
            {filterOpen && (
              <div className="filter-panel">
                <div className="filter-group">
                  <label>Masa Pajak</label>
                  <div className="select-wrap">
                    <select value={filterMasa} onChange={e => setFilterMasa(e.target.value)}>
                      <option value="">Semua Masa</option>
                      {MASA_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={13} />
                  </div>
                </div>

                <div className="filter-group">
                  <label>Tahun</label>
                  <div className="select-wrap">
                    <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)}>
                      <option value="">Semua Tahun</option>
                      {tahunList.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown size={13} />
                  </div>
                </div>

                <div className="filter-group">
                  <label>Status Bupot</label>
                  <div className="select-wrap">
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                      <option value="">Semua Status</option>
                      {STATUS_BUPOT_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} />
                  </div>
                </div>

                <div className="filter-group">
                  <label>Rentang DPP (Rp)</label>
                  <div className="filter-range">
                    <input type="text" placeholder="Min" value={filterMinDPP} onChange={e => setFilterMinDPP(e.target.value)} />
                    <span>–</span>
                    <input type="text" placeholder="Max" value={filterMaxDPP} onChange={e => setFilterMaxDPP(e.target.value)} />
                  </div>
                </div>

                <div className="filter-panel-footer">
                  <button className="btn-clear" onClick={clearFilters}><X size={12} /> Reset</button>
                  <button className="btn-apply" onClick={() => setFilterOpen(false)}>Terapkan</button>
                </div>
              </div>
            )}

            {/* ── Active Filter Tags ── */}
            {hasActiveFilter && (
              <div className="filter-tags">
                {search && (
                  <span className="filter-tag">Cari: &ldquo;{search}&rdquo;<button onClick={() => setSearch('')}><X size={11} /></button></span>
                )}
                {filterMasa && (
                  <span className="filter-tag">Masa: {filterMasa}<button onClick={() => setFilterMasa('')}><X size={11} /></button></span>
                )}
                {filterTahun && (
                  <span className="filter-tag">Tahun: {filterTahun}<button onClick={() => setFilterTahun('')}><X size={11} /></button></span>
                )}
                {filterStatus && (
                  <span className="filter-tag">
                    Status: {STATUS_BUPOT_OPTIONS.find(o => o.value === filterStatus)?.label}
                    <button onClick={() => setFilterStatus('')}><X size={11} /></button>
                  </span>
                )}
                {(filterMinDPP || filterMaxDPP) && (
                  <span className="filter-tag">
                    DPP: {filterMinDPP || '0'} – {filterMaxDPP || '∞'}
                    <button onClick={() => { setFilterMinDPP(''); setFilterMaxDPP('') }}><X size={11} /></button>
                  </span>
                )}
              </div>
            )}

            {/* ── Table ── */}
            <div className="excel-wrap">
              <div className="excel-title-bar">
                <h2>Kontrol PPh</h2>
                {hasActiveFilter && (
                  <span>{filtered.length} dari {data.length} data ditampilkan</span>
                )}
              </div>
              <div className="table-wrap">
                {loading ? (
                  <div className="loading-state">Memuat data...</div>
                ) : data.length === 0 ? (
                  <div className="empty-state">Belum ada transaksi PPh 23 yang tercatat.</div>
                ) : filtered.length === 0 ? (
                  <div className="no-results">
                    <strong>Tidak ada data yang cocok</strong>
                    Coba ubah atau hapus filter yang aktif.
                  </div>
                ) : (
                  <table className="excel">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Tanggal</th>
                        <th>Masa</th>
                        <th>Invoice</th>
                        <th>Nama Pemotong</th>
                        <th>NPWP</th>
                        <th>Kode Jasa</th>
                        <th>Jenis Jasa</th>
                        <th className="right">DPP</th>
                        <th>Tarif</th>
                        <th className="right">Pajak</th>
                        <th>Status Bupot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedData.map((row, i) => {
                        const dpp   = row.total_nilai_transaksi || (row.total_jasa + row.total_barang)
                        const pajak = Math.round(row.total_jasa * 0.02)
                        const currentStatus = row.status_bupot ?? 'tidak_terbit'
                        return (
                          <tr key={row.id}>
                            <td className="muted">{startIndex + i + 1}</td>
                            <td>{row.tanggal ? new Date(row.tanggal).toLocaleDateString('id-ID') : '-'}</td>
                            <td>{row.masa || '-'}</td>
                            <td className="mono">{row.nomor_transaksi || '-'}</td>
                            <td className="left">{row.pembeli || '-'}</td>
                            <td className="muted">{row.npwp_pembeli || '-'}</td>
                            <td className="mono">{row.kode_jasa || '-'}</td>
                            <td className="left">{row.jenis_jasa || '-'}</td>
                            <td className="right">{fmt(dpp)}</td>
                            <td>2%</td>
                            <td className="right bold" style={{ color: '#d97706' }}>{fmt(pajak)}</td>
                            <td>
                              <div className="status-cell">
                                <select
                                  className={`status-select s-${currentStatus}`}
                                  value={currentStatus}
                                  disabled={updatingId === row.id}
                                  onChange={e => handleStatusChange(row.id, e.target.value)}
                                  title="Ubah status bupot"
                                >
                                  {STATUS_BUPOT_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                                {updatingId === row.id && <span className="status-spinner" />}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={8} className="left">TOTAL ({filtered.length} transaksi)</td>
                        <td className="right">{fmt(totalDPP)}</td>
                        <td>2%</td>
                        <td className="right">{fmt(totalPPh23)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              {/* ── Pagination Bar ── */}
              {!loading && filtered.length > 0 && (
                <div className="pagination-bar">
                  <span className="pagination-info">
                    Showing <strong>{startIndex + 1}</strong> to <strong>{endIndex}</strong> of <strong>{filtered.length}</strong> results
                  </span>
                  <div className="pagination-controls">
                    <div className="per-page-wrap">
                      <span>Per page</span>
                      <div className="per-page-select-wrap">
                        <select
                          className="per-page-select"
                          value={itemsPerPage}
                          onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1) }}
                        >
                          {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <ChevronDown size={12} />
                      </div>
                    </div>
                    <div className="page-btns">
                      <button className="page-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</button>
                      {buildPageList().map((p, idx) =>
                        p === '...' ? (
                          <span key={`e-${idx}`} className="page-ellipsis">…</span>
                        ) : (
                          <button key={p} className={`page-btn${currentPage === p ? ' active' : ''}`} onClick={() => setCurrentPage(p as number)}>{p}</button>
                        )
                      )}
                      <button className="page-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>›</button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    </>
  )
}