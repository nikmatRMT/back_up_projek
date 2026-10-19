require('dotenv').config();
const { requireMaintenanceMode } = require('./maintenanceGuard');
requireMaintenanceMode('trigger_sweeper_now.js');
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI;

const questSchema = new mongoose.Schema({
    deskripsi: String,
    status: String,
    cancel_reason: String,
    created_at: Date
});

const Quest = mongoose.models.Quest || mongoose.model('Quest', questSchema);

async function triggerSweeperNow() {
    try {
        await mongoose.connect(mongoUri);
        const now = Date.now();
        const fourHoursAgo = new Date(now - 4 * 60 * 60 * 1000);

        const res = await Quest.updateMany(
            { status: 'OPEN', created_at: { $lt: fourHoursAgo } },
            { $set: { status: 'CANCELED', cancel_reason: 'TIMEOUT_OPEN' } }
        );

        console.log("=== EXECUTE SWEEPER TRIGGER ===");
        console.log("Jumlah Quest OPEN > 4 Jam yang dibatalkan otomatis:", res.modifiedCount);

        const q = await Quest.findOne({ deskripsi: /TEST 1 MENIT/ });
        if (q) {
            console.log(`\n=== DETAIL STATUS QUEST UJI ===`);
            console.log(`ID Quest: ${q._id}`);
            console.log(`Deskripsi: ${q.deskripsi}`);
            console.log(`Status Terkini: ${q.status}`);
            console.log(`Alasan Batal: ${q.cancel_reason}`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error("Error executing sweeper:", err);
    }
}

triggerSweeperNow();
