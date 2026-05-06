import { createClient } from '@supabase/supabase-js'

type TransaksiData = {
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
  jasaRows?: { nama: string; harga: string }[]
  barangRows?: { nama: string; harga: string }[]
}

const prefixMap: Record<string, string> = {
  orang_pribadi: 'OP',
  badan: 'BDN',
  bendahara_pemerintah: 'BP',
}

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing Supabase environment variables' }),
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const body = await req.json()
  const { transaksiData, userId } = body as {
    transaksiData: TransaksiData
    userId: string
  }

  if (!transaksiData || !userId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Payload belum lengkap' }),
      { status: 400 }
    )
  }

  try {
    // ── 1. Ambil data user (termasuk status_pkp untuk has_ppn) ──
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('kode_perusahaan, npwp, status_pkp')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Data perusahaan tidak ditemukan' }),
        { status: 404 }
      )
    }

    const { kode_perusahaan, npwp, status_pkp } = userData

    // ── 2. Hitung urutan transaksi milik user ini ──
    const { count } = await supabase
      .from('transaksi')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const urutan = String((count ?? 0) + 1).padStart(3, '0')

    // ── 3. Format tanggal ──
    const tanggalFormatted = transaksiData.tanggal?.replace(/-/g, '') ?? '--------'

    // ── 4. Ambil 3 digit terakhir NPWP ──
    const npwpSuffix = (npwp ?? '000').replace(/\D/g, '').slice(-3) || '000'

    // ── 5. Build nomor transaksi ──
    const jenisPrefix = prefixMap[transaksiData.jenisWP] ?? 'XX'
    const nomor = `INV-${kode_perusahaan}-${jenisPrefix}-${urutan}-${tanggalFormatted}-${npwpSuffix}`

    // ── 6. Hitung total ──
    const totalJasa =
      transaksiData.jasaRows?.reduce(
        (sum, row) => sum + (Number(row.harga.replace(/\D/g, '')) || 0), 0
      ) || 0
    const totalBarang =
      transaksiData.barangRows?.reduce(
        (sum, row) => sum + (Number(row.harga.replace(/\D/g, '')) || 0), 0
      ) || 0
    const totalNilaiTransaksi = totalJasa + totalBarang

    // ── 7. Tentukan has_ppn dan has_bupot ──
    const hasPPN = status_pkp === true
    const hasBupot =
      transaksiData.jenisWP === 'badan' ||
      transaksiData.jenisWP === 'bendahara_pemerintah'

    // ── 8. Siapkan jasa_rows dan barang_rows sebagai JSON ──
    const jasaRowsClean = (transaksiData.jasaRows ?? [])
      .filter(r => r.nama.trim())
      .map(r => ({ nama: r.nama, harga: r.harga }))

    const barangRowsClean = (transaksiData.barangRows ?? [])
      .filter(r => r.nama.trim())
      .map(r => ({ nama: r.nama, harga: r.harga }))

    // ── 9. Insert transaksi ──
    const { data: transaksi, error: transaksiError } = await supabase
      .from('transaksi')
      .insert({
        user_id: userId,
        tanggal: transaksiData.tanggal,
        masa: transaksiData.masa,
        nomor_transaksi: nomor,
        penjual: transaksiData.penjual,
        npwp_penjual: transaksiData.npwpPenjual,
        jenis_wp: transaksiData.jenisWP,
        pembeli: transaksiData.pembeli,
        npwp_pembeli: transaksiData.npwpPembeli,
        kode_jasa: transaksiData.kodeJasa,
        jenis_jasa: transaksiData.jenisJasa,
        total_jasa: totalJasa,
        total_barang: totalBarang,
        total_nilai_transaksi: totalNilaiTransaksi,
        has_ppn: hasPPN,
        has_bupot: hasBupot,
        jasa_rows: jasaRowsClean,
        barang_rows: barangRowsClean,
      })
      .select('id')
      .single()

    if (transaksiError || !transaksi) {
      return new Response(
        JSON.stringify({ success: false, error: transaksiError?.message || 'Gagal membuat transaksi' }),
        { status: 500 }
      )
    }

    const transaksiId = transaksi.id

    // ── 10. Insert jasa ke tabel relasi ──
    if (jasaRowsClean.length) {
      const jasaData = jasaRowsClean.map(row => ({
        transaksi_id: transaksiId,
        nama_jasa: row.nama,
        nominal: Number(row.harga.replace(/\D/g, '')) || 0,
      }))

      const { error: jasaError } = await supabase.from('transaksi_jasa').insert(jasaData)
      if (jasaError) {
        return new Response(JSON.stringify({ success: false, error: jasaError.message }), { status: 500 })
      }
    }

    // ── 11. Insert barang ke tabel relasi ──
    if (barangRowsClean.length) {
      const barangData = barangRowsClean.map(row => ({
        transaksi_id: transaksiId,
        nama_barang: row.nama,
        nominal: Number(row.harga.replace(/\D/g, '')) || 0,
      }))

      const { error: barangError } = await supabase.from('transaksi_barang').insert(barangData)
      if (barangError) {
        return new Response(JSON.stringify({ success: false, error: barangError.message }), { status: 500 })
      }
    }

    return new Response(
      JSON.stringify({ success: true, transaksiId, nomorTransaksi: nomor }),
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error)
    return new Response(
      JSON.stringify({ success: false, error: message || 'Unknown server error' }),
      { status: 500 }
    )
  }
}