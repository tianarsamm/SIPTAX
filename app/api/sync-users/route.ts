import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: 'Missing Supabase environment variables' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Ambil semua user dari auth.users yang belum punya di public.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      return NextResponse.json(
        { success: false, error: `Auth error: ${authError.message}` },
        { status: 500 }
      )
    }

    const syncResults = []

    for (const authUser of authUsers.users) {
      // Cek apakah user sudah ada di public.users
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, auth_id')
        .eq('auth_id', authUser.id)
        .maybeSingle()

      if (existingUser) {
        syncResults.push({
          authId: authUser.id,
          email: authUser.email,
          status: 'already_exists',
        })
        continue
      }

      // Generate kode_perusahaan
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
      const kodePerusahaan = `CMP${String((count ?? 0) + 1).padStart(3, '0')}`

      // Insert ke public.users
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          auth_id: authUser.id,
          nama_wajib_pajak: authUser.user_metadata?.nama_wajib_pajak || authUser.email?.split('@')[0] || 'Unknown',
          npwp: authUser.user_metadata?.npwp || '00.000.000.0-000.000',
          bidang_usaha: authUser.user_metadata?.bidang_usaha || null,
          alamat: authUser.user_metadata?.alamat || null,
          status_pkp: authUser.user_metadata?.status_pkp ?? false,
          kode_perusahaan: kodePerusahaan,
        })

      if (insertError) {
        syncResults.push({
          authId: authUser.id,
          email: authUser.email,
          status: 'sync_failed',
          error: insertError.message,
        })
      } else {
        syncResults.push({
          authId: authUser.id,
          email: authUser.email,
          status: 'synced',
          kodePerusahaan,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${authUsers.users.length} users`,
      results: syncResults,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
