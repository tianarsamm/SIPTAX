'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { ChevronRight, AlertCircle, LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login, user, loading: authLoading } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [namaWP, setNamaWP] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '200px',
            fontSize: '1rem',
            color: '#64748b'
          }}>
            Loading...
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!namaWP || !password) {
      setError('Nama WP dan Password harus diisi')
      return
    }

    setLoading(true)
    const result = await login(namaWP, password)

    if (result.success) {
      router.push('/dashboard')
    } else {
      setError(result.error || 'Gagal login')
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <div style={styles.card}>
        <div style={styles.brandBlock}>
          <div style={styles.brand}>
            <span style={styles.brandMark}>Sip</span>
            <span style={styles.brandName}>Tax</span>
          </div>
          <h1 style={styles.heading}>Selamat Datang</h1>
          <p style={styles.subheading}>Masuk untuk melanjutkan ke dashboard SipTax Anda</p>
        </div>

        <div style={styles.panelHeader}>
          <div style={styles.iconWrap}>
            <LogIn size={20} color="#fff" />
          </div>
          <div>
            <h2 style={styles.panelTitle}>Masuk Akun</h2>
            <p style={styles.panelSub}>Masukkan data Wajib Pajak Anda</p>
          </div>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={15} style={{ marginRight: '0.5rem', flexShrink: 0 }} />
            {error}
          </div>
        )}

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Nama Wajib Pajak</label>
          <input
            type="text"
            value={namaWP}
            onChange={(e) => setNamaWP(e.target.value)}
            placeholder="PT. Contoh Indonesia"
            style={styles.input}
            required
            suppressHydrationWarning
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan password"
            style={styles.input}
            required
            suppressHydrationWarning
          />
        </div>

        <button
          type="submit"
          onClick={handleSubmit}
          disabled={loading}
          suppressHydrationWarning
          style={{
            ...styles.submitButton,
            opacity: loading ? 0.65 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Memproses...' : (
            <>Masuk <ChevronRight size={16} style={{ marginLeft: '0.4rem' }} /></>
          )}
        </button>

        <p style={styles.footer}>
          Belum punya akun?{' '}
          <a href="/register" style={styles.link}>Daftar di sini</a>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#dbeafe',
    padding: '1.5rem',
    position: 'relative',
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    top: '-80px',
    left: '-80px',
    width: '320px',
    height: '320px',
    background: 'radial-gradient(circle, rgba(102,126,234,0.25) 0%, transparent 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  blob2: {
    position: 'absolute',
    bottom: '-80px',
    right: '-60px',
    width: '280px',
    height: '280px',
    background: 'radial-gradient(circle, rgba(118,75,162,0.20) 0%, transparent 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  card: {
    background: '#fff',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(102,126,234,0.18)',
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    position: 'relative',
    zIndex: 1,
  },
  brandBlock: {
    marginBottom: '0.25rem',
  },
  brand: {
    display: 'inline-flex',
    alignItems: 'baseline',
    marginBottom: '0.5rem',
  },
  brandMark: {
    fontSize: '1.1rem',
    fontWeight: 800,
    color: '#3b82f6',
    letterSpacing: '-0.03em',
  },
  brandName: {
    fontSize: '1.1rem',
    fontWeight: 800,
    color: '#1e293b',
    letterSpacing: '-0.02em',
  },
  heading: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 0.25rem 0',
    lineHeight: 1.2,
  },
  subheading: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    margin: 0,
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.25rem',
  },
  iconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: '#3b82f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  panelTitle: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  panelSub: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    margin: 0,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#475569',
    letterSpacing: '0.01em',
  },
  input: {
    padding: '0.55rem 0.85rem',
    border: '1.5px solid #e2e8f0',
    borderRadius: '9px',
    fontSize: '0.85rem',
    color: '#1e293b',
    background: '#fff',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
  errorBox: {
    background: '#fff1f2',
    border: '1px solid #fecdd3',
    borderRadius: '9px',
    padding: '0.65rem 0.9rem',
    color: '#e11d48',
    display: 'flex',
    alignItems: 'flex-start',
    fontSize: '0.8rem',
    lineHeight: 1.4,
  },
  submitButton: {
    marginTop: '0.25rem',
    padding: '0.8rem 1.5rem',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '0.01em',
    boxShadow: '0 4px 14px rgba(59,130,246,0.4)',
  },
  footer: {
    textAlign: 'center',
    fontSize: '0.8rem',
    color: '#94a3b8',
    marginTop: '0.25rem',
  },
  link: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 700,
  },
}