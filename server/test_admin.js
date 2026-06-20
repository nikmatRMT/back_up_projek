const http = require('http');

const request = (path, method = 'GET') => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

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

        req.on('error', reject);
        req.end();
    });
};

const runAdminTests = async () => {
    console.log('=== MEMULAI PENGUJIAN API ADMIN ===\n');
    let passed = 0;
    let failed = 0;

    // Test 1: GET /api/admin/dashboard
    try {
        const res = await request('/api/admin/dashboard');
        if (res.statusCode === 200 && res.body.success) {
            console.log('✅ [TEST 1] GET /api/admin/dashboard - BERHASIL');
            console.log(`   Total Users: ${res.body.data.totalUsers}`);
            console.log(`   Active Quests: ${res.body.data.activeQuests}`);
            console.log(`   Completed Today: ${res.body.data.completedToday}`);
            console.log(`   Fictitious/Canceled Orders: ${res.body.data.fictitiousOrders}`);
            passed++;
        } else {
            console.log('❌ [TEST 1] GET /api/admin/dashboard - GAGAL', res);
            failed++;
        }
    } catch (err) {
        console.log('❌ [TEST 1] GET /api/admin/dashboard - ERROR:', err.message);
        failed++;
    }
    console.log('--------------------------------------------------');

    // Test 2: GET /api/admin/users
    try {
        const res = await request('/api/admin/users');
        if (res.statusCode === 200 && res.body.success) {
            console.log('✅ [TEST 2] GET /api/admin/users - BERHASIL');
            console.log(`   Jumlah Pengguna Terdaftar: ${res.body.data.length}`);
            if (res.body.data.length > 0) {
                console.log(`   Sampel Pengguna 1: ${res.body.data[0].nama_lengkap} (${res.body.data[0].email})`);
            }
            passed++;
        } else {
            console.log('❌ [TEST 2] GET /api/admin/users - GAGAL', res);
            failed++;
        }
    } catch (err) {
        console.log('❌ [TEST 2] GET /api/admin/users - ERROR:', err.message);
        failed++;
    }
    console.log('--------------------------------------------------');

    // Test 3: GET /api/admin/quests
    try {
        const res = await request('/api/admin/quests');
        if (res.statusCode === 200 && res.body.success) {
            console.log('✅ [TEST 3] GET /api/admin/quests - BERHASIL');
            console.log(`   Jumlah Tugas Terdaftar: ${res.body.data.length}`);
            if (res.body.data.length > 0) {
                console.log(`   Sampel Tugas 1: ${res.body.data[0].deskripsi} [${res.body.data[0].status}]`);
            }
            passed++;
        } else {
            console.log('❌ [TEST 3] GET /api/admin/quests - GAGAL', res);
            failed++;
        }
    } catch (err) {
        console.log('❌ [TEST 3] GET /api/admin/quests - ERROR:', err.message);
        failed++;
    }
    console.log('--------------------------------------------------');

    // Test 4: GET /api/admin/reports/data
    try {
        const res = await request('/api/admin/reports/data');
        if (res.statusCode === 200 && res.body.success) {
            console.log('✅ [TEST 4] GET /api/admin/reports/data - BERHASIL');
            const summary = res.body.data.summary;
            console.log(`   Summary Uang Berputar: Rp ${summary.totalPerputaranUang?.toLocaleString('id-ID')}`);
            console.log(`   Tugas Selesai: ${summary.completedQuests}`);
            console.log(`   Tugas Dibatalkan: ${summary.canceledQuests}`);
            console.log(`   Pengguna Aktif: ${summary.activeUsers} / Diblokir: ${summary.suspendedUsers}`);
            passed++;
        } else {
            console.log('❌ [TEST 4] GET /api/admin/reports/data - GAGAL', res);
            failed++;
        }
    } catch (err) {
        console.log('❌ [TEST 4] GET /api/admin/reports/data - ERROR:', err.message);
        failed++;
    }
    console.log('==================================================');
    console.log(`Hasil Pengujian: ${passed} Lulus, ${failed} Gagal.\n`);
};

runAdminTests();
