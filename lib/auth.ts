import { createServerSupabaseClient } from './Supabase/server'

export async function getSession() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient()
  const user = await getSession()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role, perusahaan_id')
    .eq('id', user.id)
    .single()

  return { ...user, profile }
}