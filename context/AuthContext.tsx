'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabaseClient } from '@/lib/supabaseClient'

export interface ProfilData {
  namaWP: string
  npwp: string
  bidangUsaha: string
  alamat: string
  status: 'PKP' | 'Non PKP'
  periode: string
  perusahaan_id?: string | null
}

export interface CurrentUser {
  id: string
  namaWP: string
  kode_perusahaan: string   // ← tambah ini
  profil: ProfilData
}

interface AuthContextType {
  user: CurrentUser | null
  loading: boolean
  register: (profil: ProfilData, password: string) => Promise<{ success: boolean; error?: string }>
  login: (namaWP: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let timeoutId: number | null = null
    try {
      const storedUser = localStorage.getItem('siptax-user')
      const parsedUser = storedUser ? (JSON.parse(storedUser) as CurrentUser) : null
      timeoutId = window.setTimeout(() => {
        if (parsedUser) setUser(parsedUser)
        setLoading(false)
      }, 0)
    } catch {
      localStorage.removeItem('siptax-user')
      timeoutId = window.setTimeout(() => setLoading(false), 0)
    }
    return () => { if (timeoutId !== null) clearTimeout(timeoutId) }
  }, [])

  const register = async (profil: ProfilData, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Cek nama WP duplikat
      const { data: existing } = await supabaseClient
        .from('users')
        .select('nama_wajib_pajak')
        .eq('nama_wajib_pajak', profil.namaWP)
        .maybeSingle()

      if (existing) {
        return { success: false, error: 'Nama WP sudah terdaftar' }
      }

      // 2. Generate kode_perusahaan otomatis
      const { count } = await supabaseClient
        .from('users')
        .select('*', { count: 'exact', head: true })

      const urutan = (count ?? 0) + 1
      const kode_perusahaan = `CMP${String(urutan).padStart(3, '0')}`

      // 3. Hash password
      const hashedPassword = btoa(password)

      // 4. Insert user baru dengan kode_perusahaan
      const { data, error: insertError } = await supabaseClient
        .from('users')
        .insert([{
          nama_wajib_pajak: profil.namaWP,
          npwp: profil.npwp,
          bidang_usaha: profil.bidangUsaha,
          alamat: profil.alamat,
          status_pkp: profil.status === 'PKP',
          password: hashedPassword,
          kode_perusahaan,   // ← tambah ini
        }])
        .select()
        .single()

      if (insertError || !data) {
        return { success: false, error: insertError?.message || 'Gagal mendaftar' }
      }

      // 5. Simpan ke context + localStorage (termasuk kode_perusahaan)
      const currentUser: CurrentUser = {
        id: data.id,
        namaWP: data.nama_wajib_pajak!,
        kode_perusahaan: data.kode_perusahaan!,   // ← tambah ini
        profil: {
          namaWP: data.nama_wajib_pajak!,
          npwp: data.npwp!,
          bidangUsaha: data.bidang_usaha!,
          alamat: data.alamat!,
          status: data.status_pkp ? 'PKP' : 'Non PKP',
          periode: '',
        }
      }
      setUser(currentUser)
      localStorage.setItem('siptax-user', JSON.stringify(currentUser))

      return { success: true }
    } catch {
      return { success: false, error: 'Gagal mendaftar' }
    }
  }

  const login = async (namaWP: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error: selectError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('nama_wajib_pajak', namaWP)
        .maybeSingle()

      if (selectError || !data) {
        return { success: false, error: 'Nama WP tidak ditemukan' }
      }

      const hashedPassword = btoa(password)
      if (data.password !== hashedPassword) {
        return { success: false, error: 'Nama WP atau password salah' }
      }

      // Sertakan kode_perusahaan saat login
      const currentUser: CurrentUser = {
        id: data.id,
        namaWP: data.nama_wajib_pajak!,
        kode_perusahaan: data.kode_perusahaan ?? '',   // ← tambah ini
        profil: {
          namaWP: data.nama_wajib_pajak!,
          npwp: data.npwp!,
          bidangUsaha: data.bidang_usaha!,
          alamat: data.alamat!,
          status: data.status_pkp ? 'PKP' : 'Non PKP',
          periode: '',
        }
      }
      setUser(currentUser)
      localStorage.setItem('siptax-user', JSON.stringify(currentUser))

      return { success: true }
    } catch {
      return { success: false, error: 'Gagal login' }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('siptax-user')
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