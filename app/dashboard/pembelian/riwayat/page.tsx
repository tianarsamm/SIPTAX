'use client'

import { useEffect, useState, useMemo, Dispatch, SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabaseClient } from '@/lib/supabaseClient'
import { MASA_OPTIONS, normalizeMasa } from '@/lib/masa'
import {
  ChevronRight, Search, SlidersHorizontal, X,
  ChevronDown, Download, History,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'

// ─────────────────────────────────────────────
//  Types — kolom sesuai tabel pembelian_ppn
// ─────────────────────────────────────────────
interface PembelianRecord {
  id: string
  user_id: string
  lawan_transaksi: string
  npwp: string | null
  no_faktur: string | null
  tanggal_faktur: string | null  // date → string dari Supabase
  masa: string | null
  tahun: number | null
  dpp: number
  ppn: number
  keterangan: string
  created_at: string
  updated_at: string
}

// Row mentah dari Supabase sebelum normalisasi angka
type RawRow = Omit<PembelianRecord, 'dpp' | 'ppn' | 'tahun'> & {
  dpp:   string | number | null
  ppn:   string | number | null
  tahun: string | number | null
}

const KETERANGAN_OPTIONS = [
  { value: 'Normal',                 label: 'Normal' },
  { value: 'Bendahara Pemerintahan', label: 'Bendahara Pemerintahan' },
  { value: 'TBTS',                   label: 'TBTS' },
  { value: 'Lainnya',                label: 'Lainnya' },
]

// ─────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────
export default function RiwayatPembelianPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [data, setData]       = useState<PembelianRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // ── Filter state ──
  const [filterOpen, setFilterOpen]             = useState(false)
  const [search, setSearch]                     = useState('')
  const [filterMasa, setFilterMasa]             = useState('')
  const [filterTahun, setFilterTahun]           = useState('')
  const [filterKeterangan, setFilterKeterangan] = useState('')
  const [filterMinDPP, setFilterMinDPP]         = useState('')
  const [filterMaxDPP, setFilterMaxDPP]         = useState('')

  // ── Pagination ──
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage]   = useState(1)

  const hasActiveFilter =
    search || filterMasa || filterTahun || filterKeterangan || filterMinDPP || filterMaxDPP

  const clearFilters = () => {
    setSearch(''); setFilterMasa(''); setFilterTahun('')
    setFilterKeterangan(''); setFilterMinDPP(''); setFilterMaxDPP('')
    setCurrentPage(1)
  }

  const setFilterAndResetPage = (setter: Dispatch<SetStateAction<string>>, value: string) => {
    setter(value)
    setCurrentPage(1)
  }

  const updateSearch           = (v: string) => setFilterAndResetPage(setSearch, v)
  const updateFilterMasa       = (v: string) => setFilterAndResetPage(setFilterMasa, v)
  const updateFilterTahun      = (v: string) => setFilterAndResetPage(setFilterTahun, v)
  const updateFilterKeterangan = (v: string) => setFilterAndResetPage(setFilterKeterangan, v)
  const updateFilterMinDPP     = (v: string) => setFilterAndResetPage(setFilterMinDPP, v)
  const updateFilterMaxDPP     = (v: string) => setFilterAndResetPage(setFilterMaxDPP, v)

  // ── Fetch data dari tabel pembelian_ppn ──
  // ── Fetch data dari tabel pembelian_ppn ──
useEffect(() => {
  if (authLoading) return
  if (!user?.id) {
    router.push('/login')
    return
  }

  const loadData = async () => {
    setLoading(true)
    setFetchError(null)

    const { data: rows, error } = await supabaseClient
      .from('pembelian_ppn')
      .select(`
        id,
        user_id,
        lawan_transaksi,
        npwp,
        no_faktur,
        tanggal_faktur,
        masa,
        tahun,
        dpp,
        ppn,
        keterangan,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    console.log('ROWS:', rows)
    console.log('ERROR:', error)

    if (error) {
      setFetchError(error.message)
      setLoading(false)
      return
    }

    if (rows) {
      const normalized: PembelianRecord[] = (rows as RawRow[]).map(row => ({
        ...row,
        dpp:
          typeof row.dpp === 'string'
            ? parseFloat(row.dpp) || 0
            : row.dpp ?? 0,

        ppn:
          typeof row.ppn === 'string'
            ? parseFloat(row.ppn) || 0
            : row.ppn ?? 0,

        tahun:
          typeof row.tahun === 'string'
            ? parseInt(row.tahun, 10) || null
            : row.tahun ?? null,

        lawan_transaksi: row.lawan_transaksi ?? '',
        keterangan: row.keterangan ?? 'Normal',
        updated_at: row.updated_at ?? '',
      }))

      setData(normalized)
    }

    setLoading(false)
  }

  loadData()
}, [user?.id, authLoading, router])
  // ── Daftar tahun unik dari data ──
  const tahunList = useMemo(() => {
    const set = new Set(
      data.map(r => r.tahun?.toString() ?? '').filter(Boolean)
    )
    return Array.from(set).sort((a, b) => Number(b) - Number(a))
  }, [data])

  // ── Filtered data ──
  const filtered = useMemo(() => {
    return data.filter(row => {
      const rowMasa = normalizeMasa(row.masa)
      if (search) {
        const q = search.toLowerCase()
        const match = [row.lawan_transaksi, row.no_faktur, row.npwp, rowMasa, row.keterangan]
          .some(v => v?.toLowerCase().includes(q))
        if (!match) return false
      }
      if (filterMasa       && rowMasa              !== normalizeMasa(filterMasa))       return false
      if (filterTahun      && row.tahun?.toString() !== filterTahun)      return false
      if (filterKeterangan && row.keterangan        !== filterKeterangan) return false
      if (filterMinDPP     && row.dpp < Number(filterMinDPP.replace(/\D/g, ''))) return false
      if (filterMaxDPP     && row.dpp > Number(filterMaxDPP.replace(/\D/g, ''))) return false
      return true
    })
  }, [data, search, filterMasa, filterTahun, filterKeterangan, filterMinDPP, filterMaxDPP])

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
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  // ── Summary totals (dari filtered) ──
  const totalDPP = filtered.reduce((s, r) => s + r.dpp, 0)
  const totalPPN = filtered.reduce((s, r) => s + r.ppn, 0)

  const fmt = (n: number) => n.toLocaleString('id-ID')

  // ── Export CSV ──
  const handleExportCSV = () => {
    const headers = ['No','Tanggal Faktur','No. Faktur','NPWP','Lawan Transaksi','Masa','Tahun','DPP','PPN','Keterangan','Dibuat']
    const csvRows = filtered.map((row, i) => [
      i + 1,
      row.tanggal_faktur
        ? new Date(row.tanggal_faktur).toLocaleDateString('id-ID')
        : '-',
      row.no_faktur        || '-',
      row.npwp             || '-',
      `"${row.lawan_transaksi}"`,
      normalizeMasa(row.masa) || '-',
      row.tahun            || '-',
      row.dpp,
      row.ppn,
      row.keterangan,
      new Date(row.created_at).toLocaleDateString('id-ID'),
    ].join(','))
    const csv  = [headers.join(','), ...csvRows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'riwayat_pembelian.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Keterangan badge ──
  function KetBadge({ val }: { val: string }) {
    const cls =
      val === 'Normal'                  ? 'ket-normal'    :
      val === 'Bendahara Pemerintahan'  ? 'ket-bendahara' :
      val === 'TBTS'                    ? 'ket-tbts'      : 'ket-lainnya'
    return <span className={cls}>{val}</span>
  }

  const displayName   = user?.namaWP || 'User'
  const displayRole   = user?.profil?.bidangUsaha || 'Wajib Pajak'
  const displayAvatar =
    user?.namaWP?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'U'

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        body { font-family: 'Segoe UI', sans-serif; background: #f1f5f9; }

        .layout { display: flex; min-height: 100vh; width: 100%; }

        /* ── Topbar ── */
        .topbar {
          position: fixed; top: 0; left: 220px; right: 0; height: 56px;
          background: #fff; border-bottom: 1px solid #e8ecf0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 1.5rem; z-index: 10; gap: 1rem;
        }
        .topbar-left { font-size: 1.2rem; font-weight: 700; color: #1e293b; white-space: nowrap; }
        .topbar-right { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
        .user-info-btn {
          display: flex; align-items: center; gap: 0.65rem;
          padding: 0.4rem 0.7rem; border-radius: 10px;
          cursor: pointer; border: none; background: transparent; transition: background 0.15s;
        }
        .user-info-btn:hover { background: #f1f5f9; }
        .user-info { text-align: right; }
        .user-name { font-size: 0.82rem; font-weight: 600; color: #1e293b; display: block; }
        .user-role { font-size: 0.72rem; color: #94a3b8; display: block; }
        .avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 0.8rem; font-weight: 700; flex-shrink: 0;
        }
        .btn-export {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.42rem 0.9rem; border-radius: 8px;
          border: 1.5px solid #e2e8f0; background: #fff;
          font-size: 0.78rem; font-weight: 600; color: #475569;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .btn-export:hover { border-color: #3b82f6; color: #3b82f6; }

        /* ── Main ── */
        .main { margin-left: 220px; padding-top: 56px; min-height: 100vh; width: calc(100% - 220px); min-width: 0; }
        .main-content { padding: 1.5rem; width: 100%; min-width: 0; }

        /* ── Error banner ── */
        .error-banner {
          background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px;
          padding: 0.75rem 1rem; margin-bottom: 1rem;
          font-size: 0.82rem; color: #dc2626; font-weight: 600;
        }

        /* ── Summary cards ── */
        .summary-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 1.25rem; }
        .summary-card { background: #fff; border-radius: 10px; padding: 0.9rem 1.1rem; border: 1.5px solid #e2e8f0; min-width: 0; }
        .card-label { font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.3rem; }
        .card-value { font-size: 1.05rem; font-weight: 800; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .card-value.blue   { color: #2563eb; }
        .card-value.orange { color: #d97706; }
        .card-value.green  { color: #15803d; }
        .card-value.purple { color: #7c3aed; }

        /* ── Toolbar ── */
        .toolbar { display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.85rem; flex-wrap: wrap; }
        .search-box {
          display: flex; align-items: center; gap: 0.5rem;
          background: #fff; border: 1.5px solid #e2e8f0; border-radius: 8px;
          padding: 0.45rem 0.8rem; flex: 1; min-width: 180px; max-width: 320px;
          transition: border-color 0.15s;
        }
        .search-box:focus-within { border-color: #3b82f6; }
        .search-box input { border: none; outline: none; background: transparent; font-size: 0.82rem; color: #1e293b; width: 100%; }
        .search-box input::placeholder { color: #94a3b8; }
        .btn-filter {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.46rem 0.9rem; border-radius: 8px;
          border: 1.5px solid #e2e8f0; background: #fff;
          font-size: 0.8rem; font-weight: 600; color: #475569;
          cursor: pointer; transition: all 0.15s; white-space: nowrap; position: relative;
        }
        .btn-filter:hover { border-color: #3b82f6; color: #3b82f6; }
        .btn-filter.active { border-color: #3b82f6; background: #eff6ff; color: #2563eb; }
        .filter-badge {
          position: absolute; top: -6px; right: -6px; width: 16px; height: 16px;
          border-radius: 50%; background: #ef4444; color: #fff;
          font-size: 0.62rem; font-weight: 800; display: flex; align-items: center; justify-content: center;
        }
        .btn-clear {
          display: inline-flex; align-items: center; gap: 0.35rem;
          padding: 0.46rem 0.85rem; border-radius: 8px;
          border: 1.5px solid #fecaca; background: #fff5f5;
          font-size: 0.78rem; font-weight: 600; color: #ef4444;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .btn-clear:hover { background: #fee2e2; }
        .result-count { font-size: 0.76rem; color: #94a3b8; margin-left: auto; white-space: nowrap; }
        .result-count strong { color: #1e293b; }

        /* ── Filter Panel ── */
        .filter-panel {
          background: #fff; border: 1.5px solid #e2e8f0; border-radius: 10px;
          padding: 1.1rem 1.25rem; margin-bottom: 0.85rem;
          display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 0.85rem 1.1rem; animation: slideDown 0.18s ease;
        }
        @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        .filter-group label { display: block; font-size: 0.65rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.35rem; }
        .filter-group select,
        .filter-group input[type="text"] {
          width: 100%; padding: 0.42rem 0.65rem; border: 1.5px solid #e2e8f0;
          border-radius: 6px; font-size: 0.8rem; color: #1e293b; background: #fff;
          outline: none; transition: border-color 0.15s; appearance: none; -webkit-appearance: none;
        }
        .filter-group select:focus, .filter-group input[type="text"]:focus { border-color: #3b82f6; }
        .select-wrap { position: relative; }
        .select-wrap svg { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #94a3b8; }
        .filter-range { display: flex; align-items: center; gap: 0.4rem; }
        .filter-range input { flex: 1; min-width: 0; }
        .filter-range span { font-size: 0.72rem; color: #94a3b8; flex-shrink: 0; }
        .filter-panel-footer { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 0.5rem; padding-top: 0.65rem; border-top: 1px solid #f1f5f9; }
        .btn-apply { padding: 0.45rem 1.1rem; border-radius: 7px; border: none; background: #2563eb; color: #fff; font-size: 0.8rem; font-weight: 700; cursor: pointer; }
        .btn-apply:hover { background: #1d4ed8; }

        /* ── Active filter tags ── */
        .filter-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.7rem; }
        .filter-tag {
          display: inline-flex; align-items: center; gap: 0.3rem;
          background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 999px;
          padding: 0.18rem 0.6rem 0.18rem 0.45rem; font-size: 0.7rem; font-weight: 600; color: #2563eb;
        }
        .filter-tag button { background: none; border: none; cursor: pointer; color: #93c5fd; display: flex; align-items: center; padding: 0; }
        .filter-tag button:hover { color: #2563eb; }

        /* ── Table ── */
        .excel-wrap { background: #fff; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,.06); overflow: hidden; }
        .excel-title-bar {
          background: #2563eb; padding: 0.75rem 1.25rem;
          display: flex; align-items: center; justify-content: space-between;
        }
        .excel-title-bar h2 { color: #fff; font-size: 0.9rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
        .excel-title-bar span { font-size: 0.72rem; color: rgba(255,255,255,0.65); }
        .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }

        table.excel { width: 100%; border-collapse: collapse; font-size: 0.78rem; white-space: nowrap; min-width: 860px; }
        table.excel thead tr { background: #1d4ed8; }
        table.excel thead th {
          padding: 0.5rem 0.65rem; color: #fff; font-weight: 700; font-size: 0.68rem;
          text-transform: uppercase; letter-spacing: 0.03em;
          border-right: 1px solid rgba(255,255,255,0.15); text-align: center;
        }
        table.excel thead th.right { text-align: right; }
        table.excel thead th.left  { text-align: left; }
        table.excel thead tr.sub-header { background: #2563eb; }
        table.excel thead tr.sub-header th { font-size: 0.62rem; padding: 0.28rem 0.65rem; border-top: 1px solid rgba(255,255,255,0.2); }

        table.excel tbody tr:nth-child(odd)  { background: #dbeafe; }
        table.excel tbody tr:nth-child(even) { background: #eff6ff; }
        table.excel tbody tr:hover td { background: #bfdbfe; }
        table.excel td {
          padding: 0.42rem 0.65rem; color: #1e293b;
          border-right: 1px solid #bfdbfe; border-bottom: 1px solid #bfdbfe;
          vertical-align: middle; text-align: center;
        }
        table.excel td.left  { text-align: left; }
        table.excel td.right { text-align: right; }
        table.excel td.muted { color: #64748b; font-size: 0.7rem; }
        table.excel td.mono  { font-family: 'Courier New', monospace; font-size: 0.7rem; font-weight: 700; }
        table.excel td.bold  { font-weight: 700; }

        table.excel tfoot tr { background: #1e3a5f; }
        table.excel tfoot td {
          padding: 0.55rem 0.65rem; color: #fff; font-weight: 700;
          font-size: 0.78rem; border-right: 1px solid #2d4a6f; text-align: center;
        }
        table.excel tfoot td.right { text-align: right; }
        table.excel tfoot td.left  { text-align: left; }

        .empty-state   { text-align: center; padding: 3rem 1rem; color: #94a3b8; font-size: 0.875rem; }
        .loading-state { text-align: center; padding: 3rem 1rem; color: #94a3b8; font-size: 0.875rem; }
        .no-results { text-align: center; padding: 2.5rem 1rem; color: #94a3b8; font-size: 0.82rem; }
        .no-results strong { display: block; color: #475569; font-size: 0.88rem; margin-bottom: 0.3rem; }

        /* ── Keterangan badges ── */
        .ket-normal    { display: inline-block; padding: 0.16rem 0.55rem; border-radius: 999px; font-size: 0.66rem; font-weight: 700; background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .ket-bendahara { display: inline-block; padding: 0.16rem 0.55rem; border-radius: 999px; font-size: 0.66rem; font-weight: 700; background: #fef9c3; color: #a16207; border: 1px solid #fde047; }
        .ket-tbts      { display: inline-block; padding: 0.16rem 0.55rem; border-radius: 999px; font-size: 0.66rem; font-weight: 700; background: #f3e8ff; color: #7c3aed; border: 1px solid #d8b4fe; }
        .ket-lainnya   { display: inline-block; padding: 0.16rem 0.55rem; border-radius: 999px; font-size: 0.66rem; font-weight: 700; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

        /* ── Pagination ── */
        .pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1.25rem; border-top: 1px solid #e2e8f0; flex-wrap: wrap; gap: 0.75rem; }
        .pagination-info { font-size: 0.78rem; color: #64748b; }
        .pagination-info strong { color: #1e293b; }
        .pagination-controls { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
        .per-page-wrap { display: flex; align-items: center; gap: 0.5rem; }
        .per-page-wrap span { font-size: 0.78rem; color: #64748b; white-space: nowrap; }
        .per-page-select-wrap { position: relative; }
        .per-page-select { appearance: none; -webkit-appearance: none; padding: 0.38rem 2rem 0.38rem 0.65rem; border-radius: 6px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 0.8rem; font-weight: 600; color: #1e293b; cursor: pointer; outline: none; }
        .per-page-select:focus { border-color: #3b82f6; }
        .per-page-select-wrap svg { position: absolute; right: 0.45rem; top: 50%; transform: translateY(-50%); pointer-events: none; color: #94a3b8; }
        .page-btns { display: flex; align-items: center; gap: 0.3rem; }
        .page-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; border: 1.5px solid #e2e8f0; background: #fff; color: #475569; font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: all 0.15s; }
        .page-btn:hover:not(:disabled):not(.active) { border-color: #3b82f6; color: #2563eb; }
        .page-btn.active { border: 2px solid #2563eb; background: #2563eb; color: #fff; }
        .page-btn:disabled { color: #cbd5e1; cursor: not-allowed; }
        .page-ellipsis { width: 32px; text-align: center; font-size: 0.8rem; color: #94a3b8; line-height: 32px; }

        /* ── Responsive ── */
        @media (max-width: 1024px) { .summary-cards { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px) {
          .topbar { left: 0; }
          .main { margin-left: 0; width: 100%; }
          .summary-cards { grid-template-columns: repeat(2, 1fr); }
          .search-box { max-width: 100%; }
          .pagination-bar { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <div className="layout">
        <Sidebar />

        {/* ── Topbar ── */}
        <header className="topbar">
          <div className="topbar-left">Riwayat Pembelian</div>
          <div className="topbar-right">
            <button className="btn-export" onClick={handleExportCSV}>
              <Download size={13} /> Export CSV
            </button>
            <button className="user-info-btn" onClick={() => router.push('/dashboard/profil')}>
              <div className="user-info">
                <span className="user-name">{displayName}</span>
                <span className="user-role">{displayRole}</span>
              </div>
              <div className="avatar">{displayAvatar}</div>
              <ChevronRight size={14} style={{ color: '#cbd5e1' }} />
            </button>
          </div>
        </header>

        <main className="main">
          <div className="main-content">

            {/* ── Error banner ── */}
            {fetchError && (
              <div className="error-banner">
                ⚠️ Gagal memuat data: {fetchError}
              </div>
            )}

            {/* ── Summary cards ── */}
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
                  <div className="card-label">Total PPN (11%)</div>
                  <div className="card-value orange">Rp {fmt(totalPPN)}</div>
                </div>
                <div className="summary-card">
                  <div className="card-label">Total Nilai</div>
                  <div className="card-value green">Rp {fmt(totalDPP + totalPPN)}</div>
                </div>
                <div className="summary-card">
                  <div className="card-label">Bendahara</div>
                  <div className="card-value purple">
                    {filtered.filter(r => r.keterangan === 'Bendahara Pemerintahan').length}
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
                  placeholder="Cari nama, no. faktur, NPWP..."
                  value={search}
                  onChange={e => updateSearch(e.target.value)}
                />
                {search && (
                  <button
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex' }}
                    onClick={() => setSearch('')}
                  >
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

            {/* ── Filter panel ── */}
            {filterOpen && (
              <div className="filter-panel">
                <div className="filter-group">
                  <label>Masa Pajak</label>
                  <div className="select-wrap">
                    <select value={filterMasa} onChange={e => updateFilterMasa(e.target.value)}>
                      <option value="">Semua Masa</option>
                      {MASA_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={13} />
                  </div>
                </div>
                <div className="filter-group">
                  <label>Tahun</label>
                  <div className="select-wrap">
                    <select value={filterTahun} onChange={e => updateFilterTahun(e.target.value)}>
                      <option value="">Semua Tahun</option>
                      {tahunList.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown size={13} />
                  </div>
                </div>
                <div className="filter-group">
                  <label>Keterangan</label>
                  <div className="select-wrap">
                    <select value={filterKeterangan} onChange={e => updateFilterKeterangan(e.target.value)}>
                      <option value="">Semua</option>
                      {KETERANGAN_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} />
                  </div>
                </div>
                <div className="filter-group">
                  <label>Rentang DPP (Rp)</label>
                  <div className="filter-range">
                    <input
                      type="text"
                      placeholder="Min"
                      value={filterMinDPP}
                      onChange={e => updateFilterMinDPP(e.target.value)}
                    />
                    <span>–</span>
                    <input
                      type="text"
                      placeholder="Max"
                      value={filterMaxDPP}
                      onChange={e => updateFilterMaxDPP(e.target.value)}
                    />
                  </div>
                </div>
                <div className="filter-panel-footer">
                  <button className="btn-clear" onClick={clearFilters}><X size={12} /> Reset</button>
                  <button className="btn-apply" onClick={() => setFilterOpen(false)}>Terapkan</button>
                </div>
              </div>
            )}

            {/* ── Active filter tags ── */}
            {hasActiveFilter && (
              <div className="filter-tags">
                {search && (
                  <span className="filter-tag">
                    Cari: &ldquo;{search}&rdquo;
                    <button onClick={() => setSearch('')}><X size={11} /></button>
                  </span>
                )}
                {filterMasa && (
                  <span className="filter-tag">
                    Masa: {filterMasa}
                    <button onClick={() => setFilterMasa('')}><X size={11} /></button>
                  </span>
                )}
                {filterTahun && (
                  <span className="filter-tag">
                    Tahun: {filterTahun}
                    <button onClick={() => setFilterTahun('')}><X size={11} /></button>
                  </span>
                )}
                {filterKeterangan && (
                  <span className="filter-tag">
                    Keterangan: {filterKeterangan}
                    <button onClick={() => setFilterKeterangan('')}><X size={11} /></button>
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
                <h2>
                  <History size={14} style={{ display:'inline', marginRight:'0.4rem', verticalAlign:'middle' }} />
                  Riwayat Pembelian
                </h2>
                {hasActiveFilter && (
                  <span>{filtered.length} dari {data.length} data ditampilkan</span>
                )}
              </div>

              <div className="table-wrap">
                {loading ? (
                  <div className="loading-state">Memuat data dari database...</div>
                ) : data.length === 0 ? (
                  <div className="empty-state">
                    Belum ada transaksi pembelian.{' '}
                    <span
                      style={{ color:'#2563eb', cursor:'pointer', textDecoration:'underline' }}
                      onClick={() => router.push('/dashboard/pembelian/input')}
                    >
                      Tambah sekarang
                    </span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="no-results">
                    <strong>Tidak ada data yang cocok</strong>
                    Coba ubah atau hapus filter yang aktif.
                  </div>
                ) : (
                  <table className="excel">
                    <thead>
                      <tr>
                        <th rowSpan={2} style={{ width: 40 }}>No</th>
                        <th rowSpan={2} className="left" style={{ minWidth: 160 }}>Lawan Transaksi</th>
                        <th
                          colSpan={8}
                          style={{
                            textAlign: 'center',
                            background: '#1a45b0',
                            borderBottom: '1px solid rgba(255,255,255,0.25)',
                            letterSpacing: '0.08em',
                          }}
                        >
                          FAKTUR PAJAK STANDAR
                        </th>
                      </tr>
                      <tr className="sub-header">
                        <th style={{ width: 140 }}>NPWP</th>
                        <th style={{ width: 130 }}>No. Faktur</th>
                        <th style={{ width: 105 }}>Tgl. Faktur</th>
                        <th style={{ width: 90  }}>Masa</th>
                        <th style={{ width: 65  }}>Tahun</th>
                        <th className="right" style={{ width: 125 }}>DPP (Rp)</th>
                        <th className="right" style={{ width: 115 }}>PPN (Rp)</th>
                        <th style={{ width: 160 }}>Keterangan</th>
                      </tr>
                    </thead>

                    <tbody>
                      {displayedData.map((row, i) => (
                        <tr key={row.id}>
                          <td className="muted">{startIndex + i + 1}</td>
                          <td className="left bold">{row.lawan_transaksi}</td>
                          <td className="muted mono">{row.npwp || '-'}</td>
                          <td className="mono">{row.no_faktur || '-'}</td>
                          <td>
                            {row.tanggal_faktur
                              ? new Date(row.tanggal_faktur).toLocaleDateString('id-ID', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                })
                              : '-'}
                          </td>
                          <td>{normalizeMasa(row.masa) || '-'}</td>
                          <td>{row.tahun || '-'}</td>
                          <td className="right">{fmt(row.dpp)}</td>
                          <td className="right bold" style={{ color: '#d97706' }}>{fmt(row.ppn)}</td>
                          <td><KetBadge val={row.keterangan} /></td>
                        </tr>
                      ))}
                    </tbody>

                    <tfoot>
                      <tr>
                        <td colSpan={7} className="left">
                          TOTAL ({filtered.length} transaksi)
                        </td>
                        <td className="right">{fmt(totalDPP)}</td>
                        <td className="right">{fmt(totalPPN)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              {/* ── Pagination ── */}
              {!loading && filtered.length > 0 && (
                <div className="pagination-bar">
                  <span className="pagination-info">
                    Showing <strong>{startIndex + 1}</strong> to <strong>{endIndex}</strong> of{' '}
                    <strong>{filtered.length}</strong> results
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
                      <button
                        className="page-btn"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >‹</button>
                      {buildPageList().map((p, idx) =>
                        p === '...' ? (
                          <span key={`e-${idx}`} className="page-ellipsis">…</span>
                        ) : (
                          <button
                            key={p}
                            className={`page-btn${currentPage === p ? ' active' : ''}`}
                            onClick={() => setCurrentPage(p as number)}
                          >{p}</button>
                        )
                      )}
                      <button
                        className="page-btn"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                      >›</button>
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