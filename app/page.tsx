'use client';

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function HomePage() {
  const router = useRouter()
  const { loading } = useAuth()

  useEffect(() => {
    if (loading) return
    router.replace('/login')
  }, [loading, router])

  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      color: '#64748b',
      background: '#f1f5f9',
    }}>
      Memuat SipTax...
    </main>
  )
}
