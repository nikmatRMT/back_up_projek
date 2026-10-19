require('dotenv').config();
const { requireMaintenanceMode } = require('./maintenanceGuard');
requireMaintenanceMode('update_two_quests.js');
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI;

const questSchema = new mongoose.Schema({
    deskripsi: String,
    status: String,
    cancel_reason: String,
    completed_at: Date
});

const Quest = mongoose.models.Quest || mongoose.model('Quest', questSchema);

async function updateTwoQuests() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(mongoUri);

        // 1. Ubah 'Bantu cuci motor matic' menjadi COMPLETED
        const res1 = await Quest.updateOne(
            { deskripsi: /Bantu cuci motor matic/ },
            { $set: { status: 'COMPLETED', completed_at: new Date() } }
        );
        console.log("1. Bantu cuci motor matic -> COMPLETED (Modified:", res1.modifiedCount, ")");

        // 2. Ubah 'Bantu pasang tenda acara posyandu' menjadi CANCELED
        const res2 = await Quest.updateOne(
            { deskripsi: /Bantu pasang tenda/ },
            { $set: { status: 'CANCELED', cancel_reason: 'ADMIN_FORCE_CANCEL' } }
        );
        console.log("2. Bantu pasang tenda -> CANCELED (Modified:", res2.modifiedCount, ")");

        await mongoose.disconnect();
        console.log("SUCCESS!");
    } catch (err) {
        console.error("Error updating 2 quests:", err);
    }
}

updateTwoQuests();
