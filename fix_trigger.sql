-- ============================================================
-- PERBAIKAN TRIGGER UNTUK AUTO-INSERT KE PUBLIC.USERS
-- ============================================================
-- Jalankan SQL di bawah ini di Supabase SQL Editor

-- 1. Drop trigger lama jika ada
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop fungsi lama jika ada  
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Buat fungsi baru dengan error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  next_kode TEXT;
BEGIN
  -- Generate kode_perusahaan otomatis
  SELECT 'CMP' || LPAD(
    COALESCE(
      MAX(CAST(SUBSTRING(kode_perusahaan, 4) AS INTEGER)), 
      0
    ) + 1, 
    3, 
    '0'
  )::TEXT
  INTO next_kode
  FROM public.users;

  -- Insert ke public.users dengan metadata dari auth.users
  INSERT INTO public.users (
    auth_id,
    nama_wajib_pajak,
    npwp,
    bidang_usaha,
    alamat,
    status_pkp,
    kode_perusahaan
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama_wajib_pajak', NEW.email, 'Unknown'),
    COALESCE(NEW.raw_user_meta_data->>'npwp', '00.000.000.0-000.000'),
    NEW.raw_user_meta_data->>'bidang_usaha',
    NEW.raw_user_meta_data->>'alamat',
    (NEW.raw_user_meta_data->>'status_pkp')::boolean,
    next_kode
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error tapi jangan block signup
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Buat trigger baru
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Verifikasi - lihat trigger yang ada
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'auth' AND event_object_table = 'users';

-- 6. Verifikasi function - lihat fungsi yang ada
SELECT routine_name, routine_schema
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'handle_new_user';
