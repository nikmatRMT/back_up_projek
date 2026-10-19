require('dotenv').config();

const { requireMaintenanceMode } = require('./maintenanceGuard');
requireMaintenanceMode('cancel_quest_by_description.js');

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Quest = require('./models/Quest');

const TARGET = 'Bantu merapikan pot tanaman di halaman rumah';

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    if (mongoose.connection.name !== 'jasa_lepas_db') {
        throw new Error(`Database tidak sesuai: ${mongoose.connection.name}`);
    }

    const quest = await Quest.findOne({ deskripsi: TARGET, status: 'IN_PROGRESS' }).lean();
    if (!quest) throw new Error('Transaksi IN_PROGRESS yang dimaksud tidak ditemukan.');

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(__dirname, 'backups', `quest_before_manual_cancel_${stamp}.json`);
    fs.mkdirSync(path.dirname(backupFile), { recursive: true });
    fs.writeFileSync(backupFile, JSON.stringify(quest, null, 2), 'utf8');

    const result = await Quest.updateOne(
        { _id: quest._id, status: 'IN_PROGRESS' },
        { $set: { status: 'CANCELED', cancel_reason: 'USER_CANCELED' } }
    );
    const updated = await Quest.findById(quest._id).select('deskripsi status cancel_reason').lean();
    console.log(`Backup: ${backupFile}`);
    console.log(`Matched: ${result.matchedCount}; modified: ${result.modifiedCount}`);
    console.log(JSON.stringify(updated));
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(error.message);
    try { await mongoose.disconnect(); } catch (_) { /* abaikan */ }
    process.exit(1);
});
