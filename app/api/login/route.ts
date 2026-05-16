import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const makeAuthEmail = (namaWP: string) => {
  const slug = namaWP
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '')

  return `${slug || 'user'}@siptax.app`
}

export async function POST(req: Request) {
  try {
    const { namaWP, password } = await req.json()

    if (!namaWP || !password) {
      return NextResponse.json(
        { success: false, error: 'Nama WP dan password wajib diisi' },
        { status: 400 }
      )
    }

    // Cari user pakai service role (bypass RLS)
    const { data: userData, error } = await supabaseAdmin
      .from('users')
      .select('nama_wajib_pajak')
      .ilike('nama_wajib_pajak', namaWP.trim())
      .maybeSingle()

    if (error || !userData) {
      return NextResponse.json(
        { success: false, error: 'Nama WP tidak ditemukan' },
        { status: 404 }
      )
    }

    // Rekonstruksi email dari nama WP yang ditemukan di DB
    const email = makeAuthEmail(userData.nama_wajib_pajak)

    return NextResponse.json({
      success: true,
      namaWP: userData.nama_wajib_pajak,
      email,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}