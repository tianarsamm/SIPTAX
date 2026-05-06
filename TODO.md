# TODO - PPN Menu Implementation

## Tasks

### 1. Update database.types.ts
- [x] Add `status_ppn` field to transaksi type

### 2. Update Sidebar.tsx
- [ ] Add PPN parent menu with submenus (Arsip PPN, Kontrol PPN)

### 3. Create Arsip PPN Page
- [ ] Create `app/dashboard/arsipppn/page.tsx`
- [ ] Add table with columns: No, Tanggal, Nomor Invoice, NPWP, Nama, Jenis WP, DPP, PPN
- [ ] Fetch real-time data from transaksi table where has_ppn = true

### 4. Create Kontrol PPN Page
- [ ] Create `app/dashboard/kontrolppn/page.tsx`
- [ ] Add filters (masa, tahun, status)
- [ ] Add editable status dropdown
- [ ] Add export CSV functionality
- [ ] Add summary cards (Total DPP, Total PPN 12%, etc.)

## Status
- In Progress: Implementing all tasks
