require('dotenv').config();

const { requireMaintenanceMode } = require('./maintenanceGuard');
requireMaintenanceMode('reseed_respondent_accounts_22.js');

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Quest = require('./models/Quest');
const User = require('./models/User');

const EXPECTED_DATABASE = 'jasa_lepas_db';
const TEST_PASSWORD = 'warga123';

const PEOPLE = [
    { key: 'rahmat', name: 'Rahmat', email: 'rahmat@jawarga.test', phone: '08254507956' },
    { key: 'botan', name: 'Botan', email: 'botan@jawarga.test', phone: '085251846307' },
    { key: 'mubarak', name: 'Mubarak', email: 'mubarak@jawarga.test', phone: '081349672815' },
    { key: 'pratama', name: 'Pratama', email: 'pratama@jawarga.test', phone: '082153908462' },
    { key: 'adha', name: 'Adha', email: 'adha@jawarga.test', phone: '085754216839' },
    { key: 'lupi', name: 'Lupi', email: 'lupi@jawarga.test', phone: '081256749103' },
    { key: 'endhi', name: 'Endhi', email: 'endhi@jawarga.test', phone: '083152680947' },
];

const LOCATIONS = [
    { lat: -3.451007, lng: 114.838971 },
    { lat: -3.449850, lng: 114.838200 },
    { lat: -3.452100, lng: 114.839650 },
    { lat: -3.450200, lng: 114.840400 },
    { lat: -3.453150, lng: 114.837950 },
    { lat: -3.447900, lng: 114.839300 },
    { lat: -3.448700, lng: 114.836900 },
    { lat: -3.454100, lng: 114.840800 },
    { lat: -3.452800, lng: 114.835900 },
    { lat: -3.446800, lng: 114.841200 },
];

// Botan sengaja memperoleh lima penyelesaian bernilai 5 agar tampil sebagai
// pekerja terbaik, sedangkan peran pembuat dan pekerja tetap diputar.
const QUESTS = [
    { status: 'COMPLETED', creator: 'rahmat', worker: 'botan', category: 'jastip', description: 'Titip beli obat demam dan vitamin di apotek sekitar Taman Gembira', fee: 10000, advance: 42000, ageHours: 264, duration: 70, rating: 5, review: 'Pesanan sesuai dan diantar tepat waktu.' },
    { status: 'COMPLETED', creator: 'endhi', worker: 'botan', category: 'fisik', description: 'Bantu membersihkan halaman dan mengumpulkan daun kering rumah warga', fee: 25000, advance: 0, ageHours: 240, duration: 110, rating: 5, review: 'Halaman menjadi bersih dan rapi.' },
    { status: 'COMPLETED', creator: 'mubarak', worker: 'botan', category: 'perbaikan', description: 'Perbaiki kran air bocor dan ganti karet keran dapur', fee: 30000, advance: 15000, ageHours: 216, duration: 90, rating: 5, review: 'Kran sudah tidak bocor dan dapat digunakan.' },
    { status: 'COMPLETED', creator: 'pratama', worker: 'botan', category: 'jastip', description: 'Titip beli beras, minyak goreng, dan gula untuk kebutuhan rumah', fee: 12000, advance: 78000, ageHours: 192, duration: 65, rating: 5, review: 'Belanjaan lengkap dan nota diserahkan.' },
    { status: 'COMPLETED', creator: 'adha', worker: 'botan', category: 'fisik', description: 'Bantu memindahkan lemari kecil dari ruang tamu ke kamar belakang', fee: 30000, advance: 0, ageHours: 168, duration: 80, rating: 5, review: 'Barang dipindahkan dengan hati-hati.' },
    { status: 'COMPLETED', creator: 'lupi', worker: 'rahmat', category: 'jastip', description: 'Titip isi ulang tabung LPG 3 kg di pangkalan sekitar kelurahan', fee: 8000, advance: 25000, ageHours: 144, duration: 55, rating: 5, review: 'Tabung diterima dalam kondisi baik.' },
    { status: 'COMPLETED', creator: 'botan', worker: 'endhi', category: 'perbaikan', description: 'Ganti lampu teras dan periksa sakelar yang longgar', fee: 25000, advance: 18000, ageHours: 120, duration: 60, rating: 4, review: 'Lampu dan sakelar kembali berfungsi.' },
    { status: 'COMPLETED', creator: 'rahmat', worker: 'mubarak', category: 'fisik', description: 'Bantu membersihkan selokan kecil di depan rumah warga', fee: 28000, advance: 0, ageHours: 96, duration: 105, rating: 4, review: 'Aliran selokan kembali lancar.' },
    { status: 'COMPLETED', creator: 'botan', worker: 'pratama', category: 'jastip', description: 'Titip fotokopi dan jilid dokumen sebanyak 45 halaman', fee: 9000, advance: 22000, ageHours: 72, duration: 50, rating: 4, review: 'Dokumen lengkap dan hasil jilid rapi.' },
    { status: 'COMPLETED', creator: 'mubarak', worker: 'adha', category: 'fisik', description: 'Bantu menyusun kursi untuk kegiatan Posyandu Guntung Paikat', fee: 20000, advance: 0, ageHours: 54, duration: 85, rating: 4, review: 'Pekerjaan selesai sebelum kegiatan dimulai.' },
    { status: 'COMPLETED', creator: 'pratama', worker: 'lupi', category: 'jastip', description: 'Titip beli air mineral dan makanan ringan untuk rapat warga', fee: 10000, advance: 65000, ageHours: 42, duration: 60, rating: 4, review: 'Pesanan diterima lengkap.' },
    { status: 'COMPLETED', creator: 'adha', worker: 'rahmat', category: 'fisik', description: 'Bantu mencuci teras dan membersihkan halaman depan rumah', fee: 25000, advance: 0, ageHours: 30, duration: 100, rating: 4, review: 'Teras dan halaman sudah bersih.' },
    { status: 'COMPLETED', creator: 'lupi', worker: 'mubarak', category: 'perbaikan', description: 'Perbaiki engsel pintu dapur yang longgar', fee: 30000, advance: 12000, ageHours: 22, duration: 75, rating: 5, review: 'Pintu dapat dibuka dan ditutup dengan baik.' },
    { status: 'IN_PROGRESS', creator: 'endhi', worker: 'botan', category: 'jastip', description: 'Titip beli bahan masakan untuk kegiatan warga RT 005', fee: 15000, advance: 85000, ageHours: 3, takenAgo: 130, arrivedAgo: 55 },
    { status: 'IN_PROGRESS', creator: 'rahmat', worker: 'pratama', category: 'fisik', description: 'Bantu merapikan pot tanaman di halaman rumah', fee: 22000, advance: 0, ageHours: 2, takenAgo: 90, arrivedAgo: 35 },
    { status: 'TAKEN', creator: 'botan', worker: 'adha', category: 'fisik', description: 'Bantu mengangkat empat galon air dari teras ke dapur', fee: 12000, advance: 0, ageMinutes: 80, takenAgo: 20 },
    { status: 'OPEN', creator: 'mubarak', category: 'fisik', description: 'Bantu memotong dan merapikan dahan pohon mangga di halaman', fee: 35000, advance: 0, ageMinutes: 35 },
    { status: 'OPEN', creator: 'pratama', category: 'jastip', description: 'Titip beli lima bungkus nasi untuk rapat warga sore ini', fee: 10000, advance: 75000, ageMinutes: 12 },
    { status: 'CANCELED', creator: 'adha', category: 'fisik', description: 'Bantu membersihkan rumput halaman kosong dekat permukiman', fee: 30000, advance: 0, ageHours: 58, cancel: 'TIMEOUT_OPEN' },
    { status: 'CANCELED', creator: 'lupi', worker: 'rahmat', category: 'fisik', description: 'Bantu mengangkut meja lipat ke lokasi kegiatan warga', fee: 25000, advance: 0, ageHours: 36, takenAgo: 2050, cancel: 'WORKER_NO_SHOW' },
    { status: 'CANCELED', creator: 'endhi', category: 'jastip', description: 'Titip beli token listrik prabayar senilai lima puluh ribu rupiah', fee: 7000, advance: 50000, ageHours: 26, cancel: 'USER_CANCELED' },
    { status: 'CANCELED', creator: 'rahmat', worker: 'botan', category: 'perbaikan', description: 'Perbaiki gagang pintu kamar yang terlepas', fee: 25000, advance: 10000, ageHours: 18, takenAgo: 900, cancel: 'WORKER_INCOMPLETE' },
];

function stamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

function ago(now, spec) {
    const minutes = (spec.ageHours || 0) * 60 + (spec.ageMinutes || 0);
    return new Date(now.getTime() - minutes * 60000);
}

function minutesAgo(now, minutes) {
    return minutes == null ? null : new Date(now.getTime() - minutes * 60000);
}

async function main() {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI tidak ditemukan pada .env');
    await mongoose.connect(process.env.MONGODB_URI);
    if (mongoose.connection.name !== EXPECTED_DATABASE) {
        throw new Error(`Dibatalkan: database aktif ${mongoose.connection.name}, bukan ${EXPECTED_DATABASE}`);
    }

    const oldUsers = await User.find({}).lean();
    const oldQuests = await Quest.find({}).lean();
    const backupDir = path.join(__dirname, 'backups');
    const backupFile = path.join(backupDir, `users_and_quests_before_respondent_reseed_${stamp()}.json`);
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(backupFile, JSON.stringify({ users: oldUsers, quests: oldQuests }, null, 2), 'utf8');

    const password = await bcrypt.hash(TEST_PASSWORD, 10);
    const now = new Date();
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            await Quest.deleteMany({}, { session });
            await User.deleteMany({ role: { $ne: 'admin' } }, { session });

            const inserted = await User.insertMany(PEOPLE.map((person, index) => ({
                password,
                nama_lengkap: person.name,
                email: person.email,
                no_whatsapp: person.phone,
                batas_talangan: 100000,
                saldo: 0,
                role: 'user',
                status: 'ACTIVE',
                created_at: new Date(now.getTime() - (30 - index) * 86400000),
                rating_rata_rata: 0,
                total_ulasan: 0,
            })), { session });
            const users = Object.fromEntries(inserted.map((user, index) => [PEOPLE[index].key, user]));

            const documents = QUESTS.map((spec, index) => {
                const createdAt = ago(now, spec);
                const location = LOCATIONS[index % LOCATIONS.length];
                const worker = spec.worker ? users[spec.worker] : null;
                let takenAt = null;
                let arrivedAt = null;
                let completedAt = null;
                if (spec.status === 'COMPLETED') {
                    takenAt = new Date(createdAt.getTime() + 20 * 60000);
                    arrivedAt = new Date(createdAt.getTime() + 35 * 60000);
                    completedAt = new Date(createdAt.getTime() + spec.duration * 60000);
                } else {
                    takenAt = minutesAgo(now, spec.takenAgo);
                    arrivedAt = minutesAgo(now, spec.arrivedAgo);
                }
                return {
                    pembuat_id: users[spec.creator]._id,
                    pekerja_id: worker ? worker._id : null,
                    kategori: spec.category,
                    deskripsi: spec.description,
                    upah_jasa: spec.fee,
                    nominal_talangan: spec.advance,
                    jarak_meter: worker ? 110 + ((index * 97) % 1390) : 0,
                    transport_mode: index % 3 === 0 ? 'motorcycle' : 'walk',
                    lokasi: { type: 'Point', coordinates: [location.lng, location.lat] },
                    pekerja_lokasi: worker
                        ? { longitude: location.lng + 0.00018, latitude: location.lat - 0.00014 }
                        : { longitude: null, latitude: null },
                    status: spec.status,
                    taken_at: takenAt,
                    arrived_at: arrivedAt,
                    pin_rahasia: String(5201 + index),
                    created_at: createdAt,
                    completed_at: completedAt,
                    expired_at: new Date(createdAt.getTime() + 4 * 3600000),
                    rating_pekerja: spec.status === 'COMPLETED' ? spec.rating : null,
                    ulasan_pekerja: spec.status === 'COMPLETED' ? spec.review : null,
                    cancel_reason: spec.status === 'CANCELED' ? spec.cancel : null,
                };
            });
            await Quest.insertMany(documents, { session });

            for (const user of inserted) {
                const completed = documents.filter((quest) =>
                    quest.status === 'COMPLETED' && String(quest.pekerja_id) === String(user._id));
                const totalReviews = completed.length;
                const average = totalReviews
                    ? completed.reduce((sum, quest) => sum + quest.rating_pekerja, 0) / totalReviews
                    : 0;
                const balance = completed.reduce((sum, quest) => sum + quest.upah_jasa, 0);
                await User.updateOne(
                    { _id: user._id },
                    { $set: { rating_rata_rata: Number(average.toFixed(2)), total_ulasan: totalReviews, saldo: balance } },
                    { session }
                );
            }
        });
    } finally {
        await session.endSession();
    }

    const statusCounts = await Quest.aggregate([
        { $group: { _id: '$status', total: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);
    const users = await User.find({ role: 'user' })
        .select('nama_lengkap email rating_rata_rata total_ulasan saldo')
        .sort({ rating_rata_rata: -1, total_ulasan: -1 })
        .lean();
    console.log(`Backup: ${backupFile}`);
    console.log(`Total akun user baru: ${users.length}`);
    console.log(`Total transaksi baru: ${await Quest.countDocuments({})}`);
    console.log(`Status: ${JSON.stringify(statusCounts)}`);
    console.log(`Peringkat pekerja: ${JSON.stringify(users)}`);
    console.log(`Password akun uji: ${TEST_PASSWORD}`);
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(error);
    try { await mongoose.disconnect(); } catch (_) { /* abaikan */ }
    process.exit(1);
});



