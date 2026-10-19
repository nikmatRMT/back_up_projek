const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Quest = require('./models/Quest');
const User = require('./models/User');
const AppLog = require('./models/AppLog');
const ChatMessage = require('./models/ChatMessage');

const EXPECTED_DATABASE = 'jasa_lepas_db';
const BACKUP_MANIFEST = path.resolve(__dirname, '..', 'backups', 'mongodb-2026-08-24T01-52-07-719Z', 'manifest.json');

const LOCATIONS = [
    { lat: -3.451007, lng: 114.838971 },
    { lat: -3.449850, lng: 114.838200 },
    { lat: -3.452100, lng: 114.839650 },
    { lat: -3.450200, lng: 114.840400 },
    { lat: -3.453150, lng: 114.837950 }
];

const QUEST_SAMPLES = [
    { kategori: 'perbaikan', deskripsi: 'Perbaiki engsel pintu dapur yang longgar', upah: 30000, talangan: 0 },
    { kategori: 'fisik', deskripsi: 'Bantu rapikan dahan pohon mangga di halaman', upah: 35000, talangan: 0 },
    { kategori: 'jastip', deskripsi: 'Titip beli lima bungkus nasi untuk rapat warga', upah: 10000, talangan: 75000 },
    { kategori: 'fisik', deskripsi: 'Bantu angkat empat galon air dari teras ke dapur', upah: 12000, talangan: 0 },
    { kategori: 'perbaikan', deskripsi: 'Periksa kran dapur yang bocor dan ganti karetnya', upah: 28000, talangan: 15000 }
];

function validateBackup() {
    if (!fs.existsSync(BACKUP_MANIFEST)) throw new Error(`Backup wajib tidak ditemukan: ${BACKUP_MANIFEST}`);
    const manifest = JSON.parse(fs.readFileSync(BACKUP_MANIFEST, 'utf8'));
    const questBackup = manifest.collections?.find((item) => item.name === 'quests');
    const userBackup = manifest.collections?.find((item) => item.name === 'users');
    if (!questBackup?.documents || !userBackup?.documents) throw new Error('Manifest backup tidak memuat quest dan pengguna.');
    return manifest;
}

async function main() {
    if (process.env.CONFIRM_RESET_REVISION_DATA !== 'YES') {
        throw new Error('Dibatalkan: set CONFIRM_RESET_REVISION_DATA=YES untuk menjalankan reset yang telah disetujui.');
    }
    const manifest = validateBackup();
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI tidak ditemukan.');

    await mongoose.connect(process.env.MONGODB_URI);
    if (mongoose.connection.name !== EXPECTED_DATABASE) {
        throw new Error(`Dibatalkan: database aktif ${mongoose.connection.name}, bukan ${EXPECTED_DATABASE}.`);
    }

    const users = await User.find({ role: 'user' }).sort({ created_at: 1 }).select('_id').lean();
    if (users.length < QUEST_SAMPLES.length + 1) {
        throw new Error(`Diperlukan minimal ${QUEST_SAMPLES.length + 1} akun user; ditemukan ${users.length}.`);
    }

    const before = {
        quests: await Quest.countDocuments({}),
        messages: await ChatMessage.countDocuments({}),
        users: await User.countDocuments({}),
        logs: await AppLog.countDocuments({})
    };
    const now = new Date();
    const documents = QUEST_SAMPLES.map((sample, index) => ({
        pembuat_id: users[index]._id,
        pekerja_id: null,
        kategori: sample.kategori,
        deskripsi: sample.deskripsi,
        upah_jasa: sample.upah,
        nominal_talangan: sample.talangan,
        jarak_meter: 0,
        transport_mode: 'walk',
        lokasi: { type: 'Point', coordinates: [LOCATIONS[index].lng, LOCATIONS[index].lat] },
        status: 'OPEN',
        negotiation_status: 'NOT_STARTED',
        agreed_upah: null,
        agreed_duration: null,
        payment_required: true,
        payment_status: 'UNPAID',
        chat_status: 'ACTIVE',
        pin_rahasia: String(5201 + index),
        created_at: new Date(now.getTime() - index * 3 * 60 * 1000),
        expired_at: new Date(now.getTime() + 4 * 60 * 60 * 1000)
    }));

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            await ChatMessage.deleteMany({}, { session });
            await Quest.deleteMany({}, { session });
            await Quest.insertMany(documents, { session });
        });
    } finally {
        await session.endSession();
    }

    const after = {
        quests: await Quest.countDocuments({}),
        messages: await ChatMessage.countDocuments({}),
        users: await User.countDocuments({}),
        logs: await AppLog.countDocuments({})
    };
    if (before.users !== after.users || before.logs !== after.logs) {
        throw new Error('Verifikasi gagal: jumlah pengguna atau log berubah.');
    }

    const flowCounts = await Quest.aggregate([
        { $group: { _id: { status: '$status', negotiation: '$negotiation_status', payment: '$payment_status' }, total: { $sum: 1 } } }
    ]);
    console.log(JSON.stringify({
        success: true,
        database: mongoose.connection.name,
        backupCreatedAt: manifest.createdAt,
        before,
        after,
        flowCounts
    }, null, 2));
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(JSON.stringify({ success: false, message: error.message }));
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
});
