'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabaseClient } from '@/lib/supabaseClient'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export interface ProfilData {
  namaWP: string
  npwp: string
  bidangUsaha: string
  alamat: string
  status: 'PKP' | 'Non PKP'
  periode: string
}

export interface CurrentUser {
  id: string
  namaWP: string
  kode_perusahaan: string
  profil: ProfilData
}

interface AuthContextType {
  user: CurrentUser | null
  loading: boolean
  register: (profil: ProfilData, password: string) => Promise<{ success: boolean; error?: string }>
  login: (namaWP: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const stableHash = (value: string) => {
    let hash = 0
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) | 0
    }
    return Math.abs(hash).toString(36).slice(0, 8)
  }

  const makeAuthEmail = (namaWP: string) => {
    const slug = namaWP
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/\.{2,}/g, '.')
      .replace(/^\.+|\.+$/g, '')

    const base = slug || `user-${stableHash(namaWP || 'user')}`
    return `${base}@siptax.app`
  }

  // ─── Fetch profil dari public.users ───────────────────────────────────────

  const fetchProfil = async (authId: string): Promise<CurrentUser | null> => {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .maybeSingle()

    if (error || !data) return null

    return {
      id: authId,
      namaWP: data.nama_wajib_pajak ?? '',
      kode_perusahaan: data.kode_perusahaan ?? '',
      profil: {
        namaWP: data.nama_wajib_pajak ?? '',
        npwp: data.npwp ?? '',
        bidangUsaha: data.bidang_usaha ?? '',
        alamat: data.alamat ?? '',
        status: data.status_pkp ? 'PKP' : 'Non PKP',
        periode: '',
      },
    }
  }

  // ─── Session listener ─────────────────────────────────────────────────────

  useEffect(() => {
    let isActive = true
    let latestUpdate = 0

    const applySession = async (session: Session | null) => {
      const updateId = ++latestUpdate

      try {
        const nextUser = session?.user
          ? await fetchProfil(session.user.id)
          : null

        if (isActive && updateId === latestUpdate) {
          setUser(nextUser)
        }
      } catch {
        if (isActive && updateId === latestUpdate) {
          setUser(null)
        }
      } finally {
        if (isActive && updateId === latestUpdate) {
          setLoading(false)
        }
      }
    }

    void supabaseClient.auth.getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => applySession(session))
      .catch(() => {
        if (isActive) {
          setUser(null)
          setLoading(false)
        }
      })

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        // Supabase holds its auth lock while this callback runs. Fetch after it releases.
        setTimeout(() => {
          if (isActive) {
            void applySession(session)
          }
        }, 0)
      }
    )

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  // ─── Register ─────────────────────────────────────────────────────────────

  const register = async (
    profil: ProfilData,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      let email = makeAuthEmail(profil.namaWP)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        email = `user-${Math.abs(
          Array.from(profil.namaWP || 'user').reduce(
            (acc, char) => acc * 31 + char.charCodeAt(0),
            0
          )
        ).toString(36)}@siptax.app`
      }

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namaWP: profil.namaWP,
          npwp: profil.npwp,
          bidangUsaha: profil.bidangUsaha,
          alamat: profil.alamat,
          status: profil.status,
          password,
          email,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        return { success: false, error: result.error || 'Gagal mendaftar' }
      }

      return { success: true }
    } catch {
      return { success: false, error: 'Gagal mendaftar' }
    }
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  const login = async (
    namaWP: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Verifikasi nama WP via API route (service role, bypass RLS)
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaWP, password }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        return { success: false, error: result.error || 'Nama WP tidak ditemukan' }
      }

      // 2. Gunakan email dari DB jika tersimpan, fallback ke rekonstruksi
      const email: string = result.email ?? makeAuthEmail(result.namaWP)

      // 3. Sign in ke Supabase Auth
      const { error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        return { success: false, error: 'Nama WP atau password salah' }
      }

      return { success: true }
    } catch {
      return { success: false, error: 'Gagal login' }
    }
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  const logout = async () => {
    await supabaseClient.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
