const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { requireMaintenanceMode } = require('./maintenanceGuard');
requireMaintenanceMode('seed.js');
const User = require('./models/User');
const Quest = require('./models/Quest');

const MONGODB_URI = process.env.MONGODB_URI;

async function seedDatabase() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Terhubung ke MongoDB...');

        // Hapus data lama agar tidak duplikat saat dijalankan berkali-kali
        await User.deleteMany({});
        await Quest.deleteMany({});
        console.log('Membersihkan koleksi lama...');

        const hashedPassword = await bcrypt.hash('password123', 10);

        // 1. Membuat data Klien (Peminta Jasa)
        const klien = await User.create({
            _id: new mongoose.Types.ObjectId('60b5c1c8a1b2c3d4e5f60001'),
            google_id: 'g_1234567890',
            nama_lengkap: 'Budi Santoso (Klien)',
            email: 'budi.santoso@email.com',
            no_whatsapp: '6281234567890',
            password: hashedPassword,
            batas_talangan: 50000
        });

        // 2. Membuat data Pekerja (Pencari Jasa)
        const pekerja = await User.create({
            _id: new mongoose.Types.ObjectId('60b5c1c8a1b2c3d4e5f60002'),
            google_id: 'g_0987654321',
            nama_lengkap: 'Siti Aminah (Pekerja)',
            email: 'siti.aminah@email.com',
            no_whatsapp: '6289876543210',
            password: hashedPassword
        });

        // 3. Membuat data Admin 1: Rahmat
        const adminRahmat = await User.create({
            _id: new mongoose.Types.ObjectId('60b5c1c8a1b2c3d4e5f60003'),
            nama_lengkap: 'rahmat',
            email: 'rahmat@email.com',
            no_whatsapp: '6281250066701',
            password: hashedPassword,
            role: 'admin'
        });

        // 4. Membuat data Admin 2: Rey
        const adminRey = await User.create({
            _id: new mongoose.Types.ObjectId('60b5c1c8a1b2c3d4e5f60004'),
            nama_lengkap: 'rey',
            email: 'rey@email.com',
            no_whatsapp: '6281250066702',
            password: hashedPassword,
            role: 'admin'
        });
        
        console.log('✅ Dua Akun Admin (rahmat & rey) berhasil dibuat!');

        // Koordinat Guntung Paikat (Estimasi contoh: Banjarbaru)
        // Koordinat Klien
        const lonKlien = 114.836;
        const latKlien = -3.440;

        // 3. Membuat data Tugas (Status OPEN)
        await Quest.create({
            pembuat_id: klien._id,
            kategori: 'jastip',
            deskripsi: 'Tolong belikan nasi goreng di depan gang, pedas sedang.',
            upah_jasa: 5000,
            nominal_talangan: 15000,
            lokasi: {
                type: 'Point',
                coordinates: [lonKlien, latKlien] // [longitude, latitude]
            },
            status: 'OPEN',
            pin_rahasia: '1234',
            jarak_meter: 450, // 450 meter
            expired_at: new Date(Date.now() + 60 * 60 * 1000) // Kedaluwarsa 1 jam lagi
        });

        // 4. Membuat data Tugas (Status TAKEN oleh Siti)
        await Quest.create({
            pembuat_id: klien._id,
            pekerja_id: pekerja._id,
            kategori: 'fisik',
            deskripsi: 'Bantu angkat galon air ke lantai 2 indekos.',
            upah_jasa: 3000,
            nominal_talangan: 0,
            lokasi: {
                type: 'Point',
                coordinates: [114.837, -3.441]
            },
            status: 'TAKEN',
            pin_rahasia: '9876',
            jarak_meter: 320 // 320 meter
        });

        console.log('✅ Data Quest berhasil dibuat beserta Index Geospatial 2dsphere!');
        console.log('🏁 Seeding selesai! Silakan buka MongoDB Compass Anda sekarang.');
        
        mongoose.connection.close();
    } catch (error) {
        console.error('Error saat seeding database:', error);
        mongoose.connection.close();
    }
}

seedDatabase();
