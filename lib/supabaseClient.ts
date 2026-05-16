import { createBrowserClient } from '@supabase/ssr'

// Singleton — satu instance untuk seluruh app
let instance: ReturnType<typeof createBrowserClient> | null = null

export const supabaseClient = (() => {
  if (!instance) {
    instance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return instance
})()