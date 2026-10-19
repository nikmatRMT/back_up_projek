# Prototipe Routing Haversine + OSRM

Prototipe mandiri untuk menguji alur pencarian quest terdekat tanpa database utama.

## Alur yang diuji

1. Lokasi dummy Guntung Paikat atau GPS perangkat digunakan sebagai titik awal.
2. Haversine menyaring quest yang berada di dalam radius.
3. OSRM Table Service menghitung jarak dan durasi rute jalan kandidat.
4. Pengguna mengetuk marker quest untuk memilih tujuan.
5. OSRM Route Service menampilkan geometri rute berwarna biru di OpenStreetMap.
6. ETA dapat disimulasikan untuk motor atau jalan kaki.

## Menjalankan prototipe

```powershell
npm install
npm run dev
```

Buka `http://127.0.0.1:4174`.

## Batasan

- Seluruh quest adalah data dummy di memori.
- Endpoint demo publik OSRM hanya digunakan untuk pengujian.
- ETA tidak memperhitungkan kemacetan waktu nyata.
- ETA motor memakai profil driving OSRM.
- ETA jalan kaki dihitung dari jarak rute dengan asumsi kecepatan 4,5 km/jam.
- Jalur yang ditampilkan adalah rekomendasi rute tercepat dari profil driving OSRM.
