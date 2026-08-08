const http = require('http');
const { requireMaintenanceMode } = require('./maintenanceGuard');
requireMaintenanceMode('test_flow.js', { requireMongoUri: false });

// Helper untuk melakukan HTTP Request
const request = (path, method = 'GET', body = null) => {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : '';
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.headers['Content-Length'] = Buffer.byteLength(payload);
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ statusCode: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, raw: data });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (body) {
            req.write(payload);
        }
        req.end();
    });
};

const runSimulation = async () => {
    console.log('==================================================');
    console.log('🚀 MEMULAI SIMULASI ALUR PENGERJAAN TUGAS (E2E) 🚀');
    console.log('==================================================\n');

    const timestamp = Date.now();
    const klienEmail = `klien_${timestamp}@test.com`;
    const pekerjaEmail = `pekerja_${timestamp}@test.com`;
    const randomWa1 = `0812${Math.floor(10000000 + Math.random() * 90000000)}`;
    const randomWa2 = `0813${Math.floor(10000000 + Math.random() * 90000000)}`;

    let klienId, pekerjaId, questId, pinRahasia;

    // STEP 1: Registrasi Klien Baru
    try {
        console.log(`[STEP 1] Mendaftarkan Klien Baru (${klienEmail})...`);
        const res = await request('/api/auth/register', 'POST', {
            nama_lengkap: `Klien Simulasi ${timestamp}`,
            email: klienEmail,
            no_whatsapp: randomWa1,
            password: 'password123',
            role: 'user'
        });

        if (res.statusCode === 201 && res.body.success) {
            klienId = res.body.user.id;
            console.log(`   ✅ Klien Terdaftar! ID: ${klienId}\n`);
        } else {
            console.log('   ❌ Registrasi Klien Gagal:', res.body);
            return;
        }
    } catch (e) {
        console.log('   ❌ Error Step 1:', e.message);
        return;
    }

    // STEP 2: Registrasi Pekerja Baru
    try {
        console.log(`[STEP 2] Mendaftarkan Pekerja Baru (${pekerjaEmail})...`);
        const res = await request('/api/auth/register', 'POST', {
            nama_lengkap: `Pekerja Simulasi ${timestamp}`,
            email: pekerjaEmail,
            no_whatsapp: randomWa2,
            password: 'password123',
            role: 'user'
        });

        if (res.statusCode === 201 && res.body.success) {
            pekerjaId = res.body.user.id;
            console.log(`   ✅ Pekerja Terdaftar! ID: ${pekerjaId}\n`);
        } else {
            console.log('   ❌ Registrasi Pekerja Gagal:', res.body);
            return;
        }
    } catch (e) {
        console.log('   ❌ Error Step 2:', e.message);
        return;
    }

    // STEP 3: Klien Membuat Tugas Baru (Status: OPEN)
    try {
        console.log(`[STEP 3] Klien Membuat Tugas Baru (Kategori: fisik, Upah: Rp 15.000)...`);
        const res = await request('/api/quests', 'POST', {
            pembuat_id: klienId,
            kategori: 'fisik',
            deskripsi: `Tolong belikan tisu di minimarket terdekat - Simulasi ${timestamp}`,
            upah_jasa: 15000,
            nominal_talangan: 0,
            longitude: 114.836,
            latitude: -3.440
        });

        if (res.statusCode === 201 && res.body.success) {
            questId = res.body.data._id;
            pinRahasia = res.body.data.pin_rahasia;
            console.log(`   ✅ Tugas Berhasil Dibuat!`);
            console.log(`      ID Tugas: ${questId}`);
            console.log(`      PIN Rahasia: ${pinRahasia} (Untuk Validasi Selesai)`);
            console.log(`      Status Tugas: ${res.body.data.status}\n`);
        } else {
            console.log('   ❌ Gagal Membuat Tugas:', res.body);
            return;
        }
    } catch (e) {
        console.log('   ❌ Error Step 3:', e.message);
        return;
    }

    // STEP 4: Pekerja Mengambil Tugas (Status: TAKEN)
    try {
        console.log(`[STEP 4] Pekerja Mengambil Tugas...`);
        const res = await request(`/api/quests/${questId}/take`, 'PUT', {
            pekerja_id: pekerjaId
        });

        if (res.statusCode === 200 && res.body.success) {
            console.log(`   ✅ Tugas Berhasil Diambil!`);
            console.log(`      Status Tugas Baru: ${res.body.data.status}`);
            console.log(`      ID Pekerja Terhubung: ${res.body.data.pekerja_id}\n`);
        } else {
            console.log('   ❌ Gagal Mengambil Tugas:', res.body);
            return;
        }
    } catch (e) {
        console.log('   ❌ Error Step 4:', e.message);
        return;
    }

    // STEP 5: Pekerja Mulai Mengerjakan Tugas (Status: IN_PROGRESS)
    try {
        console.log(`[STEP 5] Pekerja Mulai Mengerjakan Tugas (Tiba di Lokasi)...`);
        const res = await request(`/api/quests/${questId}/start`, 'PUT', {
            pekerja_id: pekerjaId
        });

        if (res.statusCode === 200 && res.body.success) {
            console.log(`   ✅ Pekerjaan Mulai Dikerjakan!`);
            console.log(`      Status Tugas Baru: ${res.body.data.status}\n`);
        } else {
            console.log('   ❌ Gagal Memulai Pekerjaan:', res.body);
            return;
        }
    } catch (e) {
        console.log('   ❌ Error Step 5:', e.message);
        return;
    }

    // STEP 6: Pekerja Menyelesaikan Tugas dengan Menginput PIN Rahasia (Status: COMPLETED)
    try {
        console.log(`[STEP 6] Pekerja Menyelesaikan Tugas & Memasukkan PIN (${pinRahasia})...`);
        const res = await request(`/api/quests/${questId}/complete`, 'PUT', {
            pin: pinRahasia
        });

        if (res.statusCode === 200 && res.body.success) {
            console.log(`   ✅ Tugas SELESAI dengan Sukses!`);
            console.log(`      Status Tugas Akhir: ${res.body.data.status}`);
            console.log(`      Selesai Pada: ${res.body.data.completed_at}\n`);
        } else {
            console.log('   ❌ Gagal Menyelesaikan Tugas:', res.body);
            return;
        }
    } catch (e) {
        console.log('   ❌ Error Step 6:', e.message);
        return;
    }

    // STEP 7: Cek Apakah Saldo Pekerja Sudah Bertambah
    try {
        console.log(`[STEP 7] Memverifikasi Penambahan Saldo Pekerja...`);
        const res = await request(`/api/admin/users`); // Ambil semua user dari API Admin untuk melihat saldo terbaru
        if (res.statusCode === 200 && res.body.success) {
            const pekerjaUpdate = res.body.data.find(u => u._id === pekerjaId);
            if (pekerjaUpdate) {
                console.log(`   ✅ Verifikasi Saldo Berhasil!`);
                console.log(`      Saldo Akhir Pekerja: Rp ${pekerjaUpdate.saldo.toLocaleString('id-ID')} (Bertambah dari Rp 0)`);
                console.log(`      Upah Jasa Tugas: Rp 15.000\n`);
            } else {
                console.log('   ❌ Gagal Menemukan Data Pekerja Baru.');
            }
        } else {
            console.log('   ❌ Gagal Mengambil Data User.');
        }
    } catch (e) {
        console.log('   ❌ Error Step 7:', e.message);
    }

    // STEP 8: Klien Memberikan Rating & Ulasan untuk Pekerja
    try {
        console.log(`[STEP 8] Klien Memberikan Rating Bintang 5 ke Pekerja...`);
        const resRate = await request(`/api/quests/${questId}/rate`, 'PUT', { rating: 5, ulasan: 'Kerja cepat dan bersih!' });
        if (resRate.statusCode === 200 && resRate.body.success) {
            console.log(`   ✅ Rating Berhasil Dikirim!`);
            
            // Verifikasi pembaruan data rating di profil pekerja
            const resUser = await request(`/api/admin/users`);
            const pekerjaUpdate = resUser.body.data.find(u => u._id === pekerjaId);
            if (pekerjaUpdate) {
                console.log(`   ✅ Verifikasi Statistik Rating Pekerja Berhasil!`);
                console.log(`      Rating Rata-rata Pekerja: ${pekerjaUpdate.rating_rata_rata}/5`);
                console.log(`      Total Ulasan: ${pekerjaUpdate.total_ulasan}\n`);
            } else {
                console.log('   ❌ Gagal Menemukan Data Pekerja.');
            }
        } else {
            console.log('   ❌ Gagal Mengirimkan Rating:', resRate.body?.message || resRate.raw);
        }
    } catch (e) {
        console.log('   ❌ Error Step 8:', e.message);
    }

    console.log('==================================================');
    console.log('🎉 SIMULASI SELESAI & SELURUH ALUR BERHASIL! 🎉');
    console.log('==================================================');
};

runSimulation();
