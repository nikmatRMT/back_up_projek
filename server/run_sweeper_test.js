require('dotenv').config();
const { requireMaintenanceMode } = require('./maintenanceGuard');
requireMaintenanceMode('run_sweeper_test.js');
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI;

const questSchema = new mongoose.Schema({
    deskripsi: String,
    status: String,
    cancel_reason: String,
    created_at: Date
});

const Quest = mongoose.models.Quest || mongoose.model('Quest', questSchema);

async function runSweeperTest() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(mongoUri);
        console.log("Connected successfully!\n");

        // 1. Simulasikan 1 quest OPEN berumur 5 jam yang lalu (lebih tua dari batas 4 jam)
        const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
        await Quest.updateOne(
            { status: 'OPEN' },
            { $set: { created_at: fiveHoursAgo } }
        );
        console.log(`[Simulasi]: 1 Quest OPEN diubah waktu pembuatannya menjadi 5 jam lalu (${fiveHoursAgo.toISOString()}).`);

        // 2. Check OPEN Quests before sweeper
        const openBefore = await Quest.find({ status: 'OPEN' });
        console.log(`\n=== STATUS SEBELUM SWEEPER ===`);
        console.log(`Jumlah Quest status OPEN: ${openBefore.length}`);
        openBefore.forEach(q => {
            console.log(` - [ID: ${q._id}] '${q.deskripsi.slice(0, 40)}...' | Created: ${q.created_at.toISOString()}`);
        });

        // 3. Execute Sweeper logic (> 4 jam)
        const now = Date.now();
        const fourHoursAgo = new Date(now - 4 * 60 * 60 * 1000);

        console.log("\n>>> MENJALANKAN SWEEPER JOB (Membatalkan OPEN > 4 Jam)... <<<");
        const canceledOpen = await Quest.updateMany(
            { status: 'OPEN', created_at: { $lt: fourHoursAgo } },
            { $set: { status: 'CANCELED', cancel_reason: 'TIMEOUT_OPEN' } }
        );

        console.log(`[Hasil Sweeper]: Berhasil merubah ${canceledOpen.modifiedCount} quest OPEN yang > 4 jam menjadi CANCELED!\n`);

        // 4. Check OPEN Quests after sweeper
        const openAfter = await Quest.find({ status: 'OPEN' });
        const canceledAfter = await Quest.find({ cancel_reason: 'TIMEOUT_OPEN' });

        console.log(`=== STATUS SETELAH SWEEPER ===`);
        console.log(`Sisa Quest status OPEN: ${openAfter.length}`);
        console.log(`Total Quest yang Dibatalkan Otomatis (TIMEOUT_OPEN): ${canceledAfter.length}`);
        canceledAfter.forEach(q => {
            console.log(` - [ID: ${q._id}] Status: ${q.status} | Reason: ${q.cancel_reason} | '${q.deskripsi.slice(0, 40)}...'`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error("Error in Sweeper Test:", err);
    }
}

runSweeperTest();
