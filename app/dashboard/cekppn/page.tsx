'use client'

import { useState, useRef, useEffect } from 'react'
import {
  ChevronRight, DollarSign, ShoppingCart,
  CheckCircle, AlertCircle, FileText, Receipt,
  Plus, Trash2, LayoutDashboard, RefreshCw, Printer,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth, ProfilData } from '@/context/AuthContext'
import { supabaseClient } from '@/lib/supabaseClient'
import Sidebar from '@/components/Sidebar'

type Step = 'input-profil' | 'input-ppn' | 'input-transaksi' | 'draft-bupot' | 'tagihan'

interface TransaksiData {
  deskripsi: string
  nilaiDPP: string
  tanggal: string
  jenisWP: 'badan' | 'bendahara_pemerintah' | 'orang_pribadi'
  masa?: string
  penjual?: string
  npwpPenjual?: string
  pembeli?: string
  npwpPembeli?: string
  kodeJasa?: string
  jenisJasa?: string
  nomorTransaksi?: string
  jasaRows?: { nama: string; harga: string }[]
  barangRows?: { nama: string; harga: string }[]
}

interface PPNData {
  dpp: string
  nomorFaktur: string
}

interface BupotData {
  jenis: string
  tarif: string
  nomor: string
}

interface FormData {
  profil: ProfilData | null
  transaksi: TransaksiData | null
  ppn: PPNData | null
  bupot: BupotData | null
}

const prefixMap: Record<string, string> = {
  orang_pribadi: 'OP',
  badan: 'BDN',
  bendahara_pemerintah: 'BP',
}

async function saveTransaksiToDatabase(transaksiData: TransaksiData, userId: string) {
  console.log('Calling API with userId:', userId)
  console.log('transaksiData:', JSON.stringify(transaksiData))
  try {
    const response = await fetch('/api/transaksi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaksiData, userId }),
    })

    // Tambahkan ini untuk debug
    const rawText = await response.text()
    console.log('Status:', response.status)
    console.log('Raw response:', rawText)

    let result
    try {
      result = JSON.parse(rawText)
    } catch {
      return { success: false, error: `Response bukan JSON: ${rawText}` }
    }

    if (!response.ok || !result.success) {
      console.error('API transaksi error detail:', result)
      return { success: false, error: result.error || 'Gagal menyimpan transaksi' }
    }

    return { success: true, transaksiId: result.transaksiId, nomorTransaksi: result.nomorTransaksi }
  } catch (error) {
    console.error('Fetch error:', error)
    const message = error instanceof Error ? error.message : JSON.stringify(error)
    return { success: false, error: message || 'Unknown error' }
  }
}

// ── Ringkasan PPN (PKP) ────────────────────────────────────────────────────────
function InputPPNStep({
  onNext, onRollback, hasBupot, transaksi,
}: {
  onNext: (data: PPNData, nextStep: Step) => void
  onRollback: () => void
  hasBupot: boolean
  transaksi: TransaksiData | null
}) {
  const totalNilai = Number(transaksi?.nilaiDPP?.replace(/\D/g, '') || 0)
  const ppn = Math.round(totalNilai * 0.11)
  const totalAkhir = totalNilai + ppn

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

  return (
    <div className="step-content">
      <div className="rollback-text" onClick={onRollback}>Rollback</div>
      <div className="step-icon-wrap green"><DollarSign size={28} color="#10b981" /></div>
      <h2 className="step-title">Faktur PPN</h2>
      <p className="step-desc">Ringkasan transaksi Anda sebagai Pengusaha Kena Pajak (PKP).</p>

      <div className="form-grid">
        <div className="form-group full-width"><div className="section-title">Informasi Faktur</div></div>
        <div className="form-group">
          <label>Tanggal</label>
          <div className="readonly-field">{transaksi?.tanggal || '-'}</div>
        </div>
        <div className="form-group">
          <label>Masa</label>
          <div className="readonly-field">{transaksi?.masa || '-'}</div>
        </div>
        <div className="form-group full-width">
          <label>Nomor Transaksi</label>
          <div className="readonly-field mono">
            {transaksi?.nomorTransaksi
              ? transaksi.nomorTransaksi
              : transaksi?.tanggal
                ? `INV-${prefixMap[transaksi.jenisWP] ?? 'XX'}-???-${transaksi.tanggal.replace(/-/g, '')}`
                : '-'}
          </div>
        </div>
        <div className="form-group full-width"><div className="form-divider" /></div>
        <div className="form-group full-width"><div className="section-title">Data Penjual</div></div>
        <div className="form-group">
          <label>Penjual</label>
          <div className="readonly-field">{transaksi?.penjual || '-'}</div>
        </div>
        <div className="form-group">
          <label>NPWP Penjual</label>
          <div className="readonly-field">{transaksi?.npwpPenjual || '-'}</div>
        </div>
        <div className="form-group full-width"><div className="form-divider" /></div>
        <div className="form-group full-width"><div className="section-title">Data Lawan Transaksi</div></div>
        <div className="form-group">
          <label>Lawan Transaksi</label>
          <div className="readonly-field">{transaksi?.pembeli || '-'}</div>
        </div>
        <div className="form-group">
          <label>NPWP Lawan Transaksi</label>
          <div className="readonly-field">{transaksi?.npwpPembeli || '-'}</div>
        </div>
        <div className="form-group full-width"><div className="form-divider" /></div>
        <div className="form-group full-width"><div className="section-title">Jasa</div></div>
        <div className="form-group full-width">
          <table className="item-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}>-</th>
                <th>Nama Jasa</th>
                <th style={{ textAlign: 'right', width: 160 }}>Rp</th>
              </tr>
            </thead>
            <tbody>
              {(transaksi?.jasaRows?.filter(r => r.nama.trim()) ?? []).length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8', padding: '0.5rem' }}>Tidak ada jasa</td></tr>
              ) : (
                transaksi?.jasaRows?.filter(r => r.nama.trim()).map((row, i) => (
                  <tr key={i}>
                    <td className="row-num">{i + 1}</td>
                    <td><div className="readonly-field">{row.nama}</div></td>
                    <td><div className="readonly-field" style={{ textAlign: 'right' }}>
                      {Number(row.harga.replace(/\D/g, '')).toLocaleString('id-ID')}
                    </div></td>
                  </tr>
                ))
              )}
              <tr className="total-row">
                <td colSpan={2}><strong>Total Jasa</strong></td>
                <td style={{ textAlign: 'right' }}>
                  <strong>{fmt(transaksi?.jasaRows?.reduce((s, r) => s + (Number(r.harga.replace(/\D/g, '')) || 0), 0) ?? 0)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="form-group full-width"><div className="form-divider" /></div>
        <div className="form-group full-width"><div className="section-title">Barang</div></div>
        <div className="form-group full-width">
          <table className="item-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}>-</th>
                <th>Nama Barang</th>
                <th style={{ textAlign: 'right', width: 160 }}>Rp</th>
              </tr>
            </thead>
            <tbody>
              {(transaksi?.barangRows?.filter(r => r.nama.trim()) ?? []).length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8', padding: '0.5rem' }}>Tidak ada barang</td></tr>
              ) : (
                transaksi?.barangRows?.filter(r => r.nama.trim()).map((row, i) => (
                  <tr key={i}>
                    <td className="row-num">{i + 1}</td>
                    <td><div className="readonly-field">{row.nama}</div></td>
                    <td><div className="readonly-field" style={{ textAlign: 'right' }}>
                      {Number(row.harga.replace(/\D/g, '')).toLocaleString('id-ID')}
                    </div></td>
                  </tr>
                ))
              )}
              <tr className="total-row">
                <td colSpan={2}><strong>Total Barang</strong></td>
                <td style={{ textAlign: 'right' }}>
                  <strong>{fmt(transaksi?.barangRows?.reduce((s, r) => s + (Number(r.harga.replace(/\D/g, '')) || 0), 0) ?? 0)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="form-group full-width"><div className="form-divider" /></div>
        <div className="form-group full-width">
          <div className="summary-box">
            <div className="summary-row">
              <span>Nilai Transaksi</span>
              <strong>{fmt(totalNilai)}</strong>
            </div>
            <div className="summary-row highlight-green">
              <span>PPN (11%)</span>
              <strong>{fmt(ppn)}</strong>
            </div>
            <div className="summary-divider" />
            <div className="summary-row total">
              <span>Total Akhir Transaksi</span>
              <strong>{fmt(totalAkhir)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="button-row">
        <button
          className="btn-primary"
          onClick={() => onNext({ dpp: String(totalNilai), nomorFaktur: '' }, hasBupot ? 'draft-bupot' : 'tagihan')}
        >
          Lanjutkan <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

function InputTransaksiStep({ onNext, onRollback, initialData, defaultPenjual, defaultNpwpPenjual }: {
  onNext: (data: TransaksiData) => void
  onRollback: () => void
  initialData?: TransaksiData | null
  defaultPenjual: string
  defaultNpwpPenjual: string
}) {
  const [form, setForm] = useState<TransaksiData>(initialData || { deskripsi: '', nilaiDPP: '', tanggal: '', jenisWP: 'orang_pribadi' })
  const [masa, setMasa] = useState(initialData?.masa || '')
  const [penjual, setPenjual] = useState(initialData?.penjual || defaultPenjual)
  const [npwpPenjual, setNpwpPenjual] = useState(initialData?.npwpPenjual || defaultNpwpPenjual)
  const [pembeli, setPembeli] = useState(initialData?.pembeli || '')
  const [npwpPembeli, setNpwpPembeli] = useState(initialData?.npwpPembeli || '')
  const [kodeJasa, setKodeJasa] = useState(initialData?.kodeJasa || '')
  const [jenisJasa, setJenisJasa] = useState(initialData?.jenisJasa || '')
  const [jasaRows, setJasaRows] = useState(initialData?.jasaRows || [{ nama: '', harga: '' }])
  const [barangRows, setBarangRows] = useState(initialData?.barangRows || [{ nama: '', harga: '' }])

  useEffect(() => {
    if (!initialData?.penjual) setPenjual(defaultPenjual)
    if (!initialData?.npwpPenjual) setNpwpPenjual(defaultNpwpPenjual)
  }, [defaultPenjual, defaultNpwpPenjual, initialData?.penjual, initialData?.npwpPenjual])

  useEffect(() => {
    if (form.tanggal) {
      const date = new Date(form.tanggal)
      const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
      setMasa(monthNames[date.getMonth()])
    }
  }, [form.tanggal])

  const jasaList = [
    { kode: '24-104-05', nama: 'Jasa Aktuaris' },
    { kode: '28-409-10', nama: 'Jasa Konstruksi Berupa Jasa Pelaksanaan Konstruksi (Kualifikasi Usaha Kecil)' },
    { kode: '24-104-06', nama: 'Jasa Akuntansi, Pembukuan, dan Atestasi Laporan Keuangan' },
    { kode: '24-104-07', nama: 'Jasa Hukum' },
    { kode: '24-104-08', nama: 'Jasa Arsitektur' },
    { kode: '24-104-09', nama: 'Jasa Perencanaan Kota dan Arsitektur Landscape' },
    { kode: '24-104-10', nama: 'Jasa Perancang (Design)' },
    { kode: '24-104-11', nama: 'Jasa Pengeboran (Drilling) di Bidang Penambangan Minyak dan Gas Bumi (Migas) Kecuali yang Dilakukan oleh Badan Usaha Tetap (BUT)' },
    { kode: '24-104-12', nama: 'Jasa Penunjang di Bidang Usaha Panas Bumi dan Penambangan Minyak dan Gas Bumi (Migas)' },
    { kode: '24-104-13', nama: 'Jasa Penambangan dan Jasa Penunjang di Bidang Usaha Panas Bumi dan Penambangan Minyak dan Gas Bumi (Migas)' },
    { kode: '24-104-14', nama: 'Jasa Penunjang di Bidang Penerbangan dan Bandar Udara' },
    { kode: '28-409-52', nama: 'Jasa Konstruksi Berupa Jasa Pelaksanaan Konstruksi (Kualifikasi Usaha Kecil) sehubungan Pelaksanaan Proyek Pemerintah yang Dibiayai dengan Hibah atau Dana Pinjaman Luar Negeri' },
    { kode: '24-104-15', nama: 'Jasa Penebangan Hutan' },
    { kode: '24-104-16', nama: 'Jasa Pengolahan Limbah' },
    { kode: '24-104-17', nama: 'Jasa Penyedia Tenaga Kerja dan/atau Tenaga Ahli (Outsourcing Services)' },
    { kode: '24-104-18', nama: 'Jasa Perantara dan/atau Keagenan' },
    { kode: '24-104-19', nama: 'Jasa Bidang Perdagangan Surat-Surat Berharga, Kecuali yang Dilakukan Bursa Efek, Kustodian Sentral Efek Indonesia (KSEI) dan Kliring Penjaminan Efek Indonesia (KPEI)' },
    { kode: '24-104-20', nama: 'Jasa Kustodian/Penyimpanan/Penitipan, Kecuali yang Dilakukan Oleh KSEI' },
    { kode: '24-104-21', nama: 'Jasa Pengisian Suara (Dubbing) dan/atau Sulih Suara' },
    { kode: '24-104-22', nama: 'Jasa Mixing Film' },
    { kode: '24-104-23', nama: 'Jasa Pembuatan Sarana Promosi Film, Iklan, Poster, Foto, Slide, Klise, Banner, Pamphlet, Baliho dan Folder' },
    { kode: '24-104-24', nama: 'Jasa Sehubungan Dengan Software Atau Hardware Atau Sistem Komputer, Termasuk Perawatan, Pemeliharaan dan Perbaikan.' },
    { kode: '24-104-25', nama: 'Jasa Pembuatan dan/atau Pengelolaan Website' },
    { kode: '24-104-26', nama: 'Jasa Internet Termasuk Sambungannya' },
    { kode: '24-104-27', nama: 'Jasa Penyimpanan, Pengolahan dan/atau Penyaluran Data, Informasi, dan/atau Program' },
    { kode: '24-104-28', nama: 'Jasa Instalasi/Pemasangan Mesin, Peralatan, Listrik, Telepon, Air, Gas, Ac dan/atau Tv Kabel, Selain Yang Dilakukan Oleh Wajib Pajak Yang Ruang Lingkupnya Di Bidang Konstruksi dan Mempunyai Izin dan/atau Sertifikasi Sebagai Pengusaha Konstruksi;' },
    { kode: '24-104-29', nama: 'Jasa Perawatan/Perbaikan/Pemeliharaan Mesin, Peralatan, Listrik, Telepon, Air, Gas, Ac dan/atau Tv Kabel, Selain Yang Dilakukan Oleh Wajib Pajak Yang Ruang Lingkupnya di Bidang Konstruksi dan Mempunyai Izin dan/atau Sertifikasi Sebagai Pengusaha Konstruksi' },
    { kode: '24-104-30', nama: 'Jasa Perawatan Kendaraan dan/atau Alat Transportasi Darat, Laut dan Udara' },
    { kode: '24-104-31', nama: 'Jasa Maklon' },
    { kode: '24-104-32', nama: 'Jasa Penyelidikan dan Keamanan' },
    { kode: '24-104-33', nama: 'Jasa Penyelenggara Kegiatan Atau Event Organizer' },
    { kode: '24-104-34', nama: 'Jasa Penyediaan Tempat dan/atau Waktu Dalam Media Massa, Media Luar Ruang Atau Media Lain Untuk Penyampaian Informasi, dan/atau Jasa Periklanan' },
    { kode: '24-104-35', nama: 'Jasa Pembasmian Hama' },
    { kode: '24-104-36', nama: 'Jasa Kebersihan Atau Cleaning Service' },
    { kode: '24-104-37', nama: 'Jasa Sedot Septic Tank' },
    { kode: '24-104-38', nama: 'Jasa Pemeliharaan Kolam' },
    { kode: '24-104-39', nama: 'Jasa Katering Atau Tata Boga' },
    { kode: '24-104-40', nama: 'Jasa Freight Forwarding' },
    { kode: '24-104-41', nama: 'Jasa Logistik' },
    { kode: '24-104-42', nama: 'Jasa Pengurusan Dokumen' },
    { kode: '24-104-43', nama: 'Jasa Pengepakan' },
    { kode: '24-104-44', nama: 'Jasa Loading dan Unloading' },
    { kode: '24-104-45', nama: 'Jasa Laboratorium dan/atau Pengujian Kecuali yang Dilakukan oleh Lembaga atau Institusi Pendidikan Dalam Rangka Penelitian Akademis' },
    { kode: '24-104-46', nama: 'Jasa Pengelolaan Parkir' },
    { kode: '24-104-47', nama: 'Jasa Penyondiran Tanah' },
    { kode: '24-104-48', nama: 'Jasa Penyiapan dan/atau Pengolahan Lahan' },
    { kode: '24-104-49', nama: 'Jasa Pembibitan dan/atau Penanaman Bibit' },
    { kode: '24-104-50', nama: 'Jasa Pemeliharaan Tanaman' },
    { kode: '24-104-51', nama: 'Jasa Pemanenan' },
    { kode: '24-104-52', nama: 'Jasa Pengolahan Hasil Pertanian, Perkebunan, Perikanan, Peternakan dan/atau Perhutanan' },
    { kode: '24-104-53', nama: 'Jasa Dekorasi' },
    { kode: '24-104-54', nama: 'Jasa Pencetakan/Penerbitan' },
    { kode: '24-104-01', nama: 'Jasa Teknik' },
    { kode: '24-104-55', nama: 'Jasa Penerjemahan' },
    { kode: '24-104-56', nama: 'Jasa Pengangkutan/Ekspedisi Kecuali Yang Telah Diatur Dalam Pasal 15 Undang-Undang Pajak Penghasilan' },
    { kode: '24-104-57', nama: 'Jasa Pelayanan Pelabuhan' },
    { kode: '24-104-58', nama: 'Jasa Pengangkutan Melalui Jalur Pipa' },
    { kode: '24-104-59', nama: 'Jasa Pengelolaan Penitipan Anak' },
    { kode: '24-104-60', nama: 'Jasa Pelatihan dan/atau Kursus' },
    { kode: '24-104-61', nama: 'Jasa Pengiriman dan Pengisian Uang Ke Atm' },
    { kode: '24-104-62', nama: 'Jasa Sertifikasi' },
    { kode: '24-104-63', nama: 'Jasa Survey' },
    { kode: '24-104-64', nama: 'Jasa Tester' },
    { kode: '24-104-02', nama: 'Jasa Manajemen' },
    { kode: '24-104-65', nama: 'Jasa Selain Jasa-Jasa Tersebut di Atas yang Pembayarannya Dibebankan pada APBN atau APBD.' },
    { kode: '24-104-66', nama: 'Jasa Penyelenggaraan Layanan Transaksi Pembayaran Terkait dengan Distribusi Token Oleh Penyelenggara Distribusi' },
    { kode: '24-104-67', nama: 'Jasa Pemasaran dengan Media Voucer Oleh Penyelenggara Voucer' },
    { kode: '24-104-68', nama: 'Jasa Penyelenggaraan Layanan Transaksi Pembayaran Terkait dengan Distribusi Voucer Oleh Penyelenggara Voucer dan Penyelenggara Distribusi' },
    { kode: '24-104-69', nama: 'Jasa Penyelenggaraan Program Loyalitas dan Penghargaan Pelanggan (Consumer Loyalty/Reward Program) Oleh Penyelenggara Voucer' },
    { kode: '24-104-03', nama: 'Jasa Konsultan' },
    { kode: '24-104-04', nama: 'Jasa Penilai (Appraisal)' },
  ] as const

  const totalJasa = jasaRows.reduce((sum, r) => sum + (Number(r.harga.replace(/\D/g, '')) || 0), 0)
  const totalBarang = barangRows.reduce((sum, r) => sum + (Number(r.harga.replace(/\D/g, '')) || 0), 0)
  const totalNilai = totalJasa + totalBarang
  const nomorPreview = form.tanggal
    ? `INV-${prefixMap[form.jenisWP] ?? 'XX'}-???-${form.tanggal.replace(/-/g, '')}`
    : 'Akan diisi otomatis'

  function updateJasa(i: number, field: 'nama' | 'harga', val: string) { const u = [...jasaRows]; u[i] = { ...u[i], [field]: val }; setJasaRows(u) }
  function updateBarang(i: number, field: 'nama' | 'harga', val: string) { const u = [...barangRows]; u[i] = { ...u[i], [field]: val }; setBarangRows(u) }
  function addJasa() { setJasaRows([...jasaRows, { nama: '', harga: '' }]) }
  function removeJasa(i: number) { if (jasaRows.length > 1) setJasaRows(jasaRows.filter((_, idx) => idx !== i)) }
  function addBarang() { setBarangRows([...barangRows, { nama: '', harga: '' }]) }
  function removeBarang(i: number) { if (barangRows.length > 1) setBarangRows(barangRows.filter((_, idx) => idx !== i)) }

  function handleSubmit() {
    onNext({ ...form, nilaiDPP: String(totalNilai), deskripsi: jenisJasa || form.deskripsi, masa, penjual, npwpPenjual, pembeli, npwpPembeli, kodeJasa, jenisJasa, jasaRows, barangRows })
  }

  return (
    <div className="step-content">
      <div className="rollback-text" onClick={onRollback}>Rollback</div>
      <div className="step-icon-wrap purple"><ShoppingCart size={28} color="#8b5cf6" /></div>
      <h2 className="step-title">Input Transaksi</h2>
      <p className="step-desc">Masukkan detail transaksi sesuai faktur.</p>
      <div className="form-grid">
        <div className="form-group full-width"><div className="section-title">Informasi Faktur</div></div>
        <div className="form-group">
          <label>Tanggal</label>
          <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Masa <span className="nomor-badge">Auto</span></label>
          <select value={masa} disabled>
            <option value="">Masa</option>
            {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group full-width">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>Nomor Transaksi <span className="nomor-badge">Otomatis</span></label>
          <div className="nomor-display">
            <span className="nomor-value">{nomorPreview}</span>
            <span className="nomor-hint">Diisi otomatis setelah disimpan ke database</span>
          </div>
        </div>
        <div className="form-group full-width"><div className="form-divider" /></div>
        <div className="form-group full-width"><div className="section-title">Data Penjual</div></div>
        <div className="form-group">
          <label>Penjual</label>
          <input type="text" value={penjual} readOnly disabled />
        </div>
        <div className="form-group">
          <label>NPWP Penjual</label>
          <input type="text" value={npwpPenjual} readOnly disabled />
        </div>
        <div className="form-group full-width"><div className="form-divider" /></div>
        <div className="form-group full-width"><div className="section-title">Data Lawan Transaksi</div></div>
        <div className="form-group">
          <label>Jenis WP</label>
          <select value={form.jenisWP} onChange={(e) => setForm({ ...form, jenisWP: e.target.value as TransaksiData['jenisWP'] })}>
            <option value="orang_pribadi">Orang Pribadi</option>
            <option value="badan">Badan</option>
            <option value="bendahara_pemerintah">Bendahara Pemerintah</option>
          </select>
        </div>
        <div className="form-group">
          <label>Lawan Transaksi</label>
          <input type="text" placeholder="-" value={pembeli} onChange={(e) => setPembeli(e.target.value)} />
        </div>
        <div className="form-group">
          <label>NPWP Lawan Transaksi</label>
          <input type="text" placeholder="-" value={npwpPembeli} onChange={(e) => setNpwpPembeli(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Kode Jasa <span className="nomor-badge">Auto</span></label>
          <input type="text" value={kodeJasa} readOnly />
        </div>
        <div className="form-group">
          <label>Jenis Jasa</label>
          <select value={jenisJasa} onChange={(e) => { const nama = e.target.value; setJenisJasa(nama); const jasa = jasaList.find(item => item.nama === nama); setKodeJasa(jasa ? jasa.kode : '') }}>
            <option value="">Pilih Jenis Jasa</option>
            {jasaList.map((item) => <option key={item.kode} value={item.nama}>{item.nama}</option>)}
          </select>
        </div>
        <div className="form-group full-width"><div className="form-divider" /></div>
        <div className="form-group full-width">
          <div className="table-header-row">
            <div className="section-title">Jasa</div>
            <button className="btn-add-row" onClick={addJasa} type="button"><Plus size={13} /> Tambah Jasa</button>
          </div>
          <table className="item-table">
            <thead><tr><th style={{ width: 32 }}>-</th><th>Masukkan Nama Jasa</th><th style={{ textAlign: 'right', width: 160 }}>Rp</th><th style={{ width: 36 }}></th></tr></thead>
            <tbody>
              {jasaRows.map((row, i) => (
                <tr key={i}>
                  <td className="row-num">{i + 1}</td>
                  <td><input type="text" className="item-input" placeholder="Nama jasa..." value={row.nama} onChange={(e) => updateJasa(i, 'nama', e.target.value)} /></td>
                  <td><input type="text" className="item-input item-rp" placeholder="0" value={row.harga} onChange={(e) => updateJasa(i, 'harga', e.target.value)} /></td>
                  <td><button className="btn-remove-row" onClick={() => removeJasa(i)} disabled={jasaRows.length === 1} type="button"><Trash2 size={13} /></button></td>
                </tr>
              ))}
              <tr className="total-row"><td colSpan={2}><strong>Total Jasa</strong></td><td style={{ textAlign: 'right' }}><strong>Rp {totalJasa.toLocaleString('id-ID')}</strong></td><td></td></tr>
            </tbody>
          </table>
        </div>
        <div className="form-group full-width"><div className="form-divider" /></div>
        <div className="form-group full-width">
          <div className="table-header-row">
            <div className="section-title">Barang</div>
            <button className="btn-add-row" onClick={addBarang} type="button"><Plus size={13} /> Tambah Barang</button>
          </div>
          <table className="item-table">
            <thead><tr><th style={{ width: 32 }}>-</th><th>Masukkan Nama Barang</th><th style={{ textAlign: 'right', width: 160 }}>Rp</th><th style={{ width: 36 }}></th></tr></thead>
            <tbody>
              {barangRows.map((row, i) => (
                <tr key={i}>
                  <td className="row-num">{i + 1}</td>
                  <td><input type="text" className="item-input" placeholder="Nama barang..." value={row.nama} onChange={(e) => updateBarang(i, 'nama', e.target.value)} /></td>
                  <td><input type="text" className="item-input item-rp" placeholder="0" value={row.harga} onChange={(e) => updateBarang(i, 'harga', e.target.value)} /></td>
                  <td><button className="btn-remove-row" onClick={() => removeBarang(i)} disabled={barangRows.length === 1} type="button"><Trash2 size={13} /></button></td>
                </tr>
              ))}
              <tr className="total-row"><td colSpan={2}><strong>Total Barang</strong></td><td style={{ textAlign: 'right' }}><strong>Rp {totalBarang.toLocaleString('id-ID')}</strong></td><td></td></tr>
            </tbody>
          </table>
        </div>
        <div className="form-group full-width"><div className="form-divider" /></div>
        <div className="form-group full-width">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '0.75rem 1rem', borderRadius: 8 }}>
            <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>Total Nilai Transaksi</strong>
            <strong style={{ fontSize: '1rem', color: '#1e293b' }}>Rp {totalNilai.toLocaleString('id-ID')}</strong>
          </div>
        </div>
      </div>
      <div className="button-row">
        {/* isSaving dihapus dari sini — save sekarang terjadi di step Tagihan */}
        <button className="btn-primary" disabled={!penjual || !pembeli} onClick={handleSubmit}>
          Lanjutkan <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

function DraftBupotStep({ onNext, onRollback, transaksi }: {
  onNext: (data: BupotData) => void
  onRollback: () => void
  initialData?: BupotData | null
  transaksi: TransaksiData | null
}) {
  const totalJasa = transaksi?.jasaRows?.reduce((s, r) => s + (Number(r.harga.replace(/\D/g, '')) || 0), 0) ?? 0
  const tarif = 2
  const nilaiPajak = Math.round(totalJasa * tarif / 100)
  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

  return (
    <div className="step-content">
      <div className="rollback-text" onClick={onRollback}>Rollback</div>
      <div className="step-icon-wrap orange"><FileText size={28} color="#f59e0b" /></div>
      <h2 className="step-title">Draft Bupot</h2>
      <p className="step-desc">Transaksi melibatkan Badan/Bendahara Pemerintah. Berikut ringkasan Bukti Pemotongan (Bupot).</p>

      <div className="form-grid">
        <div className="form-group full-width"><div className="section-title">Informasi Faktur</div></div>
        <div className="form-group">
          <label>Tanggal</label>
          <div className="readonly-field">{transaksi?.tanggal || '-'}</div>
        </div>
        <div className="form-group">
          <label>Masa</label>
          <div className="readonly-field">{transaksi?.masa || '-'}</div>
        </div>
        <div className="form-group full-width">
          <label>Nomor Transaksi</label>
          <div className="readonly-field mono">
            {transaksi?.nomorTransaksi
              ? transaksi.nomorTransaksi
              : transaksi?.tanggal
                ? `INV-${prefixMap[transaksi.jenisWP] ?? 'XX'}-???-${transaksi.tanggal.replace(/-/g, '')}`
                : '-'}
          </div>
        </div>
        <div className="form-group full-width"><div className="form-divider" /></div>
        <div className="form-group full-width"><div className="section-title">Pemotong</div></div>
        <div className="form-group">
          <label>Nama Pemotong</label>
          <div className="readonly-field">{transaksi?.pembeli || '-'}</div>
        </div>
        <div className="form-group">
          <label>NPWP Pemotong</label>
          <div className="readonly-field">{transaksi?.npwpPembeli || '-'}</div>
        </div>
        <div className="form-group full-width"><div className="form-divider" /></div>
        <div className="form-group full-width"><div className="section-title">Penerima Penghasilan</div></div>
        <div className="form-group">
          <label>Nama Penerima</label>
          <div className="readonly-field">{transaksi?.penjual || '-'}</div>
        </div>
        <div className="form-group">
          <label>NPWP Penerima</label>
          <div className="readonly-field">{transaksi?.npwpPenjual || '-'}</div>
        </div>
        <div className="form-group">
          <label>Kode Jasa</label>
          <div className="readonly-field">{transaksi?.kodeJasa || '-'}</div>
        </div>
        <div className="form-group">
          <label>Jenis Transaksi</label>
          <div className="readonly-field">{transaksi?.jenisJasa || '-'}</div>
        </div>
        <div className="form-group full-width"><div className="form-divider" /></div>
        <div className="form-group full-width">
          <div className="summary-box">
            <div className="summary-row">
              <span>DPP Jasa</span>
              <strong>{fmt(totalJasa)}</strong>
            </div>
            <div className="summary-row highlight-green">
              <span>Tarif PPh 23</span>
              <strong>{tarif}%</strong>
            </div>
            <div className="summary-divider" />
            <div className="summary-row total">
              <span>Nilai Pajak</span>
              <strong>{fmt(nilaiPajak)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="button-row">
        <button className="btn-primary" onClick={() => onNext({ jenis: 'PPh Pasal 23', tarif: String(tarif), nomor: transaksi?.nomorTransaksi || '' })}>
          Lanjutkan <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ── TagihanStep: simpan ke database HANYA saat pertama kali render (mount) ─────
function TagihanStep({ profil, transaksi, hasPPN, hasBupot, onReset, onRollback, userId, onSaveSuccess }: {
  profil: ProfilData | null
  transaksi: TransaksiData | null
  hasPPN: boolean
  hasBupot: boolean
  onReset: () => void
  onRollback: () => void
  userId: string | undefined
  onSaveSuccess: (nomorTransaksi: string) => void
}) {
  const router = useRouter()
  const savedRef = useRef(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Simpan ke database sekali saat tagihan pertama kali tampil
  useEffect(() => {
    if (savedRef.current) return           // sudah pernah disimpan di sesi ini
    if (!userId || !transaksi) return
    if (transaksi.nomorTransaksi) return   // sudah ada nomor → sudah tersimpan sebelumnya

    savedRef.current = true
    setIsSaving(true)
    setSaveError(null)

    saveTransaksiToDatabase(transaksi, userId)
      .then((result) => {
        if (!result.success) {
          setSaveError(result.error || 'Gagal menyimpan transaksi')
          savedRef.current = false          // izinkan retry
        } else if (result.nomorTransaksi) {
          onSaveSuccess(result.nomorTransaksi)
        }
      })
      .catch((err) => {
        setSaveError(err instanceof Error ? err.message : 'Unknown error')
        savedRef.current = false
      })
      .finally(() => setIsSaving(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalJasa   = transaksi?.jasaRows?.reduce((s, r)   => s + (Number(r.harga.replace(/\D/g, '')) || 0), 0) ?? 0
  const totalBarang = transaksi?.barangRows?.reduce((s, r) => s + (Number(r.harga.replace(/\D/g, '')) || 0), 0) ?? 0
  const dpp   = totalJasa + totalBarang
  const ppn   = hasPPN   ? Math.round(dpp       * 0.11) : 0
  const bupot = hasBupot ? Math.round(totalJasa  * 0.02) : 0
  // Khusus untuk pembeli bertipe Bendahara Pemerintah: total hanya dihitung dari Sub Total (DPP)
  // dan dikurangi PPh 23 (bupot). PPN tetap ditampilkan tetapi tidak dimasukkan ke total.
  const isBendaharaPembeli = transaksi?.jenisWP === 'bendahara_pemerintah'
  const total = isBendaharaPembeli ? dpp - bupot : dpp + ppn - bupot
  const fmt   = (n: number) => n.toLocaleString('id-ID')

  const nomorFaktur = transaksi?.nomorTransaksi
    ? transaksi.nomorTransaksi
    : transaksi?.tanggal
      ? `INV-${prefixMap[transaksi.jenisWP] ?? 'XX'}-???-${transaksi.tanggal.replace(/-/g, '')}`
      : '-'

  const handlePrint = () => {
    const jasaRowsHTML = (transaksi?.jasaRows?.filter(r => r.nama.trim()) ?? []).length === 0
      ? `<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:0.5rem;">Tidak ada jasa</td></tr>`
      : (transaksi?.jasaRows?.filter(r => r.nama.trim()) ?? []).map((row, i) => `
          <tr>
            <td class="row-num">${i + 1}</td>
            <td>${row.nama}</td>
            <td style="text-align:right;">${fmt(Number(row.harga.replace(/\D/g, '')))}</td>
          </tr>`).join('')

    const barangRowsHTML = (transaksi?.barangRows?.filter(r => r.nama.trim()) ?? []).length === 0
      ? `<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:0.5rem;">Tidak ada barang</td></tr>`
      : (transaksi?.barangRows?.filter(r => r.nama.trim()) ?? []).map((row, i) => `
          <tr>
            <td class="row-num">${i + 1}</td>
            <td>${row.nama}</td>
            <td style="text-align:right;">${fmt(Number(row.harga.replace(/\D/g, '')))}</td>
          </tr>`).join('')

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Tagihan - ${nomorFaktur}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; font-size: 13px; }
          .page { max-width: 720px; margin: 0 auto; padding: 2.5rem 2rem; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; padding-bottom: 1.25rem; border-bottom: 2px solid #1e3a5f; }
          .company-name { font-size: 1.5rem; font-weight: 800; color: #1e3a5f; letter-spacing: 0.02em; }
          .company-sub  { font-size: 0.75rem; color: #64748b; margin-top: 0.2rem; }
          .invoice-label { text-align: right; }
          .invoice-label h1 { font-size: 1.4rem; font-weight: 800; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.08em; }
          .invoice-label p  { font-size: 0.78rem; color: #64748b; margin-top: 0.15rem; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.75rem; }
          .meta-box { background: #f1f5f9; border-radius: 8px; padding: 0.9rem 1rem; }
          .meta-box .label { font-size: 0.68rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
          .meta-row { display: flex; justify-content: space-between; font-size: 0.8rem; padding: 0.15rem 0; }
          .meta-row span { color: #64748b; } .meta-row strong { color: #1e293b; }
          .section-title { font-size: 0.68rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; margin: 1.25rem 0 0.5rem; }
          table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
          thead tr { background: #1e3a5f; color: #fff; }
          thead th { padding: 0.55rem 0.75rem; text-align: left; font-weight: 600; font-size: 0.75rem; }
          thead th:last-child { text-align: right; }
          tbody tr:nth-child(even) { background: #f8fafc; }
          tbody td { padding: 0.45rem 0.75rem; color: #1e293b; border-bottom: 1px solid #e2e8f0; }
          tbody td:last-child { text-align: right; }
          .row-num { color: #94a3b8; text-align: center; width: 32px; }
          .total-row td { padding: 0.55rem 0.75rem; background: #e2e8f0; font-weight: 700; border-top: 2px solid #cbd5e1; }
          .total-row td:last-child { text-align: right; }
          .summary { margin-top: 1.75rem; border-top: 2px solid #1e3a5f; padding-top: 1rem; }
          .summary-row { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; font-size: 0.875rem; }
          .summary-row span { color: #64748b; } .summary-row strong { color: #1e293b; }
          .summary-row.green strong { color: #16a34a; }
          .summary-row.orange strong { color: #d97706; }
          .summary-divider { height: 1px; background: #e2e8f0; margin: 0.5rem 0; }
          .summary-row.total { padding: 0.65rem 0.75rem; background: #1e3a5f; border-radius: 8px; margin-top: 0.5rem; }
          .summary-row.total span, .summary-row.total strong { color: #fff; font-size: 1rem; font-weight: 700; }
          .footer { margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: #94a3b8; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { padding: 1.5rem; } }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div>
              <div class="company-name">${transaksi?.penjual || 'Perusahaan'}</div>
              <div class="company-sub">NPWP: ${transaksi?.npwpPenjual || '-'}</div>
            </div>
            <div class="invoice-label">
              <h1>Tagihan</h1>
              <p>${nomorFaktur}</p>
            </div>
          </div>
          <div class="meta-grid">
            <div class="meta-box">
              <div class="label">Informasi Faktur</div>
              <div class="meta-row"><span>Tanggal</span><strong>${transaksi?.tanggal ? new Date(transaksi.tanggal).toLocaleDateString('id-ID') : '-'}</strong></div>
              <div class="meta-row"><span>Masa</span><strong>${transaksi?.masa || '-'}</strong></div>
              <div class="meta-row"><span>Nomor</span><strong>${nomorFaktur}</strong></div>
            </div>
            <div class="meta-box">
              <div class="label">Pembeli</div>
              <div class="meta-row"><span>Nama</span><strong>${transaksi?.pembeli || '-'}</strong></div>
              <div class="meta-row"><span>NPWP</span><strong>${transaksi?.npwpPembeli || '-'}</strong></div>
              <div class="meta-row"><span>Jenis WP</span><strong>${transaksi?.jenisWP === 'badan' ? 'Badan' : transaksi?.jenisWP === 'bendahara_pemerintah' ? 'Bendahara Pemerintah' : 'Orang Pribadi'}</strong></div>
            </div>
          </div>
          <div class="section-title">Jasa</div>
          <table>
            <thead><tr><th style="width:32px;">-</th><th>Nama Jasa</th><th style="width:160px;text-align:right;">Rp</th></tr></thead>
            <tbody>${jasaRowsHTML}<tr class="total-row"><td colspan="2">Total Jasa</td><td>Rp ${fmt(totalJasa)}</td></tr></tbody>
          </table>
          <div class="section-title">Barang</div>
          <table>
            <thead><tr><th style="width:32px;">-</th><th>Nama Barang</th><th style="width:160px;text-align:right;">Rp</th></tr></thead>
            <tbody>${barangRowsHTML}<tr class="total-row"><td colspan="2">Total Barang</td><td>Rp ${fmt(totalBarang)}</td></tr></tbody>
          </table>
          <div class="summary">
            <div class="summary-row"><span>Sub Total</span><strong>Rp ${fmt(dpp)}</strong></div>
            ${hasPPN ? `<div class="summary-row green"><span>PPN / VAT</span><strong>Rp ${fmt(ppn)}</strong></div>` : ''}
            ${hasBupot ? `<div class="summary-row orange"><span>PPh 23 / Income Tax 23</span><strong>- Rp ${fmt(bupot)}</strong></div>` : ''}
            ${isBendaharaPembeli ? `<div class="summary-row" style="font-size:0.85rem;color:#64748b;margin-top:0.25rem;"><span>Catatan</span><strong>PPN tetap ditampilkan tetapi tidak termasuk dalam total untuk Bendahara Pemerintah</strong></div>` : ''}
            <div class="summary-divider"></div>
            <div class="summary-row total"><span>Total Tagihan / Current Charges</span><strong>Rp ${fmt(total)}</strong></div>
          </div>
          <div class="footer">
            <span>Dicetak oleh: ${profil?.namaWP || transaksi?.penjual || '-'} &nbsp;|&nbsp; NPWP: ${profil?.npwp || transaksi?.npwpPenjual || '-'}</span>
            <span>Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
        <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="step-content">
      <div className="rollback-text" onClick={onRollback}>Rollback</div>
      <div className="step-icon-wrap teal"><Receipt size={28} color="#0d9488" /></div>
      <h2 className="step-title">Tagihan</h2>
      <p className="step-desc">Ringkasan hasil perhitungan pajak Anda.</p>

      {/* ── Status penyimpanan ── */}
      {isSaving && (
        <div className="save-status saving">Menyimpan transaksi ke database…</div>
      )}
      {saveError && (
        <div className="save-status error">
          Gagal menyimpan: {saveError}
          <button
            className="retry-btn"
            onClick={() => { savedRef.current = false; setSaveError(null); }}
          >
            Coba lagi
          </button>
        </div>
      )}

      <div className="form-grid">
        <div className="form-group full-width"><div className="section-title">Informasi Faktur</div></div>
        <div className="form-group full-width">
          <label>Nomor Faktur</label>
          <div className="readonly-field mono">{nomorFaktur}</div>
        </div>
        <div className="form-group">
          <label>Tanggal</label>
          <div className="readonly-field">{transaksi?.tanggal ? new Date(transaksi.tanggal).toLocaleDateString('id-ID') : '-'}</div>
        </div>
        <div className="form-group">
          <label>Masa</label>
          <div className="readonly-field">{transaksi?.masa || '-'}</div>
        </div>
        <div className="form-group full-width"><div className="form-divider" /></div>
        <div className="form-group full-width"><div className="section-title">Lawan Transaksi</div></div>
        <div className="form-group">
          <label>Nama Lawan Transaksi</label>
          <div className="readonly-field">{transaksi?.pembeli || '-'}</div>
        </div>
        <div className="form-group">
          <label>NPWP</label>
          <div className="readonly-field">{transaksi?.npwpPembeli || '-'}</div>
        </div>
        <div className="form-group full-width"><div className="form-divider" /></div>
        <div className="form-group full-width"><div className="section-title">Jasa</div></div>
        <div className="form-group full-width">
          <table className="item-table">
            <thead><tr><th style={{ width: 32 }}>-</th><th>Nama Jasa</th><th style={{ textAlign: 'right', width: 160 }}>Rp</th></tr></thead>
            <tbody>
              {(transaksi?.jasaRows?.filter(r => r.nama.trim()) ?? []).length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8', padding: '0.5rem' }}>Tidak ada jasa</td></tr>
              ) : (
                transaksi?.jasaRows?.filter(r => r.nama.trim()).map((row, i) => (
                  <tr key={i}>
                    <td className="row-num">{i + 1}</td>
                    <td><div className="readonly-field">{row.nama}</div></td>
                    <td><div className="readonly-field" style={{ textAlign: 'right' }}>{fmt(Number(row.harga.replace(/\D/g, '')))}</div></td>
                  </tr>
                ))
              )}
              <tr className="total-row">
                <td colSpan={2}><strong>Total Jasa</strong></td>
                <td style={{ textAlign: 'right' }}><strong>Rp {fmt(totalJasa)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="form-group full-width"><div className="form-divider" /></div>
        <div className="form-group full-width"><div className="section-title">Barang</div></div>
        <div className="form-group full-width">
          <table className="item-table">
            <thead><tr><th style={{ width: 32 }}>-</th><th>Nama Barang</th><th style={{ textAlign: 'right', width: 160 }}>Rp</th></tr></thead>
            <tbody>
              {(transaksi?.barangRows?.filter(r => r.nama.trim()) ?? []).length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8', padding: '0.5rem' }}>Tidak ada barang</td></tr>
              ) : (
                transaksi?.barangRows?.filter(r => r.nama.trim()).map((row, i) => (
                  <tr key={i}>
                    <td className="row-num">{i + 1}</td>
                    <td><div className="readonly-field">{row.nama}</div></td>
                    <td><div className="readonly-field" style={{ textAlign: 'right' }}>{fmt(Number(row.harga.replace(/\D/g, '')))}</div></td>
                  </tr>
                ))
              )}
              <tr className="total-row">
                <td colSpan={2}><strong>Total Barang</strong></td>
                <td style={{ textAlign: 'right' }}><strong>Rp {fmt(totalBarang)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="form-group full-width"><div className="form-divider" /></div>
        <div className="form-group full-width">
          <div className="summary-box">
            <div className="summary-row">
              <span>Sub Total</span>
              <strong>Rp {fmt(dpp)}</strong>
            </div>
            {hasPPN && (
              <div className="summary-row highlight-green">
                <span>PPN / VAT</span>
                <strong>Rp {fmt(ppn)}</strong>
              </div>
            )}
            {hasBupot && (
              <div className="summary-row highlight-orange">
                <span>PPh 23 / Income Tax 23</span>
                <strong>- Rp {fmt(bupot)}</strong>
              </div>
            )}
            <div className="summary-divider" />
            <div className="summary-row total">
              <span>Total Tagihan / Current Charges</span>
              <strong>Rp {fmt(total)}</strong>
            </div>
          </div>
        </div>
        <div className="form-group full-width">
          <div className="badge-row" style={{ justifyContent: 'flex-start' }}>
            {hasPPN   && <span className="badge green"><CheckCircle size={13} /> PPN Terhitung</span>}
            {hasBupot && <span className="badge orange"><AlertCircle size={13} /> PPh 23 Dipotong</span>}
            {!hasPPN && !hasBupot && <span className="badge gray">Tidak ada pajak tambahan</span>}
          </div>
        </div>
      </div>

      <div className="tagihan-actions">
        <div className="tagihan-nav-row">
          <button className="btn-nav" onClick={() => router.push('/dashboard')}>
            <LayoutDashboard size={15} /> Dashboard
          </button>
          <button className="btn-nav" onClick={() => { onReset(); router.push('/dashboard/cekppn') }}>
            <ShoppingCart size={15} /> Transaksi Baru
          </button>
        </div>
        <div className="tagihan-btn-row">
          <button className="btn-outline" onClick={onReset}>
            <RefreshCw size={15} /> Mulai Ulang
          </button>
          <button className="btn-primary" onClick={handlePrint} disabled={isSaving}>
            <Printer size={15} /> {isSaving ? 'Menyimpan…' : 'Cetak / Unduh PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CekPPNPage() {
  const router = useRouter()
  const { user } = useAuth()
  const initializeRef = useRef(false)
  const [mounted, setMounted] = useState(false)
  const [sellerName, setSellerName] = useState(user?.namaWP || '')
  const [sellerNPWP, setSellerNPWP] = useState(user?.profil?.npwp || '')

  useEffect(() => { if (!user) router.push('/login') }, [user, router])

  useEffect(() => {
    if (!user?.id) return
    const fetchSeller = async () => {
      const { data, error } = await supabaseClient
        .from('users')
        .select('nama_wajib_pajak,npwp')
        .eq('id', user.id)
        .maybeSingle()
      if (!error && data) {
        setSellerName(data.nama_wajib_pajak || user.namaWP)
        setSellerNPWP(data.npwp || user.profil?.npwp || '')
      }
    }
    fetchSeller()
  }, [user?.id, user?.namaWP, user?.profil?.npwp])

  const [currentStep, setCurrentStep] = useState<Step>('input-transaksi')
  const [formData, setFormData] = useState<FormData>({ profil: user?.profil || null, transaksi: null, ppn: null, bupot: null })

  useEffect(() => {
    if (initializeRef.current) return
    initializeRef.current = true

    const saved = localStorage.getItem('siptax-cekppn-form')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const savedStep: Step = parsed._step || 'input-transaksi'

        if (savedStep === 'tagihan') {
          // Transaksi selesai → reset total, mulai dari awal
          localStorage.removeItem('siptax-cekppn-form')
        } else if (savedStep !== 'input-transaksi') {
          // Di tengah alur (ppn/bupot) tapi baru kembali → kembalikan data
          // transaksi tapi paksa step ke input-transaksi supaya bisa diedit ulang
          setFormData(prev => ({ ...parsed, profil: user?.profil || prev.profil, transaksi: parsed.transaksi || null, ppn: null, bupot: null }))
          setCurrentStep('input-transaksi')
        } else {
          // Masih di input-transaksi → restore normal
          setFormData(prev => ({ ...parsed, profil: user?.profil || prev.profil }))
          setCurrentStep('input-transaksi')
        }
      } catch { /* ignore */ }
    }

    setMounted(true)
  }, [])

  // Simpan formData + step aktif ke localStorage setiap kali berubah
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('siptax-cekppn-form', JSON.stringify({ ...formData, _step: currentStep }))
    }
  }, [formData, currentStep, mounted])

  const hasPPN   = formData.profil?.status === 'PKP'
  const hasBupot = formData.transaksi && (formData.transaksi.jenisWP === 'badan' || formData.transaksi.jenisWP === 'bendahara_pemerintah')

  const allSteps: { key: Step; label: string }[] = [
    { key: 'input-transaksi', label: 'Input Transaksi' },
    ...(hasPPN   ? [{ key: 'input-ppn'   as Step, label: 'Faktur PPN'  }] : []),
    ...(hasBupot ? [{ key: 'draft-bupot' as Step, label: 'Draft Bupot' }] : []),
    { key: 'tagihan', label: 'Tagihan' },
  ]

  const stepIndex = allSteps.findIndex((s) => s.key === currentStep)

  // Simpan hanya data ke state, TANPA hit database
  const handleTransaksiNext = (data: TransaksiData) => {
    // Pastikan nomorTransaksi di-reset agar TagihanStep tahu perlu menyimpan ulang
    const freshData = { ...data, nomorTransaksi: undefined }
    updateFormData(current => ({ ...current, transaksi: freshData }))
    if (hasPPN) setCurrentStep('input-ppn')
    else if (freshData.jenisWP === 'badan' || freshData.jenisWP === 'bendahara_pemerintah') setCurrentStep('draft-bupot')
    else setCurrentStep('tagihan')
  }

  // Callback dari TagihanStep setelah berhasil simpan → update nomorTransaksi di state
  // _step='tagihan' sudah otomatis tersimpan via useEffect, sehingga jika user
  // berpindah menu lalu kembali, localStorage akan terdeteksi selesai dan direset.
  const handleSaveSuccess = (nomorTransaksi: string) => {
    updateFormData(current => ({
      ...current,
      transaksi: current.transaksi ? { ...current.transaksi, nomorTransaksi } : current.transaksi,
    }))
  }

  const updateFormData  = (updater: (current: FormData) => FormData) => setFormData(prev => updater(prev))
  const handlePPNNext   = (data: PPNData, nextStep: Step) => { updateFormData(current => ({ ...current, ppn: data })); setCurrentStep(nextStep) }
  const handleBupotNext = (data: BupotData) => { updateFormData(current => ({ ...current, bupot: data })); setCurrentStep('tagihan') }
  const handleRollback  = () => { if (stepIndex > 0) setCurrentStep(allSteps[stepIndex - 1].key) }
  const handleReset     = () => {
    setFormData({ profil: null, transaksi: null, ppn: null, bupot: null })
    localStorage.removeItem('siptax-cekppn-form')
    setCurrentStep('input-transaksi')
  }

  // Derived display values
  const displayName   = user?.namaWP || 'User'
  const displayRole   = user?.profil?.bidangUsaha || 'Wajib Pajak'
  const displayAvatar = user?.namaWP?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'U'

  if (!mounted) return null

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', sans-serif; background: #f1f5f9; }
        .layout { display: flex; min-height: 100vh; }

        /* ── Topbar ── */
        .topbar { position: fixed; top: 0; left: 220px; right: 0; height: 64px; background: #fff; border-bottom: 1px solid #e8ecf0; display: flex; align-items: center; justify-content: space-between; padding: 0 2rem; z-index: 10; }
        .topbar-left { display: flex; align-items: center; gap: 0.75rem; font-size: 1.35rem; font-weight: 700; color: #1e293b; }
        .topbar-right { display: flex; align-items: center; }

        .user-info-btn { display: flex; align-items: center; gap: 0.75rem; padding: 0.45rem 0.75rem; border-radius: 12px; cursor: pointer; border: none; background: transparent; transition: background 0.15s; text-align: right; }
        .user-info-btn:hover { background: #f1f5f9; }
        .user-info-btn:hover .avatar { box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }
        .user-info-btn:hover .chevron-hint { color: #3b82f6; transform: translateX(2px); }
        .user-info { text-align: right; }
        .user-name { font-size: 0.875rem; font-weight: 600; color: #1e293b; display: block; }
        .user-role { font-size: 0.75rem; color: #94a3b8; display: block; }
        .avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #6366f1); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.85rem; font-weight: 700; flex-shrink: 0; transition: box-shadow 0.15s; }
        .chevron-hint { color: #cbd5e1; transition: color 0.15s, transform 0.15s; flex-shrink: 0; }

        .main { margin-left: 220px; padding-top: 64px; min-height: 100vh; }
        .main-content { padding: 2rem; }
        .content-card { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); overflow: hidden; }
        .step-progress { padding: 1.25rem 1.5rem; display: flex; align-items: center; border-bottom: 1px solid #f1f5f9; overflow-x: auto; }
        .step-item { display: flex; align-items: center; }
        .step-dot { width: 28px; height: 28px; border-radius: 50%; background: #f1f5f9; color: #94a3b8; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; }
        .step-dot.active { background: #eff6ff; color: #3b82f6; }
        .step-dot.done   { background: #3b82f6; color: #fff; }
        .step-label { font-size: 0.72rem; color: #94a3b8; margin-left: 0.4rem; white-space: nowrap; font-weight: 500; }
        .step-label.active { color: #3b82f6; font-weight: 600; }
        .step-line { height: 2px; width: 24px; background: #e8ecf0; margin: 0 0.4rem; flex-shrink: 0; }
        .step-line.done { background: #3b82f6; }
        .modal-body { padding: 1.5rem; }
        .step-content { display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; }
        .rollback-text { position: absolute; top: 0; right: 0; font-size: 0.7rem; color: #64748b; cursor: pointer; text-decoration: underline; }
        .step-icon-wrap { width: 60px; height: 60px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; }
        .step-icon-wrap.green  { background: #f0fdf4; }
        .step-icon-wrap.purple { background: #f5f3ff; }
        .step-icon-wrap.orange { background: #fffbeb; }
        .step-icon-wrap.teal   { background: #f0fdfa; }
        .step-title { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 0.4rem; }
        .step-desc  { font-size: 0.85rem; color: #64748b; max-width: 380px; margin-bottom: 1.5rem; }
        .form-grid  { display: flex; flex-direction: row; flex-wrap: wrap; gap: 1rem; width: 100%; text-align: left; margin-bottom: 1.5rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; min-width: 200px; }
        .form-group.full-width { flex: 0 0 100%; min-width: 100%; }
        .form-group label { font-size: 0.8rem; font-weight: 600; color: #374151; }
        .form-group input, .form-group select { width: 100%; padding: 0.6rem 0.9rem; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 0.875rem; color: #1e293b; background: #f8fafc; transition: border-color 0.15s; outline: none; }
        .form-group select:disabled { background: #f1f5f9; color: #64748b; cursor: not-allowed; }
        .section-title { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        .form-divider  { height: 1px; background: #e2e8f0; }
        .readonly-field { padding: 0.6rem 0.9rem; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 0.875rem; color: #1e293b; background: #f1f5f9; min-height: 38px; }
        .readonly-field.mono { font-family: 'Courier New', monospace; font-weight: 700; letter-spacing: 0.04em; }
        .summary-box { background: #f8fafc; border-radius: 10px; padding: 1rem 1.25rem; border: 1px solid #e2e8f0; }
        .summary-row { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; font-size: 0.875rem; }
        .summary-row span { color: #64748b; } .summary-row strong { color: #1e293b; }
        .summary-row.highlight-green  strong { color: #16a34a; }
        .summary-row.highlight-orange strong { color: #d97706; }
        .summary-row.total span, .summary-row.total strong { font-weight: 700; font-size: 1rem; color: #1e293b; }
        .summary-divider { height: 1px; background: #e2e8f0; margin: 0.5rem 0; }
        .nomor-badge { font-size: 0.65rem; font-weight: 700; background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; border-radius: 9999px; padding: 0.15rem 0.5rem; text-transform: uppercase; letter-spacing: 0.04em; }
        .nomor-display { display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 0.6rem 0.9rem; }
        .nomor-value { font-size: 0.9rem; font-weight: 700; color: #1e293b; font-family: 'Courier New', monospace; letter-spacing: 0.04em; }
        .nomor-hint  { font-size: 0.72rem; color: #94a3b8; }
        .table-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
        .btn-add-row { display: flex; align-items: center; gap: 0.3rem; background: #eff6ff; color: #3b82f6; border: 1.5px solid #bfdbfe; border-radius: 6px; padding: 0.3rem 0.75rem; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .btn-add-row:hover { background: #dbeafe; }
        .item-table { width: 100%; border-collapse: collapse; font-size: 0.825rem; }
        .item-table th { text-align: left; padding: 0.35rem 0.5rem; font-size: 0.75rem; color: #94a3b8; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
        .item-table td { padding: 0.25rem 0.5rem; vertical-align: middle; }
        .row-num { font-size: 0.75rem; color: #94a3b8; text-align: center; font-weight: 600; }
        .item-input { width: 100%; padding: 0.45rem 0.6rem; border: 1.5px solid #e2e8f0; border-radius: 6px; font-size: 0.825rem; color: #1e293b; background: #f8fafc; outline: none; }
        .item-input:focus { border-color: #3b82f6; background: #fff; }
        .item-rp { text-align: right; }
        .total-row td { padding: 0.5rem 0.5rem; border-top: 2px solid #e2e8f0; font-size: 0.825rem; color: #1e293b; background: #f8fafc; }
        .btn-remove-row { display: flex; align-items: center; justify-content: center; background: transparent; border: none; color: #cbd5e1; cursor: pointer; padding: 0.25rem; border-radius: 4px; transition: all 0.15s; }
        .btn-remove-row:hover:not(:disabled) { background: #fee2e2; color: #ef4444; }
        .btn-remove-row:disabled { opacity: 0.3; cursor: not-allowed; }
        .badge-row { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; margin-bottom: 1.25rem; }
        .badge { display: flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; font-weight: 600; padding: 0.35rem 0.75rem; border-radius: 9999px; }
        .badge.green  { background: #f0fdf4; color: #16a34a; }
        .badge.orange { background: #fffbeb; color: #d97706; }
        .badge.gray   { background: #f1f5f9; color: #64748b; }
        .tagihan-actions { display: flex; flex-direction: column; gap: 0.75rem; width: 100%; margin-top: 1.5rem; }
        .tagihan-nav-row  { display: flex; gap: 0.75rem; justify-content: center; }
        .tagihan-btn-row  { display: flex; gap: 0.75rem; justify-content: center; }
        .btn-nav { display: flex; align-items: center; gap: 0.4rem; background: #f8fafc; color: #475569; padding: 0.6rem 1.25rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; border: 1.5px solid #e2e8f0; cursor: pointer; transition: all 0.15s; }
        .btn-nav:hover { background: #f1f5f9; border-color: #cbd5e1; color: #1e293b; }
        .btn-primary { display: flex; align-items: center; gap: 0.4rem; background: #3b82f6; color: #fff; padding: 0.75rem 1.75rem; border-radius: 8px; font-size: 0.9rem; font-weight: 600; border: none; cursor: pointer; transition: background 0.15s; }
        .btn-primary:hover { background: #2563eb; }
        .btn-primary:disabled { background: #93c5fd; cursor: not-allowed; }
        .btn-outline { display: flex; align-items: center; gap: 0.4rem; background: #fff; color: #3b82f6; padding: 0.75rem 1.75rem; border-radius: 8px; font-size: 0.9rem; font-weight: 600; border: 1.5px solid #3b82f6; cursor: pointer; transition: all 0.15s; }
        .btn-outline:hover { background: #eff6ff; }
        .button-row { display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem; }

        /* ── Status penyimpanan ── */
        .save-status { width: 100%; padding: 0.65rem 1rem; border-radius: 8px; font-size: 0.82rem; font-weight: 500; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
        .save-status.saving { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
        .save-status.error  { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; justify-content: space-between; }
        .retry-btn { font-size: 0.78rem; font-weight: 700; color: #dc2626; background: transparent; border: 1.5px solid #fca5a5; border-radius: 6px; padding: 0.2rem 0.6rem; cursor: pointer; }
        .retry-btn:hover { background: #fee2e2; }
      `}</style>

      <div className="layout">
        <Sidebar />

        {/* ── Topbar ── */}
        <header className="topbar">
          <div className="topbar-left">Transaksi</div>
          <div className="topbar-right">
            <button
              className="user-info-btn"
              onClick={() => router.push('/dashboard/profil')}
              title="Lihat Profil"
            >
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
            <div className="content-card">
              <div className="step-progress">
                {allSteps.map((s, i) => (
                  <div key={s.key} className="step-item">
                    <div className={`step-dot ${i <= stepIndex ? 'active' : ''} ${i < stepIndex ? 'done' : ''}`}>
                      {i < stepIndex ? <CheckCircle size={14} /> : i + 1}
                    </div>
                    <span className={`step-label ${i <= stepIndex ? 'active' : ''}`}>{s.label}</span>
                    {i < allSteps.length - 1 && <div className={`step-line ${i < stepIndex ? 'done' : ''}`} />}
                  </div>
                ))}
              </div>
              <div className="modal-body" suppressHydrationWarning>
                {currentStep === 'input-transaksi' && (
                  <InputTransaksiStep
                    onNext={handleTransaksiNext}
                    onRollback={handleRollback}
                    initialData={formData.transaksi}
                    defaultPenjual={sellerName}
                    defaultNpwpPenjual={sellerNPWP}
                  />
                )}
                {currentStep === 'input-ppn' && (
                  <InputPPNStep
                    onNext={handlePPNNext}
                    onRollback={handleRollback}
                    hasBupot={Boolean(hasBupot)}
                    transaksi={formData.transaksi}
                  />
                )}
                {currentStep === 'draft-bupot' && (
                  <DraftBupotStep
                    onNext={handleBupotNext}
                    onRollback={handleRollback}
                    transaksi={formData.transaksi}
                  />
                )}
                {currentStep === 'tagihan' && (
                  <TagihanStep
                    profil={formData.profil}
                    transaksi={formData.transaksi}
                    hasPPN={Boolean(hasPPN)}
                    hasBupot={Boolean(hasBupot)}
                    onReset={handleReset}
                    onRollback={handleRollback}
                    userId={user?.id}
                    onSaveSuccess={handleSaveSuccess}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}