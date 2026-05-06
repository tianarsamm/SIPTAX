export type Database = {
  public: {
    Tables: {
      // Existing tables
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'user'
          perusahaan_id: string | null
        }
        Insert: {
          id: string
          role?: 'admin' | 'user'
          perusahaan_id?: string | null
        }
        Update: {
          id?: string
          role?: 'admin' | 'user'
          perusahaan_id?: string | null
        }
      },
      users: {
        Row: {
          id: string
          nama_wajib_pajak: string | null
          npwp: string | null
          bidang_usaha: string | null
          alamat: string | null
          status_pkp: boolean
          password: string | null
          created_at: string | null
        }
        Insert: {
          nama_wajib_pajak?: string | null
          npwp?: string | null
          bidang_usaha?: string | null
          alamat?: string | null
          status_pkp?: boolean
          password?: string | null
        }
        Update: {
          nama_wajib_pajak?: string | null
          npwp?: string | null
          bidang_usaha?: string | null
          alamat?: string | null
          status_pkp?: boolean
          password?: string | null
        }
      },
// NEW: Transaksi tables matching exact schema
      transaksi: {
        Row: {
          id: string
          perusahaan_id: string | null
          user_id: string
          tanggal: string // DATE as string
          masa: string | null
          nomor_transaksi: string
          penjual: string | null
          npwp_penjual: string | null
          jenis_wp: string
          pembeli: string | null
          npwp_pembeli: string | null
          kode_jasa: string | null
          jenis_jasa: string | null
          total_jasa: number | null
          total_barang: number | null
          total_nilai_transaksi: number | null
          has_ppn: boolean | null
          has_bupot: boolean | null
          status_ppn: string | null
          status_bupot: string | null
          created_at: string
        }
        Insert: {
          id?: string
          perusahaan_id?: string | null
          user_id: string
          tanggal: string
          masa?: string | null
          nomor_transaksi: string
          penjual?: string | null
          npwp_penjual?: string | null
          jenis_wp: string
          pembeli?: string | null
          npwp_pembeli?: string | null
          kode_jasa?: string | null
          jenis_jasa?: string | null
          total_jasa?: number | null
          total_barang?: number | null
          total_nilai_transaksi?: number | null
          has_ppn?: boolean | null
          has_bupot?: boolean | null
          status_ppn?: string | null
          status_bupot?: string | null
        }
        Update: {
          perusahaan_id?: string | null
          user_id?: string
          tanggal?: string
          masa?: string | null
          nomor_transaksi?: string
          penjual?: string | null
          npwp_penjual?: string | null
          jenis_wp?: string
          pembeli?: string | null
          npwp_pembeli?: string | null
          kode_jasa?: string | null
          jenis_jasa?: string | null
          total_jasa?: number | null
          total_barang?: number | null
          total_nilai_transaksi?: number | null
          has_ppn?: boolean | null
          has_bupot?: boolean | null
          status_ppn?: string | null
          status_bupot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaksi_perusahaan_id_fkey",
            columns: ["perusahaan_id"],
            referencedRelation: "profiles",
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaksi_user_id_fkey",
            columns: ["user_id"],
            referencedRelation: "users",
            referencedColumns: ["id"]
          }
        ]
      },
      transaksi_jasa: {
        Row: {
          id: string
          transaksi_id: string
          nama_jasa: string | null
          nominal: number | null
        }
        Insert: {
          id?: string
          transaksi_id: string
          nama_jasa?: string | null
          nominal?: number | null
        }
        Update: {
          transaksi_id?: string
          nama_jasa?: string | null
          nominal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transaksi_jasa_transaksi_id_fkey",
            columns: ["transaksi_id"],
            referencedRelation: "transaksi",
            referencedColumns: ["id"]
          }
        ]
      },
      transaksi_barang: {
        Row: {
          id: string
          transaksi_id: string
          nama_barang: string | null
          nominal: number | null
        }
        Insert: {
          id?: string
          transaksi_id: string
          nama_barang?: string | null
          nominal?: number | null
        }
        Update: {
          transaksi_id?: string
          nama_barang?: string | null
          nominal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transaksi_barang_transaksi_id_fkey",
            columns: ["transaksi_id"],
            referencedRelation: "transaksi",
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

