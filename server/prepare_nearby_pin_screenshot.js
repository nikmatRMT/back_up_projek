require('dotenv').config();

const { requireMaintenanceMode } = require('./maintenanceGuard');
requireMaintenanceMode('prepare_nearby_pin_screenshot.js');

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Quest = require('./models/Quest');
const User = require('./models/User');

const PHONES = {
    Rahmat: '08254507956',
    Botan: '085251846307',
    Mubarak: '081349672815',
    Pratama: '082153908462',
    Adha: '085754216839',
    Lupi: '081256749103',
    Endhi: '083152680947',
};

const TARGET_DESCRIPTION = 'Bantu memotong dan merapikan dahan pohon mangga di halaman';
const NEW_DESCRIPTION = 'Bantu mengantarkan paket kecil ke rumah tetangga dekat lokasi';
const SCREENSHOT_PIN = '7314';

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    if (mongoose.connection.name !== 'jasa_lepas_db') {
        throw new Error(`Database tidak sesuai: ${mongoose.connection.name}`);
    }

    const rahmat = await User.findOne({ nama_lengkap: 'Rahmat', role: 'user' });
    const botan = await User.findOne({ nama_lengkap: 'Botan', role: 'user' });
    const target = await Quest.findOne({ deskripsi: TARGET_DESCRIPTION });
    if (!rahmat || !botan || !target) throw new Error('Akun Rahmat/Botan atau tugas dahan tidak ditemukan.');

    const workerLoc = target.pekerja_lokasi || {};
    const hasActualWorkerLoc = Number.isFinite(workerLoc.latitude) && Number.isFinite(workerLoc.longitude);
    const latitude = hasActualWorkerLoc ? workerLoc.latitude : -3.440000;
    const longitude = hasActualWorkerLoc ? workerLoc.longitude : 114.836000;

    const existingScreenshotQuest = await Quest.findOne({ deskripsi: NEW_DESCRIPTION });
    const currentUsers = await User.find({ role: 'user' }).lean();
    const backup = {
        target: target.toObject(),
        existingScreenshotQuest: existingScreenshotQuest?.toObject() || null,
        users: currentUsers,
    };
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(__dirname, 'backups', `before_nearby_pin_screenshot_${stamp}.json`);
    fs.mkdirSync(path.dirname(backupFile), { recursive: true });
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf8');

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            await Quest.updateOne(
                { _id: target._id },
                { $set: { status: 'CANCELED', cancel_reason: 'USER_CANCELED' } },
                { session }
            );

            for (const [name, phone] of Object.entries(PHONES)) {
                await User.updateOne(
                    { nama_lengkap: name, role: 'user' },
                    { $set: { no_whatsapp: phone } },
                    { session }
                );
            }

            await Quest.deleteMany({ deskripsi: NEW_DESCRIPTION }, { session });
            await Quest.create([{
                pembuat_id: botan._id,
                pekerja_id: null,
                kategori: 'fisik',
                deskripsi: NEW_DESCRIPTION,
                upah_jasa: 15000,
                nominal_talangan: 0,
                jarak_meter: 0,
                transport_mode: 'walk',
                lokasi: { type: 'Point', coordinates: [longitude, latitude] },
                pekerja_lokasi: { longitude: null, latitude: null },
                status: 'OPEN',
                pin_rahasia: SCREENSHOT_PIN,
                created_at: new Date(),
                expired_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
            }], { session });
        });
    } finally {
        await session.endSession();
    }

    const updatedTarget = await Quest.findById(target._id).select('deskripsi status cancel_reason').lean();
    const newQuest = await Quest.findOne({ deskripsi: NEW_DESCRIPTION }).select('deskripsi status lokasi pin_rahasia pembuat_id').lean();
    const updatedUsers = await User.find({ role: 'user' }).select('nama_lengkap no_whatsapp').sort({ nama_lengkap: 1 }).lean();
    console.log(`Backup: ${backupFile}`);
    console.log(`Titik memakai lokasi pekerja aktual: ${hasActualWorkerLoc}`);
    console.log(`Koordinat tugas baru: ${latitude}, ${longitude}`);
    console.log(`Tugas dihentikan: ${JSON.stringify(updatedTarget)}`);
    console.log(`Tugas baru: ${JSON.stringify(newQuest)}`);
    console.log(`Nomor pengguna: ${JSON.stringify(updatedUsers)}`);
    console.log(`PIN screenshot: ${SCREENSHOT_PIN}`);
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(error.message);
    try { await mongoose.disconnect(); } catch (_) { /* abaikan */ }
    process.exit(1);
});


