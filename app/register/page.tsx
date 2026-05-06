'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, ProfilData } from '@/context/AuthContext'
import { ChevronRight, AlertCircle, ShieldCheck, User } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const { register, user, logout } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ProfilData>({
    namaWP: '',
    npwp: '',
    bidangUsaha: '',
    alamat: '',
    status: 'Non PKP',
    periode: '',
  })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Redirect to login if user is already authenticated
  useEffect(() => {
    if (user) {
      router.push('/login')
    }
  }, [user, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value as any }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    setError('')

    if (!formData.namaWP || !formData.npwp) {
      setError('Nama WP dan NPWP harus diisi')
      return
    }
    if (!password || !confirmPassword) {
      setError('Password dan Konfirmasi Password harus diisi')
      return
    }
    if (password !== confirmPassword) {
      setError('Password tidak cocok')
      return
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }

    setLoading(true)
    const result = await register(formData, password)

    if (result.success) {
      // Logout immediately after register, then redirect to login
      logout()
      router.push('/login')
    } else {
      setError(result.error || 'Gagal mendaftar')
      setLoading(false)
    }
  }

  const handleGoToLogin = () => {
    logout()
    router.push('/login')
  }

  return (
    <div style={styles.container}>
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <div style={styles.card}>

        {/* ── LEFT PANEL ── */}
        <div style={styles.leftPanel}>
          {/* Branding */}
          <div style={styles.brandBlock}>
            <div style={styles.brand}>
              <span style={styles.brandMark}>Sip</span>
              <span style={styles.brandName}>Tax</span>
            </div>
            <h1 style={styles.heading}>Buat Akun Baru</h1>
            <p style={styles.subheading}>Daftarkan diri Anda untuk mulai menggunakan SiPTax</p>
          </div>

          <div style={styles.panelHeader}>
            <div style={styles.iconWrap}>
              <User size={20} color="#fff" />
            </div>
            <div>
              <h2 style={styles.panelTitle}>Data Profil</h2>
              <p style={styles.panelSub}>Informasi wajib pajak</p>
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Nama Wajib Pajak</label>
            <input
              type="text"
              name="namaWP"
              value={formData.namaWP}
              onChange={handleChange}
              placeholder="PT. Contoh Indonesia"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>NPWP</label>
            <input
              type="text"
              name="npwp"
              value={formData.npwp}
              onChange={handleChange}
              placeholder="00.000.000.0-000.000"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Bidang Usaha</label>
            <input
              type="text"
              name="bidangUsaha"
              value={formData.bidangUsaha}
              onChange={handleChange}
              placeholder="Jasa Konsultasi"
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Alamat</label>
            <input
              type="text"
              name="alamat"
              value={formData.alamat}
              onChange={handleChange}
              placeholder="Jl. Contoh No. 123"
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="PKP">PKP</option>
              <option value="Non PKP">Non PKP</option>
            </select>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={styles.rightPanel}>
          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={15} style={{ marginRight: '0.5rem', flexShrink: 0 }} />
              {error}
            </div>
          )}

          <div style={styles.panelHeader}>
            <div style={{ ...styles.iconWrap, background: '#3b82f6' }}>
              <ShieldCheck size={20} color="#fff" />
            </div>
            <div>
              <h2 style={styles.panelTitle}>Keamanan</h2>
              <p style={styles.panelSub}>Buat password yang kuat</p>
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Konfirmasi Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Masukkan ulang password"
              style={styles.input}
              required
            />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            style={{
              ...styles.submitButton,
              opacity: loading ? 0.65 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Mendaftar...' : (
              <>Daftar Sekarang <ChevronRight size={16} style={{ marginLeft: '0.4rem' }} /></>
            )}
          </button>

          <p style={styles.footer}>
            Sudah punya akun?{' '}
            <button
              type="button"
              onClick={handleGoToLogin}
              style={{
                ...styles.link,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: 'inherit',
              }}
            >
              Masuk di sini
            </button>
          </p>
        </div>

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
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    maxWidth: '900px',
    minHeight: '540px',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  leftPanel: {
    flex: 1,
    padding: '2.5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    background: '#f8fafc',
    borderRight: '1px solid #e2e8f0',
  },
  rightPanel: {
    flex: 1,
    padding: '2.5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  brandBlock: {
    marginBottom: '0.5rem',
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
    marginTop: '0.5rem',
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
    marginTop: '0.5rem',
    paddingTop: '0.5rem',
  },
  link: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 700,
  },
}