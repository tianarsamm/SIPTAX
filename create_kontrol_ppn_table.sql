-- Membuat tabel kontrol_ppn
CREATE TABLE IF NOT EXISTS kontrol_ppn (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  masa TEXT NOT NULL,
  tanggal DATE NOT NULL,
  penyewaan_dpp NUMERIC(15,2) DEFAULT 0,
  penyewaan_ppn NUMERIC(15,2) DEFAULT 0,
  pengadaan_dpp NUMERIC(15,2) DEFAULT 0,
  pengadaan_ppn NUMERIC(15,2) DEFAULT 0,
  pembelian_dpp NUMERIC(15,2) DEFAULT 0,
  pembelian_ppn NUMERIC(15,2) DEFAULT 0,
  ppn_keluaran NUMERIC(15,2) DEFAULT 0,
  ppn_masukan NUMERIC(15,2) DEFAULT 0,
  kurang_bayar NUMERIC(15,2) DEFAULT 0,
  status_lapor TEXT,
  ntpn TEXT,
  tgl_bayar DATE,
  tgl_lapor DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membuat index untuk performa
CREATE INDEX IF NOT EXISTS idx_kontrol_ppn_user_id ON kontrol_ppn(user_id);
CREATE INDEX IF NOT EXISTS idx_kontrol_ppn_tanggal ON kontrol_ppn(tanggal);

-- Mengaktifkan Row Level Security (RLS)
ALTER TABLE kontrol_ppn ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS: User hanya bisa melihat data mereka sendiri
CREATE POLICY "Users can view own kontrol_ppn data" ON kontrol_ppn
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own kontrol_ppn data" ON kontrol_ppn
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own kontrol_ppn data" ON kontrol_ppn
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own kontrol_ppn data" ON kontrol_ppn
  FOR DELETE USING (auth.uid() = user_id);