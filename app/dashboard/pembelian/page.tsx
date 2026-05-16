'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabaseClient } from '@/lib/supabaseClient'
import {
  ChevronRight, Plus, Trash2, Save,
  ShoppingCart, CheckCircle, AlertCircle, Loader2, X,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────
interface PembelianRow {
  id: number
  lawan_transaksi: string
  npwp: string
  no_faktur: string
  tanggal_faktur: string
  masa: string
  tahun: string
  dpp: string          // raw string (bisa "1.000.000" atau "1000000")
  ppn: string          // preview string, dihitung FE
  keterangan: string
  error?: string       // per-row validation error
}

const MASA_OPTIONS = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
]
const KETERANGAN_OPTIONS = ['Normal','Bendahara Pemerintahan']
const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => (CURRENT_YEAR - i).toString())

let _rowId = 0
const nextId = () => ++_rowId

function blankRow(): PembelianRow {
  return {
    id: nextId(),
    lawan_transaksi: '',
    npwp: '',
    no_faktur: '',
    tanggal_faktur: '',
    masa: '',
    tahun: CURRENT_YEAR.toString(),
    dpp: '',
    ppn: '',
    keterangan: 'Normal',
  }
}

function parseDPP(val: string): number {
  return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0
}

function fmtIDR(n: number): string {
  return n > 0 ? Math.round(n).toLocaleString('id-ID') : ''
}

function calcPPN(dppStr: string): string {
  const n = parseDPP(dppStr)
  return n > 0 ? fmtIDR(Math.round(n * 0.11)) : ''
}

// ─────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────
export default function InputPembelianPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [rows, setRows]     = useState<PembelianRow[]>([blankRow()])
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const firstInputRef       = useRef<HTMLInputElement>(null)

  // ── Auth guard ──
  useEffect(() => {
    if (authLoading) return
    if (!user?.id) router.push('/login')
  }, [user?.id, authLoading, router])

  // ── Toast auto-dismiss ──
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // ── Update a single field on a row ──
  const updateRow = useCallback((id: number, field: keyof PembelianRow, value: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const updated = { ...r, [field]: value, error: undefined }
      if (field === 'dpp') updated.ppn = calcPPN(value)
      return updated
    }))
  }, [])

  // ── DPP format on blur ──
  const handleDPPBlur = useCallback((id: number, raw: string) => {
    const n = parseDPP(raw)
    if (n > 0) {
      setRows(prev => prev.map(r => {
        if (r.id !== id) return r
        return { ...r, dpp: fmtIDR(n), ppn: calcPPN(fmtIDR(n)) }
      }))
    }
  }, [])

  // ── DPP strip formatting on focus ──
  const handleDPPFocus = useCallback((id: number, formatted: string) => {
    const n = parseDPP(formatted)
    if (n > 0) updateRow(id, 'dpp', n.toString())
  }, [updateRow])

  // ── Auto-fill Masa based on Tanggal Faktur ──
  const handleDateChange = useCallback((id: number, date: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const updated = { ...r, tanggal_faktur: date, error: undefined }
      if (date) {
        const d = new Date(date)
        updated.masa = MASA_OPTIONS[d.getMonth()]
      }
      return updated
    }))
  }, [])

  // ── Add row ──
  const addRow = () => {
    setRows(prev => [...prev, blankRow()])
    // focus will happen via useEffect after render
  }

  // ── Delete row ──
  const deleteRow = (id: number) => {
    setRows(prev => {
      const next = prev.filter(r => r.id !== id)
      return next.length === 0 ? [blankRow()] : next
    })
  }

  // ── Validate ──
  const validate = (): boolean => {
    let valid = true
    setRows(prev => prev.map(r => {
      let error: string | undefined
      if (!r.lawan_transaksi.trim()) { error = 'Lawan Transaksi wajib diisi'; valid = false }
      else if (parseDPP(r.dpp) <= 0) { error = 'DPP wajib diisi'; valid = false }
      return { ...r, error }
    }))
    return valid
  }

  // ── Totals ──
  const totalDPP = rows.reduce((s, r) => s + parseDPP(r.dpp), 0)
  const totalPPN = rows.reduce((s, r) => s + (parseDPP(r.ppn) || Math.round(parseDPP(r.dpp) * 0.11)), 0)

  // ── Save ──
  const handleSave = async () => {
    if (!validate()) {
      setToast({ type: 'error', msg: 'Lengkapi data yang wajib diisi pada setiap baris.' })
      return
    }

    setSaving(true)

    const payloads = rows.map(r => ({
      user_id:         user?.id,
      lawan_transaksi: r.lawan_transaksi.trim(),
      npwp:            r.npwp.trim()      || null,
      no_faktur:       r.no_faktur.trim() || null,
      tanggal_faktur:  r.tanggal_faktur   || null,
      masa:            r.masa             || null,
      tahun:           r.tahun ? parseInt(r.tahun) : null,
      dpp:             parseDPP(r.dpp),
      keterangan:      r.keterangan,
    }))

    const { error } = await supabaseClient
      .from('pembelian_ppn')
      .insert(payloads)

    setSaving(false)

    if (error) {
      setToast({ type: 'error', msg: `Gagal menyimpan: ${error.message}` })
    } else {
      setToast({ type: 'success', msg: `${payloads.length} data berhasil disimpan.` })
      setRows([blankRow()])
    }
  }

  const displayName   = user?.namaWP || 'User'
  const displayRole   = user?.profil?.bidangUsaha || 'Wajib Pajak'
  const displayAvatar = user?.namaWP?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'U'

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
          padding: 0 1.5rem; z-index: 10;
        }
        .topbar-left h1 { font-size: 1.05rem; font-weight: 800; color: #1e293b; }
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
          color: #fff; font-size: 0.8rem; font-weight: 700;
        }

        /* ── Main ── */
        .main { margin-left: 220px; padding-top: 56px; min-height: 100vh; width: calc(100% - 220px); }
        .main-content { padding: 1.75rem 1.5rem; }

        /* ── Page header ── */
        .page-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; }
        .page-header-icon {
          width: 40px; height: 40px; border-radius: 10px;
          background: #eff6ff; border: 1px solid #bfdbfe;
          display: flex; align-items: center; justify-content: center; color: #2563eb; flex-shrink: 0;
        }
        .page-header h1 { font-size: 1.05rem; font-weight: 700; color: #1e293b; }
        .page-header p  { font-size: 0.75rem; color: #94a3b8; margin-top: 1px; }

        /* ── Table card ── */
        .table-card {
          background: #fff; border: 1px solid #e2e8f0;
          border-radius: 14px; overflow: hidden;
        }

        .tbl-wrap { overflow-x: auto; }

        table { width: 100%; border-collapse: collapse; min-width: 900px; }

        thead th {
          font-size: 0.65rem; font-weight: 700; letter-spacing: 0.05em;
          text-transform: uppercase; color: #64748b;
          background: #f8fafc; padding: 9px 8px;
          border-bottom: 1px solid #e2e8f0; white-space: nowrap; text-align: left;
        }
        thead th.col-no  { width: 40px; text-align: center; }
        thead th.col-act { width: 46px; text-align: center; }

        tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.1s; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: #fafbfd; }
        tbody tr.row-error { background: #fff5f5; }

        td { padding: 5px 6px; vertical-align: middle; }
        td.td-no { font-size: 0.72rem; color: #94a3b8; text-align: center; font-weight: 600; }
        td.td-act { text-align: center; }

        /* ── Inputs ── */
        .ci {
          width: 100%; height: 34px; padding: 0 8px;
          border: 1px solid #e2e8f0; border-radius: 7px;
          font-size: 0.78rem; color: #1e293b; background: #fff;
          font-family: 'Segoe UI', sans-serif;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ci:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,.12); }
        .ci::placeholder { color: #cbd5e1; }
        .ci.mono { font-family: 'Courier New', monospace; font-size: 0.72rem; font-weight: 600; }
        .ci.right { text-align: right; }
        .ci.ppn-preview {
          background: #fffbeb; color: #d97706; font-weight: 700;
          border-color: #fde68a; border-style: dashed; text-align: right; cursor: default;
        }
        .ci.has-error { border-color: #fca5a5; background: #fff5f5; }
        select.ci {
          padding-right: 22px; appearance: none; cursor: pointer;
          background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 7px center;
        }

        /* ── Row error tooltip ── */
        .row-err-msg {
          font-size: 0.62rem; color: #ef4444; font-weight: 600;
          display: flex; align-items: center; gap: 3px; margin-top: 2px;
        }

        /* ── Del button ── */
        .btn-del {
          width: 28px; height: 28px; border-radius: 7px;
          border: 1px solid #fca5a5; background: #fff;
          color: #ef4444; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .btn-del:hover { background: #fef2f2; }

        /* ── Footer toolbar ── */
        .table-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.85rem 1rem; border-top: 1px solid #f1f5f9;
          background: #fafafa; gap: 1rem; flex-wrap: wrap;
        }
        .footer-left { display: flex; align-items: center; gap: 0.75rem; }

        .btn-add {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 0.78rem; font-weight: 600; color: #2563eb;
          background: #fff; border: 1.5px solid #bfdbfe;
          border-radius: 8px; padding: 6px 14px; cursor: pointer;
          transition: all 0.15s;
        }
        .btn-add:hover { background: #eff6ff; border-color: #3b82f6; }

        .totals { display: flex; align-items: center; gap: 1.25rem; }
        .total-item { font-size: 0.72rem; color: #64748b; }
        .total-item strong { color: #1e293b; font-weight: 700; }

        .btn-save {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.8rem; font-weight: 700; color: #fff;
          background: #2563eb; border: none; border-radius: 8px;
          padding: 7px 18px; cursor: pointer; transition: background 0.15s;
        }
        .btn-save:hover:not(:disabled) { background: #1d4ed8; }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Toast ── */
        .toast {
          position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 999;
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.7rem 1rem; border-radius: 10px;
          font-size: 0.8rem; font-weight: 600;
          box-shadow: 0 4px 20px rgba(0,0,0,.12);
          animation: slideUp 0.2s ease;
        }
        .toast.success { background: #f0fdf4; color: #15803d; border: 1.5px solid #86efac; }
        .toast.error   { background: #fef2f2; color: #dc2626; border: 1.5px solid #fca5a5; }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin    { to { transform: rotate(360deg); } }

        .empty-state {
          padding: 3rem 1rem; text-align: center;
          color: #94a3b8; font-size: 0.82rem;
        }

        @media (max-width: 768px) {
          .topbar { left: 0; }
          .main { margin-left: 0; width: 100%; }
        }
      `}</style>

      <div className="layout">
        <Sidebar />

        {/* ── Toast ── */}
        {toast && (
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {toast.msg}
            <button
              onClick={() => setToast(null)}
              style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', display:'flex', marginLeft:'0.25rem' }}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* ── Topbar ── */}
        <header className="topbar">
          <div className="topbar-left"><h1>Input Pembelian PPN</h1></div>
          <button className="user-info-btn" onClick={() => router.push('/dashboard/profil')}>
            <div className="user-info">
              <span className="user-name">{displayName}</span>
              <span className="user-role">{displayRole}</span>
            </div>
            <div className="avatar">{displayAvatar}</div>
            <ChevronRight size={14} style={{ color:'#cbd5e1' }} />
          </button>
        </header>

        {/* ── Main ── */}
        <main className="main">
          <div className="main-content">

            {/* Page header */}
            <div className="page-header">
              <div className="page-header-icon"><ShoppingCart size={18} /></div>
              <div>
                <h1>Faktur Pajak Standar – Pembelian</h1>
                <p>Tambah satu atau beberapa baris sekaligus, lalu simpan semua.</p>
              </div>
            </div>

            {/* Table card */}
            <div className="table-card">
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="col-no">No</th>
                      <th style={{ minWidth: 160 }}>Lawan Transaksi <span style={{ color:'#ef4444' }}>*</span></th>
                      <th style={{ minWidth: 140 }}>NPWP</th>
                      <th style={{ minWidth: 155 }}>No. Faktur</th>
                      <th style={{ minWidth: 120 }}>Tgl. Faktur</th>
                      <th style={{ minWidth: 105 }}>Masa</th>
                      <th style={{ minWidth: 70 }}>Tahun</th>
                      <th style={{ minWidth: 110 }}>DPP (Rp) <span style={{ color:'#ef4444' }}>*</span></th>
                      <th style={{ minWidth: 100 }}>PPN (11%)</th>
                      <th style={{ minWidth: 140 }}>Keterangan</th>
                      <th className="col-act"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={11}>
                          <div className="empty-state">Belum ada baris. Klik "Tambah Baris" di bawah.</div>
                        </td>
                      </tr>
                    ) : rows.map((row, idx) => (
                      <tr key={row.id} className={row.error ? 'row-error' : ''}>
                        {/* No */}
                        <td className="td-no">{idx + 1}</td>

                        {/* Lawan Transaksi */}
                        <td>
                          <input
                            className={`ci ${row.error && !row.lawan_transaksi.trim() ? 'has-error' : ''}`}
                            type="text"
                            placeholder="Nama perusahaan / orang"
                            value={row.lawan_transaksi}
                            onChange={e => updateRow(row.id, 'lawan_transaksi', e.target.value)}
                            ref={idx === rows.length - 1 ? firstInputRef : undefined}
                          />
                          {row.error && !row.lawan_transaksi.trim() && (
                            <div className="row-err-msg"><AlertCircle size={9} /> Wajib diisi</div>
                          )}
                        </td>

                        {/* NPWP */}
                        <td>
                          <input
                            className="ci mono"
                            type="text"
                            placeholder="00.000.000.0-000.000"
                            value={row.npwp}
                            onChange={e => updateRow(row.id, 'npwp', e.target.value)}
                          />
                        </td>

                        {/* No. Faktur */}
                        <td>
                          <input
                            className="ci mono"
                            type="text"
                            placeholder="010-000-00-00000000"
                            value={row.no_faktur}
                            onChange={e => updateRow(row.id, 'no_faktur', e.target.value)}
                          />
                        </td>

                        {/* Tanggal Faktur */}
                        <td>
                          <input
                            className="ci"
                            type="date"
                            value={row.tanggal_faktur}
                            onChange={e => handleDateChange(row.id, e.target.value)}
                          />
                        </td>

                        {/* Masa */}
                        <td>
                          <select
                            className="ci"
                            value={row.masa}
                            onChange={e => updateRow(row.id, 'masa', e.target.value)}
                          >
                            <option value="">-- Masa --</option>
                            {MASA_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </td>

                        {/* Tahun */}
                        <td>
                          <select
                            className="ci"
                            value={row.tahun}
                            onChange={e => updateRow(row.id, 'tahun', e.target.value)}
                          >
                            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </td>

                        {/* DPP */}
                        <td>
                          <input
                            className={`ci right ${row.error && parseDPP(row.dpp) <= 0 ? 'has-error' : ''}`}
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={row.dpp}
                            onChange={e => updateRow(row.id, 'dpp', e.target.value)}
                            onBlur={e => handleDPPBlur(row.id, e.target.value)}
                            onFocus={e => handleDPPFocus(row.id, e.target.value)}
                          />
                          {row.error && parseDPP(row.dpp) <= 0 && (
                            <div className="row-err-msg"><AlertCircle size={9} /> Wajib &gt; 0</div>
                          )}
                        </td>

                        {/* PPN preview */}
                        <td>
                          <input
                            className="ci ppn-preview"
                            type="text"
                            readOnly
                            tabIndex={-1}
                            value={row.ppn}
                            placeholder="otomatis"
                          />
                        </td>

                        {/* Keterangan */}
                        <td>
                          <select
                            className="ci"
                            value={row.keterangan}
                            onChange={e => updateRow(row.id, 'keterangan', e.target.value)}
                          >
                            {KETERANGAN_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </td>

                        {/* Delete */}
                        <td className="td-act">
                          <button className="btn-del" onClick={() => deleteRow(row.id)} title="Hapus baris">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer toolbar */}
              <div className="table-footer">
                <div className="footer-left">
                  <button className="btn-add" onClick={addRow}>
                    <Plus size={14} /> Tambah Baris
                  </button>
                  {rows.length > 0 && (
                    <div className="totals">
                      <div className="total-item">
                        Total DPP: <strong>Rp {fmtIDR(totalDPP) || '0'}</strong>
                      </div>
                      <div className="total-item">
                        Total PPN: <strong>Rp {fmtIDR(totalPPN) || '0'}</strong>
                      </div>
                      <div className="total-item">
                        {rows.length} baris
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className="btn-save"
                  onClick={handleSave}
                  disabled={saving || rows.every(r => !r.lawan_transaksi.trim())}
                >
                  {saving
                    ? <Loader2 size={14} style={{ animation:'spin 0.6s linear infinite' }} />
                    : <Save size={14} />}
                  Simpan {rows.length > 1 ? `Semua (${rows.length})` : 'Data'}
                </button>
              </div>
            </div>

          </div>
        </main>
      </div>
    </>
  )
}