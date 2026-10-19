# Penjelasan Detail Implementasi Algoritma Haversine

Dokumen ini menjelaskan baris demi baris cara kerja dua fungsi perhitungan jarak Haversine di aplikasi Anda: fungsi backend (`getHaversineDistance`) dan fungsi frontend (`getDistance`).

---

## 1. Analisis Baris-demi-Baris Kode Backend (`getHaversineDistance`)

Fungsi ini dipanggil di backend untuk memverifikasi jarak antara pekerja dan titik tugas.

```javascript
function getHaversineDistance(coords1, coords2) {
    // 1. Ekstraksi Koordinat (Format GeoJSON: [Longitude, Latitude])
    const lon1 = coords1[0];
    const lat1 = coords1[1];
    const lon2 = coords2[0];
    const lat2 = coords2[1];

    // 2. Konstanta Jari-jari Bumi
    const R = 6371e3; // 6.371.000 meter

    // 3. Konversi Koordinat dari Derajat (Degrees) ke Radian (Radians)
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    // 4. Perhitungan Rumus Inti Haversine
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    // 5. Perhitungan Jarak Sudut (Angular Distance)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // 6. Hasil Akhir Jarak Nyata
    return R * c; 
}
```

### Penjelasan Setiap Bagian:

1. **Ekstraksi Koordinat (`lon` & `lat`):**
   * Di backend, data lokasi disimpan dengan standar **GeoJSON** dari MongoDB, yaitu format `[longitude, latitude]`. Oleh karena itu, indeks `[0]` adalah Bujur (Longitude) dan indeks `[1]` adalah Lintang (Latitude).

2. **Jari-Jari Bumi (`R`):**
   * Nilai `6371e3` adalah bentuk penulisan eksponen (ilmiah) dari `6.371 * 10^3` km, yang sama dengan **6.371.000 meter**. Ini adalah jari-jari rata-rata planet Bumi.

3. **Konversi ke Radian (`phi1`, `phi2`, `deltaPhi`, `deltaLambda`):**
   * Fungsi trigonometri bawaan JavaScript (`Math.sin` dan `Math.cos`) memerlukan input dalam satuan **Radian**, bukan Derajat (°).
   * Rumus konversinya adalah: Radian = Derajat * (pi / 180)
   * `phi1` & `phi2` adalah Lintang dari kedua lokasi dalam radian.
   * `deltaPhi` (selisih Lintang) dalam radian.
   * `deltaLambda` (selisih Bujur) dalam radian.

4. **Variabel `a` (Haversine Formula):**
   * Rumus matematika aslinya: a = sin²(deltaPhi/2) + cos(phi1) * cos(phi2) * sin²(deltaLambda/2)
   * Baris kode ini menghitung kuadrat setengah tali busur antara dua titik koordinat pada permukaan bola.

5. **Variabel `c` (Jarak Sudut):**
   * Rumus matematika aslinya: c = 2 * atan2(√a, √(1-a))
   * Bagian ini menghitung sudut pusat (dalam radian) antara kedua titik tersebut di permukaan bumi.

6. **Pengembalian Nilai (`R * c`):**
   * Dengan mengalikan Jarak Sudut (`c`) dengan Jari-jari Bumi (`R`), kita mendapatkan panjang busur lingkaran besar bumi, yang merupakan **jarak nyata di permukaan bumi dalam satuan meter**.

---

## 2. Simulasi Perhitungan Koordinat Nyata (Manual & Trace Code)

Untuk mempermudah penulisan skripsi atau pengujian, berikut adalah simulasi perhitungan dengan angka koordinat nyata di Jakarta:

*   **Titik 1 (Lokasi Tugas - Monas, Jakarta):** 
    *   Latitude (Lintang 1) = `-6.175392`
    *   Longitude (Bujur 1) = `106.827153`
*   **Titik 2 (Posisi Pekerja - Stasiun Gambir, Jakarta):** 
    *   Latitude (Lintang 2) = `-6.176770`
    *   Longitude (Bujur 2) = `106.830637`

### Langkah 1: Konversi Derajat ke Radian
*   phi1 = -6.175392 * (Math.PI / 180) = -0.1077809
*   phi2 = -6.176770 * (Math.PI / 180) = -0.1078050
*   deltaPhi = (-6.176770 - (-6.175392)) * (Math.PI / 180) = -0.0000241
*   deltaLambda = (106.830637 - 106.827153) * (Math.PI / 180) = 0.0000608

### Langkah 2: Menghitung Variabel `a`
*   a = sin²(deltaPhi/2) + cos(phi1) * cos(phi2) * sin²(deltaLambda/2)
*   a = sin²(-0.00001205) + cos(-0.1077809) * cos(-0.1078050) * sin²(0.0000304)
*   a = (1.452 * 10^-10) + 0.99419 * 0.99418 * (9.241 * 10^-10)
*   a ≈ 1.05829 * 10^-9

### Langkah 3: Menghitung Jarak Sudut `c`
*   c = 2 * atan2(√a, √(1 - a))
*   √a = √a = 0.00003253
*   √(1 - a) ≈ 1
*   c = 2 * atan2(0.00003253, 1) = 0.00006506 radian

### Langkah 4: Menghitung Jarak Nyata dalam Meter (`R * c`)
*   Jarak = 6.371.000 * 0.00006506 ≈ 414.51 meter

> **Hasil:** Jarak antara Monas (Titik Tugas) dan Stasiun Gambir (Posisi Pekerja) adalah **414.51 meter**.
> 
> *Aplikasi Geofencing:* Jika toleransi jarak penyelesaian tugas diset maksimal **100 meter**, maka sistem backend akan **menolak** aksi penyelesaian tugas oleh pekerja karena jarak pekerja (414.51 meter) melebihi batas toleransi.

---

## 3. Perbandingan dengan Kode Frontend (`getDistance`)

Di frontend ([BuatTugas.jsx](file:///d:/kuliah/PROJEK%20SKRIPSI/proyek%20aplikasi%20skripsi/client/src/pages/BuatTugas.jsx#L91-L110)), kodenya secara matematis **sama persis**, tetapi memiliki **satu perbedaan kritis** pada ekstraksi koordinat di bagian awal:

```javascript
    // Perbedaan ekstraksi koordinat di frontend
    const lat1 = coords1[0];
    const lon1 = coords1[1];
    const lat2 = coords2[0];
    const lon2 = coords2[1];
```

### Mengapa Berbeda?
* **Standard Koordinat Leaflet/Google Maps (Frontend):** 
  Peta interaktif di browser menggunakan format koordinat standar GPS/geografis yaitu `[latitude, longitude]`.
* **Standard GeoJSON MongoDB (Backend):**
  Database MongoDB menyimpan koordinat spasial menggunakan standar sistem GIS yaitu bujur terlebih dahulu sebelum lintang `[longitude, latitude]`.

### Kesimpulan Perbedaan:
| Sisi | File | Format Input | Penentuan Indeks |
| :--- | :--- | :--- | :--- |
| **Backend** | `questController.js` | GeoJSON `[Long, Lat]` | `coords[0]` = Longitude<br>`coords[1]` = Latitude |
| **Frontend** | `BuatTugas.jsx` | Leaflet `[Lat, Long]` | `coords[0]` = Latitude<br>`coords[1]` = Longitude |

Dengan membedakan pemetaan indeks ini, kedua rumus Haversine dapat menghitung jarak dengan hasil yang sama persis dan akurat di kedua sisi aplikasi.
