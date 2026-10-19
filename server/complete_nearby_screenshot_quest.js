require('dotenv').config();

const { requireMaintenanceMode } = require('./maintenanceGuard');
requireMaintenanceMode('complete_nearby_screenshot_quest.js');

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Quest = require('./models/Quest');
const User = require('./models/User');

const DESCRIPTION = 'Bantu mengantarkan paket kecil ke rumah tetangga dekat lokasi';

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    if (mongoose.connection.name !== 'jasa_lepas_db') throw new Error('Database tidak sesuai.');

    const rahmat = await User.findOne({ nama_lengkap: 'Rahmat', role: 'user' });
    const quest = await Quest.findOne({ deskripsi: DESCRIPTION });
    if (!rahmat || !quest) throw new Error('Akun Rahmat atau tugas screenshot tidak ditemukan.');
    if (quest.status === 'COMPLETED') {
        console.log('Tugas sudah berstatus COMPLETED; tidak ada perubahan.');
        await mongoose.disconnect();
        return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(__dirname, 'backups', `before_complete_screenshot_quest_${stamp}.json`);
    fs.mkdirSync(path.dirname(backupFile), { recursive: true });
    fs.writeFileSync(backupFile, JSON.stringify({ quest: quest.toObject(), user: rahmat.toObject() }, null, 2), 'utf8');

    const now = new Date();
    const takenAt = new Date(now.getTime() - 12 * 60 * 1000);
    const arrivedAt = new Date(now.getTime() - 6 * 60 * 1000);
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            await Quest.updateOne(
                { _id: quest._id },
                { $set: {
                    pekerja_id: rahmat._id,
                    pekerja_lokasi: {
                        longitude: quest.lokasi.coordinates[0],
                        latitude: quest.lokasi.coordinates[1],
                    },
                    jarak_meter: 0,
                    status: 'COMPLETED',
                    taken_at: takenAt,
                    arrived_at: arrivedAt,
                    completed_at: now,
                    rating_pekerja: 5,
                    ulasan_pekerja: 'Tugas diselesaikan dengan baik dan tepat waktu.',
                    cancel_reason: null,
                } },
                { session }
            );

            const completed = await Quest.find({ pekerja_id: rahmat._id, status: 'COMPLETED' })
                .select('upah_jasa rating_pekerja')
                .session(session)
                .lean();
            const rated = completed.filter((item) => Number.isFinite(item.rating_pekerja));
            const average = rated.length
                ? rated.reduce((sum, item) => sum + item.rating_pekerja, 0) / rated.length
                : 0;
            const balance = completed.reduce((sum, item) => sum + item.upah_jasa, 0);
            await User.updateOne(
                { _id: rahmat._id },
                { $set: {
                    saldo: balance,
                    rating_rata_rata: Number(average.toFixed(2)),
                    total_ulasan: rated.length,
                } },
                { session }
            );
        });
    } finally {
        await session.endSession();
    }

    const updatedQuest = await Quest.findById(quest._id)
        .populate('pembuat_id', 'nama_lengkap')
        .populate('pekerja_id', 'nama_lengkap')
        .select('deskripsi status pembuat_id pekerja_id completed_at rating_pekerja')
        .lean();
    const updatedRahmat = await User.findById(rahmat._id)
        .select('nama_lengkap saldo rating_rata_rata total_ulasan')
        .lean();
    const counts = await Quest.aggregate([
        { $group: { _id: '$status', total: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);
    console.log(`Backup: ${backupFile}`);
    console.log(`Tugas: ${JSON.stringify(updatedQuest)}`);
    console.log(`Rahmat: ${JSON.stringify(updatedRahmat)}`);
    console.log(`Total transaksi: ${await Quest.countDocuments({})}`);
    console.log(`Status: ${JSON.stringify(counts)}`);
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(error.message);
    try { await mongoose.disconnect(); } catch (_) { /* abaikan */ }
    process.exit(1);
});
