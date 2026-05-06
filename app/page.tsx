'use client';

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    // Always redirect to login page
    router.push('/login')
  }, [loading, router])

  // Show loading or nothing while redirecting
  return null
}
