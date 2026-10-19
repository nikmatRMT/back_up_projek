# Prototipe Payment Gateway Sandbox

Prototipe mandiri untuk menguji alur pembayaran quest tanpa uang, rekening, API, atau kredensial asli.

## Skenario pengujian manual

1. Sebagai Klien, pilih QRIS, Virtual Account, atau E-Wallet sandbox.
2. Lanjutkan pembayaran dan pilih **Simulasikan Berhasil**.
3. Periksa kuitansi, lalu beralih ke Pekerja untuk melihat status yang sama.
4. Tekan **Reset** dan ulangi dengan hasil **Tertunda**.
5. Buka kembali simulasi pembayaran, kemudian pilih **Simulasikan Gagal**.
6. Pastikan Klien dapat mencoba kembali dan Pekerja hanya melihat status pembayaran.

## Menjalankan prototipe

```powershell
npm install
npm run dev
```

Buka `http://127.0.0.1:4178`.

## Batasan

- Tidak terhubung ke payment gateway nyata.
- Tidak memproses uang, kartu, rekening, PIN, OTP, webhook, refund, atau pencairan.
- Seluruh kode pembayaran dan nomor referensi merupakan data dummy.
- Implementasi produksi memerlukan akun merchant, backend aman, validasi webhook, rekonsiliasi, serta kebijakan refund dan penyelesaian sengketa.
