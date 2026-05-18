'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, SlidersHorizontal, ChevronDown, X, Save, FileDown } from 'lucide-react'

import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/context/AuthContext'
import { supabaseClient } from '@/lib/supabaseClient'
import { MASA_OPTIONS as MASA_ORDER, normalizeMasa } from '@/lib/masa'

// ── Types ────────────────────────────────────────────────────────────────────

interface PPNRow {
  id: string
  masa: string
  tanggal: string
  penyerahan_lainnya_nilai_bruto: number
  penyerahan_lainnya_ppn_terutang: number
  penyerahan_pemungut_nilai_bruto: number
  penyerahan_pemungut_ppn_terutang: number
  total_penghasilan: number
  total_sd_bulan_ini: number
  total_ppn_terutang: number
  pmb_dpp_nilai_lain_nilai_bruto: number
  pmb_dpp_nilai_lain_ppn_terutang: number
  pmb_skp_luar_negeri_nilai_bruto: number
  pmb_skp_luar_negeri_ppn_terutang: number
  total_pmb_penghasilan: number
  total_pmb_sd_bulan_ini: number
  total_pmb_ppn_terutang: number
  kompensasi_kelebihan_pm: number
  total_ppn_terutang_final: number
  ppn_kurang_lebih_bayar_spt: number
  ppn_diperhitungkan: number
  ppn_kurang_bayar: number
  ntpn_surat_ket_pbk: string
  tgl_bayar?: string
  tgl_lapor?: string
  tgl_pengembalian?: string
  status_lapor?: string
}

interface TransaksiRow {
  id: string
  masa: string | null
  tanggal: string
  jenis_wp: string | null
  total_nilai_transaksi: number | null
  has_ppn: boolean | null
}

interface PembelianPPNRow {
  id: string
  masa: string | null
  tanggal_faktur: string | null
  dpp: number
  ppn: number
  keterangan: string | null
}

interface PembelianRow {
  masa: string
  nb_normal: number
  ppn_normal: number
  nb_lainnya: number
  ppn_lainnya: number
  penghasilan: number
  sd_bulan_ini: number
  total_ppn: number
}

interface PenjualanRow {
  masa: string
  nb_badan: number
  ppn_badan: number
  nb_bendahara: number
  ppn_bendahara: number
  penghasilan: number
  sd_bulan_ini: number
  total_ppn: number
}

interface PerhitunganFormState {
  kompensasi: string
  ppn_kurang_lebih: string
  ppn_dibayarkan: string
  ntpn: string
  tgl_bayar: string
  tgl_lapor: string
  tgl_pengembalian: string
}

interface SavedPerhitungan extends PerhitunganFormState {
  totalPenyerahan: number
  totalPPN: number
  totalPM: number
  totalPPNTerutang: number
  ppnKurangBayarFinal: number
  savedAt: string
}

type TabKey = 'penjualan' | 'pembelian' | 'perhitungan'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'penjualan',   label: 'Penjualan' },
  { key: 'pembelian',   label: 'Pembelian' },
  { key: 'perhitungan', label: 'Perhitungan Akhir' },
]

const isBendahara = (jenis_wp: string | null): boolean => {
  if (!jenis_wp) return false
  return jenis_wp.toLowerCase().includes('bendahara')
}

const PPN_RATE = 0.11

export default function KontrolPPNPage() {
  const { user, loading: authLoading } = useAuth()

  const [data, setData]             = useState<PPNRow[]>([])
  const [loadingPPN, setLoadingPPN] = useState(true)
  const [transaksi, setTransaksi]   = useState<TransaksiRow[]>([])
  const [loadingTrx, setLoadingTrx] = useState(true)
  const [pembelian, setPembelian]   = useState<PembelianPPNRow[]>([])
  const [loadingPmb, setLoadingPmb] = useState(true)

  const [activeTab, setActiveTab]     = useState<TabKey>('penjualan')
  const [search, setSearch]           = useState('')
  const [filterMasa, setFilterMasa]   = useState('')
  const [filterOpen, setFilterOpen]   = useState(false)

  const [perhitunganForm, setPerhitunganForm] = useState<PerhitunganFormState>({
    kompensasi: '0',
    ppn_kurang_lebih: '0',
    ppn_dibayarkan: '0',
    ntpn: '',
    tgl_bayar: '',
    tgl_lapor: '',
    tgl_pengembalian: '',
  })

  // ── State untuk simpan & PDF ─────────────────────────────────────────────
  const [savedData, setSavedData]       = useState<SavedPerhitungan | null>(null)
  const [saveSuccess, setSaveSuccess]   = useState(false)

  const parseNumber = (value: string) => {
    if (!value) return 0
    const cleaned = value.replace(/Rp\.\s?/g, '').replace(/\./g, '').replace(/,/g, '')
    return Number(cleaned) || 0
  }

  const formatCurrency = (value: string | number): string => {
    const num = typeof value === 'string' ? parseNumber(value) : value
    if (isNaN(num)) return 'Rp.0'
    if (num === 0) return ''
    return 'Rp.' + Math.floor(num).toLocaleString('id-ID')
  }

  const handleCurrencyInput = (e: React.ChangeEvent<HTMLInputElement>, field: keyof PerhitunganFormState) => {
    const input = e.target.value
    const cleanedNum = parseNumber(input)
    setPerhitunganForm(prev => ({ ...prev, [field]: cleanedNum.toString() }))
  }

  const handleCurrencyBlur = (e: React.FocusEvent<HTMLInputElement>, field: keyof PerhitunganFormState) => {
    const num = parseNumber(e.target.value)
    setPerhitunganForm(prev => ({ ...prev, [field]: num.toString() }))
  }

  const logFetchError = (context: string, error: unknown) => {
    if (error instanceof Error) {
      console.warn(context, error.message)
    } else if (error && typeof error === 'object') {
      try {
        console.warn(context, JSON.stringify(error))
      } catch {
        console.warn(context, error)
      }
    } else {
      console.warn(context, error)
    }
  }

  // ── Fetch kontrol_ppn ────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!user?.id) return
    const fetchData = async () => {
      setLoadingPPN(true)
      try {
        const { data: rows, error } = await supabaseClient
          .from('kontrol_ppn')
          .select(`
            id, masa, tanggal,
            penyerahan_lainnya_nilai_bruto, penyerahan_lainnya_ppn_terutang,
            penyerahan_pemungut_nilai_bruto, penyerahan_pemungut_ppn_terutang,
            total_penghasilan, total_sd_bulan_ini, total_ppn_terutang,
            pmb_dpp_nilai_lain_nilai_bruto, pmb_dpp_nilai_lain_ppn_terutang,
            pmb_skp_luar_negeri_nilai_bruto, pmb_skp_luar_negeri_ppn_terutang,
            total_pmb_penghasilan, total_pmb_sd_bulan_ini, total_pmb_ppn_terutang,
            kompensasi_kelebihan_pm, total_ppn_terutang_final,
            ppn_kurang_lebih_bayar_spt, ppn_diperhitungkan, ppn_kurang_bayar,
            ntpn_surat_ket_pbk, tgl_bayar, tgl_lapor, tgl_pengembalian, status_lapor
          `)
          .eq('user_id', user.id)
          .order('tanggal', { ascending: true })
          .range(0, 49)
        if (error) { logFetchError('kontrol_ppn fetch error', error); setData([]) }
        else setData(rows || [])
      } catch (e) { logFetchError('kontrol_ppn exception', e); setData([]) }
      finally { setLoadingPPN(false) }
    }
    fetchData()
  }, [user?.id, authLoading])

  // ── Fetch transaksi ──────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!user?.id) return
    const fetchTrx = async () => {
      setLoadingTrx(true)
      try {
        const { data: rows, error } = await supabaseClient
          .from('transaksi')
          .select('id, masa, tanggal, jenis_wp, total_nilai_transaksi, has_ppn')
          .eq('user_id', user.id)
          .order('tanggal', { ascending: true })
          .range(0, 49)
        if (error) { logFetchError('transaksi fetch error', error); setTransaksi([]) }
        else setTransaksi(rows || [])
      } catch (e) { logFetchError('transaksi exception', e); setTransaksi([]) }
      finally { setLoadingTrx(false) }
    }
    fetchTrx()
  }, [user?.id, authLoading])

  // ── Fetch pembelian_ppn ───────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!user?.id) return
    const fetchPmb = async () => {
      setLoadingPmb(true)
      try {
        const { data: rows, error } = await supabaseClient
          .from('pembelian_ppn')
          .select('id, masa, tanggal_faktur, dpp, ppn, keterangan')
          .eq('user_id', user.id)
          .order('tanggal_faktur', { ascending: true })
          .range(0, 49)
        if (error) { logFetchError('pembelian_ppn fetch error', error); setPembelian([]) }
        else {
          const normalized = (rows || []).map((r: Record<string, unknown>) => ({
            ...r,
            dpp: typeof r.dpp === 'string' ? parseFloat(r.dpp as string) || 0 : (r.dpp as number) ?? 0,
            ppn: typeof r.ppn === 'string' ? parseFloat(r.ppn as string) || 0 : (r.ppn as number) ?? 0,
            keterangan: (r.keterangan as string) ?? 'Normal',
          })) as PembelianPPNRow[]
          setPembelian(normalized)
        }
      } catch (e) { logFetchError('pembelian_ppn exception', e); setPembelian([]) }
      finally { setLoadingPmb(false) }
    }
    fetchPmb()
  }, [user?.id, authLoading])

  // ── Aggregate: penjualan ─────────────────────────────────────────────────
  const penjualanRows = useMemo((): PenjualanRow[] => {
    const map: Record<string, { nb_badan: number; ppn_badan: number; nb_bendahara: number; ppn_bendahara: number }> = {}
    for (const t of transaksi) {
      const masa = normalizeMasa(t.masa ?? 'Tidak Diketahui')
      if (!map[masa]) map[masa] = { nb_badan: 0, ppn_badan: 0, nb_bendahara: 0, ppn_bendahara: 0 }
      const nb  = t.total_nilai_transaksi ?? 0
      const ppn = t.has_ppn ? nb * PPN_RATE : 0
      if (isBendahara(t.jenis_wp)) {
        map[masa].nb_bendahara  += nb
        map[masa].ppn_bendahara += ppn
      } else {
        map[masa].nb_badan  += nb
        map[masa].ppn_badan += ppn
      }
    }
    const rows: PenjualanRow[] = MASA_ORDER.filter(m => map[m]).map(m => {
      const g = map[m]
      const penghasilan = g.nb_badan + g.nb_bendahara
      const total_ppn   = g.ppn_badan + g.ppn_bendahara
      return { masa: m, ...g, penghasilan, sd_bulan_ini: 0, total_ppn }
    })
    for (const m of Object.keys(map)) {
      if (!MASA_ORDER.includes(m)) {
        const g = map[m]
        rows.push({ masa: m, ...g, penghasilan: g.nb_badan + g.nb_bendahara, sd_bulan_ini: 0, total_ppn: g.ppn_badan + g.ppn_bendahara })
      }
    }
    let cum = 0
    for (const r of rows) { cum += r.penghasilan; r.sd_bulan_ini = cum }
    return rows
  }, [transaksi])

  // ── Aggregate: pembelian ─────────────────────────────────────────────────
  const pembelianRows = useMemo((): PembelianRow[] => {
    const map: Record<string, { nb_normal: number; ppn_normal: number; nb_lainnya: number; ppn_lainnya: number }> = {}
    for (const p of pembelian) {
      const masa = normalizeMasa(p.masa ?? 'Tidak Diketahui')
      if (!map[masa]) map[masa] = { nb_normal: 0, ppn_normal: 0, nb_lainnya: 0, ppn_lainnya: 0 }
      const isNormal = !p.keterangan || p.keterangan.toLowerCase() === 'normal'
      if (isNormal) {
        map[masa].nb_normal  += p.dpp ?? 0
        map[masa].ppn_normal += p.ppn ?? 0
      } else {
        map[masa].nb_lainnya  += p.dpp ?? 0
        map[masa].ppn_lainnya += p.ppn ?? 0
      }
    }
    const rows: PembelianRow[] = MASA_ORDER.filter(m => map[m]).map(m => {
      const g = map[m]
      const penghasilan = g.nb_normal + g.nb_lainnya
      const total_ppn   = g.ppn_normal + g.ppn_lainnya
      return { masa: m, ...g, penghasilan, sd_bulan_ini: 0, total_ppn }
    })
    for (const m of Object.keys(map)) {
      if (!MASA_ORDER.includes(m)) {
        const g = map[m]
        rows.push({ masa: m, ...g, penghasilan: g.nb_normal + g.nb_lainnya, sd_bulan_ini: 0, total_ppn: g.ppn_normal + g.ppn_lainnya })
      }
    }
    let cum = 0
    for (const r of rows) { cum += r.penghasilan; r.sd_bulan_ini = cum }
    return rows
  }, [pembelian])

  // ── Filters ──────────────────────────────────────────────────────────────
  const filteredPembelian = useMemo(() => pembelianRows.filter(r => {
    const rowMasa = normalizeMasa(r.masa)
    if (filterMasa && rowMasa !== normalizeMasa(filterMasa)) return false
    if (search && !rowMasa.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [pembelianRows, filterMasa, search])

  const filteredPenjualan = useMemo(() => penjualanRows.filter(r => {
    const rowMasa = normalizeMasa(r.masa)
    if (filterMasa && rowMasa !== normalizeMasa(filterMasa)) return false
    if (search && !rowMasa.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [penjualanRows, filterMasa, search])

  const filtered = useMemo(() => data.filter(row => {
    const rowMasa = normalizeMasa(row.masa)
    if (search) {
      const q = search.toLowerCase()
      const hit = [rowMasa, row.ntpn_surat_ket_pbk, row.status_lapor]
        .filter(Boolean).some(v => v?.toLowerCase().includes(q))
      if (!hit) return false
    }
    if (filterMasa && rowMasa !== normalizeMasa(filterMasa)) return false
    return true
  }), [data, search, filterMasa])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmt = (n: number) => Number(n || 0).toLocaleString('id-ID')
  const sumPPN  = (key: keyof PPNRow) => filtered.reduce((s, r) => s + ((r[key] as number) || 0), 0)
  const sumPenj = (key: keyof PenjualanRow) => filteredPenjualan.reduce((s, r) => s + ((r[key] as number) || 0), 0)
  const sumPmb  = (key: keyof PembelianRow) => filteredPembelian.reduce((s, r) => s + ((r[key] as number) || 0), 0)

  const totalPenyerahan     = sumPenj('penghasilan')
  const totalPPN            = sumPenj('total_ppn')
  const totalPM             = sumPmb('total_ppn')
  const totalKurangBayar    = sumPPN('ppn_kurang_bayar')
  const totalPPNTerutang    = totalPPN - totalPM - parseNumber(perhitunganForm.kompensasi)
  const ppnKurangBayarFinal = totalPPNTerutang - parseNumber(perhitunganForm.ppn_kurang_lebih) - parseNumber(perhitunganForm.ppn_dibayarkan)

  // ── Simpan (in-memory) ────────────────────────────────────────────────────
  const handleSimpan = () => {
    setSavedData({
      ...perhitunganForm,
      totalPenyerahan,
      totalPPN,
      totalPM,
      totalPPNTerutang,
      ppnKurangBayarFinal,
      savedAt: new Date().toLocaleString('id-ID'),
    })
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2500)
  }

  // ── Download PDF (print dialog) ───────────────────────────────────────────
  const handleDownloadPDF = () => {
    const d = savedData
    if (!d) return

    const rp = (n: number) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Bukti Perhitungan Akhir PPN</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; padding: 48px; max-width: 720px; margin: auto; }
  @media print { body { padding: 32px; } }

  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 3px solid #1e40af; padding-bottom: 18px; }
  .header-title { }
  .header-title h1 { font-size: 20px; font-weight: 800; color: #1e40af; letter-spacing: -0.3px; }
  .header-title p { font-size: 12px; color: #64748b; margin-top: 4px; }
  .header-badge { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 14px; text-align: right; }
  .header-badge .badge-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #3b82f6; font-weight: 700; }
  .header-badge .badge-val { font-size: 13px; font-weight: 700; color: #1e40af; margin-top: 2px; }

  .section { margin-bottom: 22px; }
  .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #f1f5f9; }

  .row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f8fafc; }
  .row:last-child { border-bottom: none; }
  .row .label { font-size: 13px; color: #475569; }
  .row .value { font-size: 13px; font-weight: 700; color: #0f172a; text-align: right; }

  .highlight-box { background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 10px; padding: 14px 18px; margin: 18px 0; }
  .highlight-box .row { border-bottom: none; padding: 4px 0; }
  .highlight-box .label { font-size: 14px; font-weight: 700; color: #dc2626; }
  .highlight-box .value { font-size: 18px; font-weight: 800; color: #dc2626; }

  .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 22px; }
  .scard { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; }
  .scard .s-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 5px; }
  .scard .s-val { font-size: 13px; font-weight: 800; color: #0f172a; }

  .footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
  .footer p { font-size: 10px; color: #94a3b8; }
</style>
</head>
<body>

<div class="header">
  <div class="header-title">
    <h1>Bukti Perhitungan Akhir PPN</h1>
    <p>Dokumen ini digenerate secara otomatis dari sistem</p>
  </div>
  <div class="header-badge">
    <div class="badge-label">Disimpan pada</div>
    <div class="badge-val">${d.savedAt}</div>
  </div>
</div>

<div class="summary-grid">
  <div class="scard">
    <div class="s-label">Total Penjualan</div>
    <div class="s-val">${rp(d.totalPenyerahan)}</div>
  </div>
  <div class="scard">
    <div class="s-label">PPN Terutang (PK)</div>
    <div class="s-val">${rp(d.totalPPN)}</div>
  </div>
  <div class="scard">
    <div class="s-label">Pajak Masukan (PM)</div>
    <div class="s-val">${rp(d.totalPM)}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Perhitungan Akhir</div>
  <div class="row">
    <span class="label">Kompensasi kelebihan pajak masukan</span>
    <span class="value">${rp(parseNumber(d.kompensasi))}</span>
  </div>
  <div class="row">
    <span class="label">Total PPN Terutang</span>
    <span class="value">${rp(d.totalPPNTerutang)}</span>
  </div>
  <div class="row">
    <span class="label">PPN kurang/lebih bayar SPT yang dibetulkan</span>
    <span class="value">${rp(parseNumber(d.ppn_kurang_lebih))}</span>
  </div>
  <div class="row">
    <span class="label">PPN dibayarkan</span>
    <span class="value">${rp(parseNumber(d.ppn_dibayarkan))}</span>
  </div>
</div>

<div class="highlight-box">
  <div class="row">
    <span class="label">PPN Kurang Bayar</span>
    <span class="value">${rp(d.ppnKurangBayarFinal)}</span>
  </div>
</div>

<div class="section">
  <div class="section-title">Data Pembayaran</div>
  <div class="row">
    <span class="label">NTPN / Surat Ket. PBK</span>
    <span class="value">${d.ntpn || '-'}</span>
  </div>
  <div class="row">
    <span class="label">Tanggal Bayar</span>
    <span class="value">${d.tgl_bayar || '-'}</span>
  </div>
  <div class="row">
    <span class="label">Tanggal Lapor</span>
    <span class="value">${d.tgl_lapor || '-'}</span>
  </div>
  <div class="row">
    <span class="label">Tanggal Pengembalian</span>
    <span class="value">${d.tgl_pengembalian || '-'}</span>
  </div>
</div>

<div class="footer">
  <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
  <p>Dokumen ini bersifat informatif dan bukan pengganti dokumen resmi perpajakan.</p>
</div>

</body>
</html>`

    const w = window.open('', '_blank', 'width=800,height=900')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print() }, 600)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { background: #f1f5f9; font-family: 'Segoe UI', sans-serif; }
        .layout { display: flex; min-height: 100vh; }
        .topbar {
          position: fixed; top: 0; left: 220px; right: 0; height: 60px;
          background: #fff; border-bottom: 1px solid #e2e8f0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 1.75rem; z-index: 10;
        }
        .main { margin-left: 220px; padding-top: 60px; width: 100%; }
        .page { padding: 1.5rem; }

        .page-title { font-size: 1.15rem; font-weight: 700; color: #1e293b; }
        .topbar-right { display: flex; gap: 0.6rem; align-items: center; }
        .btn { display: flex; align-items: center; gap: 5px; padding: 6px 14px;
               border-radius: 8px; border: 1px solid #dbe3ec; background: #fff;
               cursor: pointer; font-size: 0.8rem; font-weight: 600; color: #334155; }
        .btn:hover { background: #f8fafc; }

        .summary-grid {
          display: grid; grid-template-columns: repeat(4,1fr);
          gap: 10px; margin-bottom: 1.25rem;
        }
        .scard { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 14px 16px; }
        .scard-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: .5px;
                       color: #94a3b8; font-weight: 700; margin-bottom: 6px; }
        .scard-val { font-size: 1.3rem; font-weight: 800; color: #0f172a; }
        .scard-val.red { color: #dc2626; }

        .toolbar { display: flex; gap: 0.6rem; margin-bottom: 1rem; align-items: center; flex-wrap: wrap; }
        .search-box { display: flex; align-items: center; gap: 6px; background: #fff;
                      border: 1px solid #dbe3ec; border-radius: 8px; padding: 6px 12px; }
        .search-box input { border: none; outline: none; background: transparent; font-size: 0.82rem; width: 200px; }

        .table-card { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; }

        .tab-bar { display: flex; border-bottom: 1px solid #e2e8f0; padding: 0 1rem; }
        .tab-item { padding: 10px 16px; font-size: 0.8rem; cursor: pointer;
                    color: #64748b; border-bottom: 2px solid transparent;
                    margin-bottom: -1px; white-space: nowrap; }
        .tab-item:hover { color: #334155; }
        .tab-item.active { color: #2563eb; border-bottom-color: #2563eb; font-weight: 600; }

        .tbl-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }

        .th-group { background: #1e88e5; color: #fff; text-align: center;
                    font-size: 0.72rem; font-weight: 700; padding: 8px 10px;
                    border-right: 1px solid rgba(255,255,255,0.2); }
        .th-group.gray { background: #334155; }
        .th-group.teal { background: #0891b2; }

        th { background: #f8fafc; padding: 9px 10px; text-align: left;
             font-size: 0.7rem; font-weight: 700; color: #64748b;
             text-transform: uppercase; white-space: nowrap;
             border-bottom: 1px solid #e2e8f0; border-top: 1px solid #e2e8f0; }
        th.right, td.right { text-align: right; }
        td { padding: 9px 10px; border-bottom: 1px solid #f1f5f9;
             font-size: 0.8rem; color: #1e293b; white-space: nowrap; }
        tr:hover td { background: #f8fafc; }
        tfoot td { background: #eff6ff; font-weight: 700; font-size: 0.8rem;
                   border-top: 1px solid #bfdbfe; }

        .empty-state { padding: 3rem; text-align: center; color: #94a3b8; font-size: 0.85rem; }

        .filter-panel { background: #fff; border: 1px solid #e2e8f0;
                        border-radius: 10px; padding: 12px; margin-bottom: 1rem; }
        .filter-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
                        color: #64748b; margin-bottom: 5px; display: block; }
        .filter-select { padding: 6px 10px; border-radius: 7px; border: 1px solid #e2e8f0;
                         font-size: 0.8rem; background: #fff; width: 180px; }

        .form-card { padding: 1.25rem; }
        .form-grid { display: grid; gap: 1rem; }
        .form-field { display: grid; gap: 0.35rem; }
        .form-field label { font-size: 0.75rem; font-weight: 700; color: #475569; }
        .field-value { font-size: 0.95rem; font-weight: 700; color: #0f172a;
                       padding: 10px 12px; border-radius: 10px;
                       background: #f8fafc; border: 1px solid #e2e8f0; }
        .inline-input {
          width: 100%; border: 1px solid #e2e8f0; border-radius: 7px;
          padding: 7px 10px; font-size: 0.82rem;
          background: #f8fafc; color: #1e293b; font-family: 'Segoe UI', sans-serif;
          outline: none;
        }
        .inline-input:focus { border-color: #2563eb; background: #fff;
                              box-shadow: 0 0 0 3px rgba(37,99,235,.1); }

        .col-divider { border-left: 2px solid #e2e8f0; }

        /* Action buttons area */
        .action-bar {
          display: flex; gap: 0.75rem; margin-top: 0.75rem;
          padding-top: 1.1rem; border-top: 1px solid #e2e8f0;
          align-items: center; flex-wrap: wrap;
        }
        .btn-save {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 22px; border-radius: 9px;
          background: #2563eb; color: #fff;
          border: none; cursor: pointer;
          font-weight: 700; font-size: 0.82rem;
          box-shadow: 0 2px 10px rgba(37,99,235,.28);
          transition: background .15s, transform .1s;
        }
        .btn-save:hover { background: #1d4ed8; transform: translateY(-1px); }
        .btn-save:active { transform: translateY(0); }

        .btn-pdf {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 22px; border-radius: 9px;
          border: none; cursor: pointer;
          font-weight: 700; font-size: 0.82rem;
          transition: background .15s, transform .1s;
        }
        .btn-pdf.active {
          background: #0f172a; color: #fff;
          box-shadow: 0 2px 8px rgba(15,23,42,.2);
        }
        .btn-pdf.active:hover { background: #1e293b; transform: translateY(-1px); }
        .btn-pdf.inactive {
          background: #f1f5f9; color: #94a3b8;
          cursor: not-allowed;
        }

        .toast-success {
          display: flex; align-items: center; gap: 8px;
          margin-top: 10px; padding: 9px 14px; border-radius: 8px;
          background: #dcfce7; color: #166534;
          font-size: 0.8rem; font-weight: 600;
          border: 1px solid #bbf7d0;
          animation: fadeIn .2s ease;
        }
        .saved-stamp {
          margin-top: 8px; padding: 8px 13px; border-radius: 7px;
          background: #f0f9ff; color: #0369a1;
          font-size: 0.74rem; border: 1px solid #bae6fd;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="layout">
        <Sidebar />

        <header className="topbar">
          <div className="page-title">Kontrol PPN</div>
          <div className="topbar-right" />
        </header>

        <main className="main">
          <div className="page">

            {/* SUMMARY CARDS */}
            <div className="summary-grid">
              <div className="scard">
                <div className="scard-label">Total Penjualan</div>
                <div className="scard-val">Rp {fmt(totalPenyerahan)}</div>
              </div>
              <div className="scard">
                <div className="scard-label">Total PPN Terutang</div>
                <div className="scard-val">Rp {fmt(totalPPN)}</div>
              </div>
              <div className="scard">
                <div className="scard-label">Total PM (Pembelian)</div>
                <div className="scard-val">Rp {fmt(totalPM)}</div>
              </div>
              <div className="scard">
                <div className="scard-label">Total Kurang Bayar</div>
                <div className="scard-val red">Rp {fmt(totalKurangBayar)}</div>
              </div>
            </div>

            {/* TOOLBAR */}
            <div className="toolbar">
              <div className="search-box">
                <Search size={13} color="#94a3b8" />
                <input
                  placeholder="Cari masa atau NTPN..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button className="btn" onClick={() => setFilterOpen(!filterOpen)}>
                <SlidersHorizontal size={13} />
                Filter
                <ChevronDown size={12} />
              </button>
              {filterMasa && (
                <button className="btn" onClick={() => setFilterMasa('')}>
                  <X size={12} /> {filterMasa}
                </button>
              )}
            </div>

            {filterOpen && (
              <div className="filter-panel">
                <label className="filter-label">Masa Pajak</label>
                <select
                  className="filter-select"
                  value={filterMasa}
                  onChange={e => setFilterMasa(e.target.value)}
                >
                  <option value="">Semua Masa</option>
                  {MASA_ORDER.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            )}

            {/* TABLE WITH TABS */}
            <div className="table-card">

              <div className="tab-bar">
                {TABS.map(t => (
                  <div
                    key={t.key}
                    className={`tab-item${activeTab === t.key ? ' active' : ''}`}
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.label}
                  </div>
                ))}
              </div>

              {/* ── TAB: PENJUALAN ── */}
              {activeTab === 'penjualan' && (
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th rowSpan={2} style={{ verticalAlign: 'middle', minWidth: 110, background: '#f8fafc' }}>
                          Masa Pajak
                        </th>
                        <th colSpan={2} className="th-group" style={{ textAlign: 'center' }}>
                          Penyerahan Lainnya
                          <br />
                          <span style={{ fontWeight: 400, fontSize: '0.65rem' }}>
                            (dengan Faktur Pajak Kode 01, 09 dan 10)
                          </span>
                        </th>
                        <th colSpan={2} className="th-group teal" style={{ textAlign: 'center' }}>
                          Penyerahan kepada Pemungut PPN
                          <br />
                          <span style={{ fontWeight: 400, fontSize: '0.65rem' }}>
                            (dengan Faktur Pajak Kode 02 dan 03)
                          </span>
                        </th>
                        <th colSpan={3} className="th-group gray" style={{ textAlign: 'center' }}>
                          TOTAL
                        </th>
                      </tr>
                      <tr>
                        <th className="right">Nilai Bruto</th>
                        <th className="right">PPN Terutang</th>
                        <th className="right col-divider">Nilai Bruto</th>
                        <th className="right">PPN Terutang</th>
                        <th className="right col-divider">Penghasilan</th>
                        <th className="right">s.d Bulan Ini</th>
                        <th className="right">PPN Terutang</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingTrx ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                            Memuat data...
                          </td>
                        </tr>
                      ) : filteredPenjualan.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="empty-state">Tidak ada data transaksi</td>
                        </tr>
                      ) : filteredPenjualan.map(row => (
                        <tr key={row.masa}>
                          <td style={{ fontWeight: 600 }}>{normalizeMasa(row.masa)}</td>
                          <td className="right">{row.nb_badan       ? fmt(row.nb_badan)       : '—'}</td>
                          <td className="right">{row.ppn_badan      ? fmt(row.ppn_badan)      : '—'}</td>
                          <td className="right col-divider">{row.nb_bendahara  ? fmt(row.nb_bendahara)  : '—'}</td>
                          <td className="right">{row.ppn_bendahara  ? fmt(row.ppn_bendahara)  : '—'}</td>
                          <td className="right col-divider">{row.penghasilan   ? fmt(row.penghasilan)   : '—'}</td>
                          <td className="right">{fmt(row.sd_bulan_ini)}</td>
                          <td className="right" style={{ fontWeight: 600 }}>
                            {row.total_ppn ? fmt(row.total_ppn) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {!loadingTrx && filteredPenjualan.length > 0 && (
                      <tfoot>
                        <tr>
                          <td>Total</td>
                          <td className="right">{fmt(sumPenj('nb_badan'))}</td>
                          <td className="right">{fmt(sumPenj('ppn_badan'))}</td>
                          <td className="right col-divider">{fmt(sumPenj('nb_bendahara'))}</td>
                          <td className="right">{fmt(sumPenj('ppn_bendahara'))}</td>
                          <td className="right col-divider">{fmt(sumPenj('penghasilan'))}</td>
                          <td className="right">
                            {filteredPenjualan.length > 0
                              ? fmt(filteredPenjualan[filteredPenjualan.length - 1].sd_bulan_ini)
                              : '—'}
                          </td>
                          <td className="right">{fmt(sumPenj('total_ppn'))}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {/* ── TAB: PEMBELIAN ── */}
              {activeTab === 'pembelian' && (
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th rowSpan={2} style={{ verticalAlign: 'middle', minWidth: 110, background: '#f8fafc' }}>
                          Masa Pajak
                        </th>
                        <th colSpan={2} className="th-group" style={{ textAlign: 'center' }}>
                          Pembelian dengan DPP Nilai Lain atau Besaran Tertentu
                          <br />
                          <span style={{ fontWeight: 400, fontSize: '0.65rem' }}>
                            (dengan Faktur Pajak Kode 04 dan 05)
                          </span>
                        </th>
                        <th colSpan={2} className="th-group teal" style={{ textAlign: 'center' }}>
                          Pembelian dengan DPP Nilai Lain yang dapat dikreditkan
                          <br />
                          <span style={{ fontWeight: 400, fontSize: '0.65rem' }}>
                            (dengan Faktur Pajak Kode 01, 09, dan 10)
                          </span>
                        </th>
                        <th colSpan={3} className="th-group gray" style={{ textAlign: 'center' }}>
                          Total
                        </th>
                      </tr>
                      <tr>
                        <th className="right">Nilai Bruto</th>
                        <th className="right">PPN Terutang</th>
                        <th className="right col-divider">Nilai Bruto</th>
                        <th className="right">PPN Terutang</th>
                        <th className="right col-divider">Penghasilan</th>
                        <th className="right">s.d Bulan Ini</th>
                        <th className="right">PPN Terutang</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingPmb ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                            Memuat data...
                          </td>
                        </tr>
                      ) : filteredPembelian.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="empty-state">Tidak ada data pembelian</td>
                        </tr>
                      ) : filteredPembelian.map(row => (
                        <tr key={row.masa}>
                          <td style={{ fontWeight: 600 }}>{normalizeMasa(row.masa)}</td>
                          <td className="right">{row.nb_normal    ? fmt(row.nb_normal)    : '—'}</td>
                          <td className="right">{row.ppn_normal   ? fmt(row.ppn_normal)   : '—'}</td>
                          <td className="right col-divider">{row.nb_lainnya  ? fmt(row.nb_lainnya)  : '—'}</td>
                          <td className="right">{row.ppn_lainnya  ? fmt(row.ppn_lainnya)  : '—'}</td>
                          <td className="right col-divider">{row.penghasilan ? fmt(row.penghasilan) : '—'}</td>
                          <td className="right">{fmt(row.sd_bulan_ini)}</td>
                          <td className="right" style={{ fontWeight: 600 }}>
                            {row.total_ppn ? fmt(row.total_ppn) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {!loadingPmb && filteredPembelian.length > 0 && (
                      <tfoot>
                        <tr>
                          <td>Total</td>
                          <td className="right">{fmt(sumPmb('nb_normal'))}</td>
                          <td className="right">{fmt(sumPmb('ppn_normal'))}</td>
                          <td className="right col-divider">{fmt(sumPmb('nb_lainnya'))}</td>
                          <td className="right">{fmt(sumPmb('ppn_lainnya'))}</td>
                          <td className="right col-divider">{fmt(sumPmb('penghasilan'))}</td>
                          <td className="right">
                            {filteredPembelian.length > 0
                              ? fmt(filteredPembelian[filteredPembelian.length - 1].sd_bulan_ini)
                              : '—'}
                          </td>
                          <td className="right">{fmt(sumPmb('total_ppn'))}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {/* ── TAB: PERHITUNGAN AKHIR ── */}
              {activeTab === 'perhitungan' && (
                <div className="form-card">
                  {loadingPPN ? (
                    <div className="empty-state">Memuat data...</div>
                  ) : (
                    <div className="form-grid">

                      <div className="form-field">
                        <label htmlFor="tgl_bayar">Tanggal Bayar</label>
                        <input
                          id="tgl_bayar"
                          className="inline-input"
                          type="date"
                          value={perhitunganForm.tgl_bayar}
                          onChange={e => setPerhitunganForm(prev => ({ ...prev, tgl_bayar: e.target.value }))}
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="tgl_lapor">Tanggal Lapor</label>
                        <input
                          id="tgl_lapor"
                          className="inline-input"
                          type="date"
                          value={perhitunganForm.tgl_lapor}
                          onChange={e => setPerhitunganForm(prev => ({ ...prev, tgl_lapor: e.target.value }))}
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="tgl_pengembalian">Tanggal Pengembalian</label>
                        <input
                          id="tgl_pengembalian"
                          className="inline-input"
                          type="date"
                          value={perhitunganForm.tgl_pengembalian}
                          onChange={e => setPerhitunganForm(prev => ({ ...prev, tgl_pengembalian: e.target.value }))}
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="kompensasi">Kompensasi kelebihan pajak masukan</label>
                        <input
                          id="kompensasi"
                          className="inline-input"
                          type="text"
                          inputMode="numeric"
                          placeholder="Rp.0"
                          value={formatCurrency(perhitunganForm.kompensasi)}
                          onChange={e => handleCurrencyInput(e, 'kompensasi')}
                          onBlur={e => handleCurrencyBlur(e, 'kompensasi')}
                        />
                      </div>

                      <div className="form-field">
                        <label>Total PPN terutang</label>
                        <div className="field-value">Rp {fmt(totalPPNTerutang)}</div>
                      </div>

                      <div className="form-field">
                        <label htmlFor="ppn_kurang_lebih">
                          PPN kurang atau lebih bayar pada SPT yang dibetulkan sebelumnya
                        </label>
                        <input
                          id="ppn_kurang_lebih"
                          className="inline-input"
                          type="text"
                          inputMode="numeric"
                          placeholder="Rp.0"
                          value={formatCurrency(perhitunganForm.ppn_kurang_lebih)}
                          onChange={e => handleCurrencyInput(e, 'ppn_kurang_lebih')}
                          onBlur={e => handleCurrencyBlur(e, 'ppn_kurang_lebih')}
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="ppn_dibayarkan">PPN dibayarkan</label>
                        <input
                          id="ppn_dibayarkan"
                          className="inline-input"
                          type="text"
                          inputMode="numeric"
                          placeholder="Rp.0"
                          value={formatCurrency(perhitunganForm.ppn_dibayarkan)}
                          onChange={e => handleCurrencyInput(e, 'ppn_dibayarkan')}
                          onBlur={e => handleCurrencyBlur(e, 'ppn_dibayarkan')}
                        />
                      </div>

                      <div className="form-field">
                        <label>PPN kurang bayar</label>
                        <div className="field-value">Rp {fmt(ppnKurangBayarFinal)}</div>
                      </div>

                      <div className="form-field">
                        <label htmlFor="ntpn">NTPN</label>
                        <input
                          id="ntpn"
                          className="inline-input"
                          type="text"
                          value={perhitunganForm.ntpn}
                          onChange={e => setPerhitunganForm(prev => ({ ...prev, ntpn: e.target.value }))}
                        />
                      </div>

                      {/* ── ACTION BUTTONS ── */}
                      <div className="action-bar">
                        <button className="btn-save" onClick={handleSimpan}>
                          <Save size={14} />
                          Simpan
                        </button>
                        <button
                          className={`btn-pdf ${savedData ? 'active' : 'inactive'}`}
                          onClick={handleDownloadPDF}
                          disabled={!savedData}
                        >
                          <FileDown size={14} />
                          Download PDF
                        </button>
                      </div>

                      {/* Toast sukses */}
                      {saveSuccess && (
                        <div className="toast-success">
                          ✅ Data berhasil disimpan! Tombol Download PDF sekarang aktif.
                        </div>
                      )}

                      {/* Timestamp terakhir simpan */}
                      {savedData && !saveSuccess && (
                        <div className="saved-stamp">
                          🕐 Terakhir disimpan: {savedData.savedAt}
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    </>
  )
}