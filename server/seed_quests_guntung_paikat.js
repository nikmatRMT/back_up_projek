require('dotenv').config();

const { requireMaintenanceMode } = require('./maintenanceGuard');
requireMaintenanceMode('seed_quests_guntung_paikat.js');

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Quest = require('./models/Quest');
const User = require('./models/User');

const EXPECTED_DATABASE = 'jasa_lepas_db';

// Titik pusat mengacu pada Kelurahan Guntung Paikat, Banjarbaru Selatan.
// Seluruh titik simulasi ditempatkan di sekitar titik pusat dan kawasan
// Jalan Taman Gembira Selatan agar marker tidak tersebar ke luar wilayah studi.
const LOCATIONS = [
    { label: 'Kantor Kelurahan Guntung Paikat', lat: -3.451007, lng: 114.838971 },
    { label: 'Jalan Taman Gembira Selatan RT 005', lat: -3.449850, lng: 114.838200 },
    { label: 'Permukiman Guntung Paikat bagian selatan', lat: -3.452100, lng: 114.839650 },
    { label: 'Sekitar RTH Guntung Paikat', lat: -3.450200, lng: 114.840400 },
    { label: 'Permukiman RT 003 Guntung Paikat', lat: -3.453150, lng: 114.837950 },
    { label: 'Permukiman bagian utara Guntung Paikat', lat: -3.447900, lng: 114.839300 },
    { label: 'Sekitar aliran Sungai Kemuning', lat: -3.448700, lng: 114.836900 },
    { label: 'Permukiman bagian tenggara Guntung Paikat', lat: -3.454100, lng: 114.840800 },
    { label: 'Permukiman bagian barat Guntung Paikat', lat: -3.452800, lng: 114.835900 },
    { label: 'Lingkungan Posyandu Guntung Paikat', lat: -3.446800, lng: 114.841200 },
];

const QUESTS = [
    { status: 'COMPLETED', kategori: 'jastip', deskripsi: 'Titip beli obat demam dan vitamin di apotek sekitar Taman Gembira', upah: 10000, talangan: 42000, ageHours: 240, durationMinutes: 70, rating: 5, ulasan: 'Pesanan sesuai dan diantar tepat waktu.' },
    { status: 'COMPLETED', kategori: 'fisik', deskripsi: 'Bantu bersihkan halaman dan kumpulkan daun kering rumah warga RT 003', upah: 25000, talangan: 0, ageHours: 216, durationMinutes: 120, rating: 5, ulasan: 'Halaman menjadi bersih dan rapi.' },
    { status: 'COMPLETED', kategori: 'perbaikan', deskripsi: 'Perbaiki kran air bocor dan ganti karet keran dapur', upah: 30000, talangan: 15000, ageHours: 192, durationMinutes: 95, rating: 4, ulasan: 'Kran sudah tidak bocor dan dapat digunakan.' },
    { status: 'COMPLETED', kategori: 'jastip', deskripsi: 'Titip beli beras, minyak goreng, dan gula untuk kebutuhan rumah', upah: 12000, talangan: 78000, ageHours: 168, durationMinutes: 65, rating: 5, ulasan: 'Belanjaan lengkap dan nota diserahkan.' },
    { status: 'COMPLETED', kategori: 'fisik', deskripsi: 'Bantu memindahkan lemari kecil dari ruang tamu ke kamar belakang', upah: 30000, talangan: 0, ageHours: 144, durationMinutes: 80, rating: 5, ulasan: 'Barang dipindahkan dengan hati-hati.' },
    { status: 'COMPLETED', kategori: 'jastip', deskripsi: 'Titip isi ulang tabung LPG 3 kg di pangkalan sekitar kelurahan', upah: 8000, talangan: 25000, ageHours: 120, durationMinutes: 55, rating: 5, ulasan: 'Tabung diterima dalam kondisi baik.' },
    { status: 'COMPLETED', kategori: 'perbaikan', deskripsi: 'Ganti lampu teras dan periksa sakelar yang longgar', upah: 25000, talangan: 18000, ageHours: 96, durationMinutes: 60, rating: 4, ulasan: 'Lampu dan sakelar kembali berfungsi.' },
    { status: 'COMPLETED', kategori: 'fisik', deskripsi: 'Bantu membersihkan selokan kecil di depan rumah warga', upah: 28000, talangan: 0, ageHours: 72, durationMinutes: 110, rating: 5, ulasan: 'Aliran selokan kembali lancar.' },
    { status: 'COMPLETED', kategori: 'jastip', deskripsi: 'Titip fotokopi dan jilid dokumen sebanyak 45 halaman', upah: 9000, talangan: 22000, ageHours: 48, durationMinutes: 50, rating: 4, ulasan: 'Dokumen lengkap dan hasil jilid rapi.' },
    { status: 'COMPLETED', kategori: 'fisik', deskripsi: 'Bantu susun kursi untuk kegiatan Posyandu Guntung Paikat', upah: 20000, talangan: 0, ageHours: 30, durationMinutes: 90, rating: 5, ulasan: 'Pekerjaan selesai sebelum kegiatan dimulai.' },

    { status: 'IN_PROGRESS', kategori: 'fisik', deskripsi: 'Bantu mencuci teras dan membersihkan halaman depan rumah', upah: 25000, talangan: 0, ageHours: 4, takenAgoMinutes: 150, arrivedAgoMinutes: 75 },
    { status: 'IN_PROGRESS', kategori: 'perbaikan', deskripsi: 'Perbaiki engsel pintu dapur yang longgar', upah: 30000, talangan: 12000, ageHours: 3, takenAgoMinutes: 120, arrivedAgoMinutes: 55 },
    { status: 'IN_PROGRESS', kategori: 'jastip', deskripsi: 'Titip beli bahan masakan untuk kegiatan warga di RT 005', upah: 15000, talangan: 85000, ageHours: 2, takenAgoMinutes: 80, arrivedAgoMinutes: 30 },

    { status: 'TAKEN', kategori: 'fisik', deskripsi: 'Bantu angkat empat galon air dari teras ke dapur', upah: 12000, talangan: 0, ageMinutes: 90, takenAgoMinutes: 25 },
    { status: 'TAKEN', kategori: 'fisik', deskripsi: 'Bantu cuci sepeda motor dan bersihkan bagian roda', upah: 18000, talangan: 0, ageMinutes: 65, takenAgoMinutes: 15 },

    { status: 'OPEN', kategori: 'fisik', deskripsi: 'Bantu potong dan rapikan dahan pohon mangga di halaman', upah: 35000, talangan: 0, ageMinutes: 40 },
    { status: 'OPEN', kategori: 'jastip', deskripsi: 'Titip beli lima bungkus nasi untuk rapat warga sore ini', upah: 10000, talangan: 75000, ageMinutes: 12 },

    { status: 'CANCELED', cancelReason: 'TIMEOUT_OPEN', kategori: 'fisik', deskripsi: 'Bantu membersihkan rumput halaman kosong dekat permukiman', upah: 30000, talangan: 0, ageHours: 55 },
    { status: 'CANCELED', cancelReason: 'WORKER_NO_SHOW', kategori: 'fisik', deskripsi: 'Bantu mengangkut meja lipat ke lokasi kegiatan warga', upah: 25000, talangan: 0, ageHours: 32, takenAgoMinutes: 1860 },
    { status: 'CANCELED', cancelReason: 'USER_CANCELED', kategori: 'jastip', deskripsi: 'Titip beli token listrik prabayar senilai lima puluh ribu rupiah', upah: 7000, talangan: 50000, ageHours: 20 },
];

function dateAgo(now, spec) {
    const milliseconds = ((spec.ageHours || 0) * 60 + (spec.ageMinutes || 0)) * 60 * 1000;
    return new Date(now.getTime() - milliseconds);
}

function minutesAgo(now, minutes) {
    return minutes == null ? null : new Date(now.getTime() - minutes * 60 * 1000);
}

function makeBackupFilename() {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(__dirname, 'backups', `quests_before_reseed_${stamp}.json`);
}

async function main() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI tidak ditemukan pada .env');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    if (mongoose.connection.name !== EXPECTED_DATABASE) {
        throw new Error(`Dibatalkan: database aktif adalah ${mongoose.connection.name}, bukan ${EXPECTED_DATABASE}`);
    }

    const users = await User.find({ role: 'user' }).sort({ created_at: 1 }).lean();
    if (users.length < 5) {
        throw new Error(`Dibatalkan: diperlukan minimal 5 akun user, ditemukan ${users.length}`);
    }

    const oldQuests = await Quest.find({}).lean();
    const backupFile = makeBackupFilename();
    fs.mkdirSync(path.dirname(backupFile), { recursive: true });
    fs.writeFileSync(backupFile, JSON.stringify(oldQuests, null, 2), 'utf8');

    const now = new Date();
    const documents = QUESTS.map((spec, index) => {
        const creator = users[index % users.length];
        let worker = users[(index + 2) % users.length];
        if (String(worker._id) === String(creator._id)) {
            worker = users[(index + 1) % users.length];
        }

        const location = LOCATIONS[index % LOCATIONS.length];
        const createdAt = dateAgo(now, spec);
        const needsWorker = ['TAKEN', 'IN_PROGRESS', 'COMPLETED'].includes(spec.status)
            || spec.cancelReason === 'WORKER_NO_SHOW';

        let takenAt = null;
        let arrivedAt = null;
        let completedAt = null;
        if (spec.status === 'COMPLETED') {
            takenAt = new Date(createdAt.getTime() + 20 * 60 * 1000);
            arrivedAt = new Date(createdAt.getTime() + 35 * 60 * 1000);
            completedAt = new Date(createdAt.getTime() + spec.durationMinutes * 60 * 1000);
        } else {
            takenAt = minutesAgo(now, spec.takenAgoMinutes);
            arrivedAt = minutesAgo(now, spec.arrivedAgoMinutes);
        }

        return {
            pembuat_id: creator._id,
            pekerja_id: needsWorker ? worker._id : null,
            kategori: spec.kategori,
            deskripsi: spec.deskripsi,
            upah_jasa: spec.upah,
            nominal_talangan: spec.talangan,
            jarak_meter: needsWorker ? 120 + (index * 83) % 1380 : 0,
            transport_mode: index % 3 === 0 ? 'motorcycle' : 'walk',
            lokasi: { type: 'Point', coordinates: [location.lng, location.lat] },
            pekerja_lokasi: needsWorker
                ? { longitude: location.lng + 0.00018, latitude: location.lat - 0.00014 }
                : { longitude: null, latitude: null },
            status: spec.status,
            taken_at: takenAt,
            arrived_at: arrivedAt,
            pin_rahasia: String(4101 + index).padStart(4, '0'),
            created_at: createdAt,
            completed_at: completedAt,
            expired_at: new Date(createdAt.getTime() + 4 * 60 * 60 * 1000),
            rating_pekerja: spec.status === 'COMPLETED' ? spec.rating : null,
            ulasan_pekerja: spec.status === 'COMPLETED' ? spec.ulasan : null,
            cancel_reason: spec.status === 'CANCELED' ? spec.cancelReason : null,
        };
    });

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            await Quest.deleteMany({}, { session });
            await Quest.insertMany(documents, { session });
        });
    } finally {
        await session.endSession();
    }

    const counts = await Quest.aggregate([
        { $group: { _id: '$status', total: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);
    const total = await Quest.countDocuments({});
    const minLng = Math.min(...LOCATIONS.map((item) => item.lng));
    const maxLng = Math.max(...LOCATIONS.map((item) => item.lng));
    const minLat = Math.min(...LOCATIONS.map((item) => item.lat));
    const maxLat = Math.max(...LOCATIONS.map((item) => item.lat));

    console.log(`Backup: ${backupFile}`);
    console.log(`Database: ${mongoose.connection.name}`);
    console.log(`Total quests baru: ${total}`);
    console.log(`Status: ${JSON.stringify(counts)}`);
    console.log(`Rentang koordinat: lat ${minLat} s.d. ${maxLat}; lng ${minLng} s.d. ${maxLng}`);
    await mongoose.disconnect();
}

main()
    .then(() => process.exit(0))
    .catch(async (error) => {
        console.error(error.message);
        try {
            await mongoose.disconnect();
        } catch (_) {
            // Abaikan error penutupan koneksi setelah kegagalan utama.
        }
        process.exit(1);
    });
