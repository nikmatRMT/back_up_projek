require('dotenv').config();
const { requireMaintenanceMode } = require('./maintenanceGuard');
requireMaintenanceMode('create_test_quest.js');
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI;

const userSchema = new mongoose.Schema({ nama_lengkap: String, email: String, role: String });
const questSchema = new mongoose.Schema({
    pembuat_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pekerja_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    kategori: String,
    deskripsi: String,
    upah_jasa: Number,
    nominal_talangan: Number,
    status: String,
    lokasi: { type: { type: String, default: 'Point' }, coordinates: [Number] },
    pin_rahasia: String,
    created_at: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Quest = mongoose.models.Quest || mongoose.model('Quest', questSchema);

async function createTestQuest() {
    try {
        await mongoose.connect(mongoUri);
        const mubaruk = await User.findOne({ email: 'mubaruk@email.com' });
        
        const q = await Quest.create({
            pembuat_id: mubaruk._id,
            kategori: 'jastip',
            deskripsi: '[TEST NO-SHOW 1 MENIT] Titip beli martabak manis di Jalan Pangeran Suriansyah',
            upah_jasa: 12000,
            nominal_talangan: 30000,
            status: 'OPEN',
            lokasi: { type: 'Point', coordinates: [114.8382, -3.4428] },
            pin_rahasia: '9900',
            created_at: new Date()
        });

        console.log("=== TEST QUEST UNTUK TAKE DIBUAT ===");
        console.log("ID Quest:", q._id);
        console.log("Pembuat:", mubaruk.nama_lengkap, `(${mubaruk.email}) [Role: ${mubaruk.role}]`);
        console.log("Deskripsi:", q.deskripsi);
        console.log("Status Saat Ini:", q.status);
        console.log("====================================");

        await mongoose.disconnect();
    } catch (err) {
        console.error("Error creating test quest:", err);
    }
}

createTestQuest();
