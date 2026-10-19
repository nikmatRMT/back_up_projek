# Prototipe In-App Chat + Bidding

Prototipe mandiri untuk menguji komunikasi dan negosiasi antara Klien dan Pekerja tanpa membuka nomor telepon dan tanpa database utama.

## Alur yang diuji

1. Periksa kartu penawaran awal Pekerja sebagai Klien.
2. Terima, tolak, atau ajukan tawaran balik.
3. Ganti perspektif untuk membalas sebagai Klien/Pekerja.
4. Setelah penawaran diterima, quest berubah dari Negosiasi menjadi Dikerjakan.
5. Kirim pesan teks dan periksa tanda pesan dibaca.
6. Klien menyelesaikan transaksi dan chat langsung dikunci.
7. Hitung mundur auto-delete berjalan selama 30 detik.
8. Isi percakapan terhapus, sementara ringkasan transaksi tetap tampil.

## Menjalankan prototipe

```powershell
npm install
npm run dev
```

Buka `http://127.0.0.1:4175`.

## Catatan simulasi

- Seluruh pengguna, quest, dan pesan merupakan data dummy.
- Data disimpan sementara di `localStorage`, bukan database utama.
- Retensi 30 detik digunakan untuk demonstrasi dan mewakili retensi 30 hari di produksi.
- Tombol **Reset** atau **Ulangi Simulasi** mengembalikan percakapan ke kondisi awal.
