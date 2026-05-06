import { getCurrentUser } from '@/lib/auth'

export default async function AdminPage() {
  const user = await getCurrentUser()

  return (
    <div style={{padding: '2rem'}}>
      <h1 style={{color: 'var(--foreground)'}}>Admin Dashboard</h1>
      <p>Welcome, {user?.email} (Role: {user?.profile?.role})</p>
      <pre style={{background: '#f3f4f6', padding: '1rem', borderRadius: '4px'}}>
{JSON.stringify(user, null, 2)}
      </pre>
    </div>
  )
}

