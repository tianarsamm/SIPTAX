import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

type RegisterPayload = {
  namaWP: string
  npwp: string
  bidangUsaha: string
  alamat: string
  status: 'PKP' | 'Non PKP'
  password: string
  email: string
}

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: 'Missing Supabase environment variables' },
      { status: 500 }
    )
  }

  const body = (await req.json()) as RegisterPayload
  const { namaWP, npwp, bidangUsaha, alamat, status, password, email } = body

  if (!namaWP || !npwp || !password || !email) {
    return NextResponse.json(
      { success: false, error: 'Payload belum lengkap' },
      { status: 400 }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nama_wajib_pajak: namaWP,
      npwp,
      bidang_usaha: bidangUsaha,
      alamat,
      status_pkp: status === 'PKP',
    },
  })

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }

  if (!data.user) {
    return NextResponse.json(
      { success: false, error: 'Gagal membuat akun' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
