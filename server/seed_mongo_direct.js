require('dotenv').config();
const { requireMaintenanceMode } = require('./maintenanceGuard');
requireMaintenanceMode('seed_mongo_direct.js');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mongoUri = process.env.MONGODB_URI;

const userSchema = new mongoose.Schema({
    nama_lengkap: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    no_whatsapp: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status_akun: { type: String, enum: ['aktif', 'ditangguhkan'], default: 'aktif' },
    saldo: { type: Number, default: 0 },
    batas_talangan: { type: Number, default: 100000 },
    rating_rata_rata: { type: Number, default: 5.0 },
    total_ulasan: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});

const questSchema = new mongoose.Schema({
    pembuat_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pekerja_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    kategori: { type: String, enum: ['jastip', 'fisik'], required: true },
    deskripsi: { type: String, required: true },
    upah_jasa: { type: Number, required: true },
    nominal_talangan: { type: Number, default: 0 },
    status: { type: String, enum: ['OPEN', 'TAKEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'], default: 'OPEN' },
    lokasi: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }
    },
    pin_rahasia: { type: String, required: true },
    rating: { type: Number, default: 0 },
    ulasan: { type: String, default: '' },
    expired_at: { type: Date },
    completed_at: { type: Date },
    created_at: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Quest = mongoose.models.Quest || mongoose.model('Quest', questSchema);

const USERS_DATA = [
    // 1 Admin Account
    {
        nama_lengkap: "Administrator",
        email: "admin@gmail.com",
        no_whatsapp: "081200000000",
        password: "123456",
        role: "admin",
        saldo: 0,
        batas_talangan: 0,
        rating_rata_rata: 5.0,
        total_ulasan: 0
    },
    // 5 Citizen / Worker Accounts
    {
        nama_lengkap: "Endy Kurnian",
        email: "endy.kurnian@email.com",
        no_whatsapp: "081250011223",
        password: "password123",
        role: "user",
        saldo: 120000,
        batas_talangan: 100000,
        rating_rata_rata: 4.9,
        total_ulasan: 5
    },
    {
        nama_lengkap: "Mubaruk",
        email: "mubaruk@email.com",
        no_whatsapp: "081350022334",
        password: "password123",
        role: "user",
        saldo: 185000,
        batas_talangan: 100000,
        rating_rata_rata: 4.9,
        total_ulasan: 8
    },
    {
        nama_lengkap: "M. Maulana",
        email: "m.maulana@email.com",
        no_whatsapp: "081450033445",
        password: "password123",
        role: "user",
        saldo: 45000,
        batas_talangan: 100000,
        rating_rata_rata: 4.7,
        total_ulasan: 3
    },
    {
        nama_lengkap: "Herry",
        email: "herry@email.com",
        no_whatsapp: "081550044556",
        password: "password123",
        role: "user",
        saldo: 140000,
        batas_talangan: 100000,
        rating_rata_rata: 4.8,
        total_ulasan: 5
    },
    {
        nama_lengkap: "Adha",
        email: "adha@email.com",
        no_whatsapp: "081650055667",
        password: "password123",
        role: "user",
        saldo: 65000,
        batas_talangan: 100000,
        rating_rata_rata: 5.0,
        total_ulasan: 2
    }
];

const LOCATIONS = [
    {"nama": "Jl. Guntung Paikat No. 12, RT 03", "lat": -3.4435, "lng": 114.8345},
    {"nama": "Jl. Kemuning Gang 2, RT 01", "lat": -3.4442, "lng": 114.8360},
    {"nama": "Jl. Pangeran Suriansyah No. 45", "lat": -3.4428, "lng": 114.8382},
    {"nama": "Jl. Rosehan AB No. 88, RT 04", "lat": -3.4455, "lng": 114.8330},
    {"nama": "Jl. Sumber Adi Gang Dahlia", "lat": -3.4468, "lng": 114.8375},
    {"nama": "Jl. Guntung Paikat Ujung dekat Masjid", "lat": -3.4480, "lng": 114.8405},
    {"nama": "Jl. H. Mistar Cokrokusumo KM 34", "lat": -3.4415, "lng": 114.8325},
    {"nama": "Jl. Kemuning dekat Toko Kelontong Pak RT", "lat": -3.4448, "lng": 114.8390},
];

const QUEST_SPECS = [
    {"kategori": "jastip", "deskripsi": "Titip beli air galon isi ulang 2 buah di depot Kemuning", "upah": 5000, "talangan": 15000, "status": "COMPLETED", "rating": 5, "ulasan": "Sangat cepat dan ramah!"},
    {"kategori": "jastip", "deskripsi": "Beli obat flu & vitamin di Apotek K-24 Suriansyah", "upah": 10000, "talangan": 35000, "status": "COMPLETED", "rating": 5, "ulasan": "Pekerja teliti beli obat sesuai resep."},
    {"kategori": "jastip", "deskripsi": "Titip beli bahan dapur (bawang, minyak, beras) di Pasar Bauntung", "upah": 15000, "talangan": 50000, "status": "COMPLETED", "rating": 4, "ulasan": "Bagus, belanjaan lengkap."},
    {"kategori": "jastip", "deskripsi": "Titip bayar tagihan listrik & air PDAM di loket PPOB terdekat", "upah": 8000, "talangan": 45000, "status": "COMPLETED", "rating": 5, "ulasan": "Struk pembayaran langsung diserahkan."},
    {"kategori": "jastip", "deskripsi": "Beli sate ayam 2 porsi & es teh manis di Jalan Rosehan", "upah": 7000, "talangan": 30000, "status": "COMPLETED", "rating": 5, "ulasan": "Masih hangat satenya, mantap."},
    {"kategori": "jastip", "deskripsi": "Titip fotokopi dokumen & jilid sprial 50 lembar", "upah": 6000, "talangan": 20000, "status": "COMPLETED", "rating": 4, "ulasan": "Rapi jilidnya."},
    {"kategori": "jastip", "deskripsi": "Beli paket sembako murah minyak goreng & gula", "upah": 12000, "talangan": 60000, "status": "COMPLETED", "rating": 5, "ulasan": "Sesuai pesanan."},
    {"kategori": "jastip", "deskripsi": "Titip isi ulang gas LPG 3 kg di pangkalan resmi RT 02", "upah": 7000, "talangan": 22000, "status": "COMPLETED", "rating": 5, "ulasan": "Tabung gas diantar sampai dapur."},
    {"kategori": "jastip", "deskripsi": "Beli nasi kuning khas Banjar 3 bungkus lauk telur", "upah": 6000, "talangan": 36000, "status": "COMPLETED", "rating": 5, "ulasan": "Tepat waktu sarapannya."},
    {"kategori": "jastip", "deskripsi": "Titip ambil surat paket kilat di kantor pos", "upah": 10000, "talangan": 0, "status": "COMPLETED", "rating": 5, "ulasan": "Paket aman diterima."},
    {"kategori": "fisik", "deskripsi": "Bantu bersihkan rumput & rapikan halaman rumah RT 03", "upah": 25000, "talangan": 0, "status": "COMPLETED", "rating": 5, "ulasan": "Kerja sangat bersih dan cepat!"},
    {"kategori": "fisik", "deskripsi": "Bantu angkat lemari kayu besar ke lantai 2 rumah", "upah": 30000, "talangan": 0, "status": "COMPLETED", "rating": 5, "ulasan": "Kuat dan hati-hati mengangkat lemari."},
    {"kategori": "fisik", "deskripsi": "Perbaiki kran air bocor & saluran cuci piring", "upah": 20000, "talangan": 15000, "status": "COMPLETED", "rating": 4, "ulasan": "Kran tidak bocor lagi."},
    {"kategori": "fisik", "deskripsi": "Bantu pasang tenda acara posyandu warga Guntung Paikat", "upah": 35000, "talangan": 0, "status": "IN_PROGRESS", "rating": 0, "ulasan": ""},
    {"kategori": "fisik", "deskripsi": "Bantu cuci motor matic & bersihkan mesin/velg", "upah": 15000, "talangan": 0, "status": "IN_PROGRESS", "rating": 0, "ulasan": ""},
    {"kategori": "fisik", "deskripsi": "Bantu angkat galon air 4 buah dari lantai dasar ke dapur", "upah": 10000, "talangan": 0, "status": "TAKEN", "rating": 0, "ulasan": ""},
    {"kategori": "jastip", "deskripsi": "Beli pulsa listrik token Rp 50.000", "upah": 5000, "talangan": 50000, "status": "CANCELED", "rating": 0, "ulasan": ""},
    {"kategori": "fisik", "deskripsi": "Bantu bersihkan selokan depan rumah RT 02", "upah": 20000, "talangan": 0, "status": "CANCELED", "rating": 0, "ulasan": ""},
    {"kategori": "fisik", "deskripsi": "Bantu cat pagar rumah kayu warna hijau panjang 5 meter", "upah": 40000, "talangan": 15000, "status": "OPEN", "rating": 0, "ulasan": ""},
    {"kategori": "fisik", "deskripsi": "Bantu potong & rapikan dahan pohon mangga depan rumah", "upah": 25000, "talangan": 0, "status": "OPEN", "rating": 0, "ulasan": ""}
];

async function seed() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(mongoUri);
        console.log("Connected successfully!");

        await User.deleteMany({});
        await Quest.deleteMany({});
        console.log("Cleared existing Users and Quests collections.");

        const createdUsers = {};
        for (const udata of USERS_DATA) {
            const hashedPassword = await bcrypt.hash(udata.password, 10);
            const user = await User.create({
                ...udata,
                password: hashedPassword
            });
            createdUsers[udata.email] = user;
            console.log(`Created User: ${user.nama_lengkap} (${user.email}) [Role: ${user.role}] -> ID: ${user._id}`);
        }

        const clientUsers = [createdUsers["m.maulana@email.com"], createdUsers["adha@email.com"], createdUsers["endy.kurnian@email.com"]];
        const workerUsers = [createdUsers["mubaruk@email.com"], createdUsers["herry@email.com"]];

        for (let i = 0; i < QUEST_SPECS.length; i++) {
            const spec = QUEST_SPECS[i];
            const loc = LOCATIONS[i % LOCATIONS.length];
            const client = clientUsers[i % clientUsers.length];
            const worker = workerUsers[i % workerUsers.length];

            const pin_rahasia = Math.floor(1000 + Math.random() * 9000).toString();
            const createdAt = new Date(Date.now() - (20 - i) * 3600 * 1000);

            const questData = {
                pembuat_id: client._id,
                pekerja_id: spec.status !== 'OPEN' ? worker._id : null,
                kategori: spec.kategori,
                deskripsi: spec.deskripsi,
                upah_jasa: spec.upah,
                nominal_talangan: spec.talangan,
                status: spec.status,
                lokasi: {
                    type: 'Point',
                    coordinates: [loc.lng, loc.lat]
                },
                pin_rahasia,
                rating: spec.rating,
                ulasan: spec.ulasan,
                expired_at: new Date(createdAt.getTime() + 4 * 3600 * 1000),
                completed_at: spec.status === 'COMPLETED' ? new Date(createdAt.getTime() + 1 * 3600 * 1000) : null,
                created_at: createdAt
            };

            const quest = await Quest.create(questData);
            console.log(`[${i+1}/20] Created Quest: '${spec.deskripsi.slice(0, 35)}...' [Status: ${spec.status}] -> ID: ${quest._id}`);
        }

        console.log("\nSUCCESSFULLY SEEDED 1 ADMIN + 5 CITIZENS & 20 QUESTS INTO MONGODB ATLAS!");
        await mongoose.disconnect();
    } catch (e) {
        console.error("Seeding Error:", e);
    }
}

seed();
