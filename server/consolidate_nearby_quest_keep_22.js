require('dotenv').config();

const { requireMaintenanceMode } = require('./maintenanceGuard');
requireMaintenanceMode('consolidate_nearby_quest_keep_22.js');

const mongoose = require('mongoose');
const Quest = require('./models/Quest');
const User = require('./models/User');

const OLD_DESCRIPTION = 'Bantu memotong dan merapikan dahan pohon mangga di halaman';
const NEW_DESCRIPTION = 'Bantu mengantarkan paket kecil ke rumah tetangga dekat lokasi';

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    if (mongoose.connection.name !== 'jasa_lepas_db') throw new Error('Database tidak sesuai.');

    const oldQuest = await Quest.findOne({ deskripsi: OLD_DESCRIPTION });
    const nearbyQuest = await Quest.findOne({ deskripsi: NEW_DESCRIPTION });
    const botan = await User.findOne({ nama_lengkap: 'Botan', role: 'user' });
    if (!oldQuest || !nearbyQuest || !botan) throw new Error('Data konsolidasi tidak lengkap.');

    oldQuest.pembuat_id = botan._id;
    oldQuest.pekerja_id = null;
    oldQuest.kategori = 'fisik';
    oldQuest.deskripsi = NEW_DESCRIPTION;
    oldQuest.upah_jasa = 15000;
    oldQuest.nominal_talangan = 0;
    oldQuest.jarak_meter = 0;
    oldQuest.transport_mode = 'walk';
    oldQuest.lokasi = nearbyQuest.lokasi;
    oldQuest.pekerja_lokasi = { longitude: null, latitude: null };
    oldQuest.status = 'OPEN';
    oldQuest.taken_at = null;
    oldQuest.arrived_at = null;
    oldQuest.completed_at = null;
    oldQuest.cancel_reason = null;
    oldQuest.rating_pekerja = null;
    oldQuest.ulasan_pekerja = null;
    oldQuest.pin_rahasia = '7314';
    oldQuest.created_at = new Date();
    oldQuest.expired_at = new Date(Date.now() + 4 * 60 * 60 * 1000);

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            await oldQuest.save({ session });
            await Quest.deleteOne({ _id: nearbyQuest._id }, { session });
        });
    } finally {
        await session.endSession();
    }

    const finalQuest = await Quest.findById(oldQuest._id).select('deskripsi status lokasi pin_rahasia').lean();
    const counts = await Quest.aggregate([
        { $group: { _id: '$status', total: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);
    console.log(`Total transaksi: ${await Quest.countDocuments({})}`);
    console.log(`Status: ${JSON.stringify(counts)}`);
    console.log(`Tugas dekat: ${JSON.stringify(finalQuest)}`);
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(error.message);
    try { await mongoose.disconnect(); } catch (_) { /* abaikan */ }
    process.exit(1);
});
