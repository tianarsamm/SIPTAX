// Generated types - update with your schema
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'user'
          perusahaan_id: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          role: 'admin' | 'user'
          perusahaan_id?: string | null
          updated_at?: string | null
        }
        Update: {
          role?: 'admin' | 'user'
          perusahaan_id?: string | null
          updated_at?: string | null
        }
      }
    }
  }
}

declare module '@supabase/ssr' {
  export interface SupabaseSessionUser {
    profile: Database['public']['Tables']['profiles']['Row'] | null
  }
}

