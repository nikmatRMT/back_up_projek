# Prototipe KYC Dummy

Prototipe mandiri untuk menyimulasikan verifikasi identitas Jawarga tanpa menggunakan KTP atau data pribadi asli.

## Skenario pengujian manual

1. Pilih **KTP dummy jelas**, centang persetujuan, lalu kirim. Setelah pemeriksaan singkat, akun memperoleh status terverifikasi.
2. Tekan **Ulangi Simulasi**.
3. Pilih **KTP dummy buram**, centang persetujuan, lalu kirim. Pengajuan ditolak dengan alasan yang dapat diperbaiki.
4. Tekan **Coba Dokumen Lain** untuk kembali ke formulir.

## Menjalankan prototipe

```powershell
npm install
npm run dev
```

Buka `http://127.0.0.1:4177`.

## Batasan

- Seluruh identitas dan gambar KTP dibuat sebagai data dummy.
- Data hanya berada di memori halaman dan hilang setelah refresh.
- Tidak ada unggahan, OCR, pencocokan Dukcapil, enkripsi dokumen, atau database.
- Implementasi produksi memerlukan kajian hukum, keamanan, retensi, dan penyedia KYC resmi.
