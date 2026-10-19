const mongoose = require('mongoose');
require('dotenv').config();

const Quest = require('./models/Quest');
const User = require('./models/User');

const DESCRIPTION = '[UJI PIN DEKAT] Bantu pindahkan satu kursi di teras';

async function main() {
    if (process.env.CONFIRM_CREATE_NEARBY_PIN_QUEST !== 'YES') {
        throw new Error('Dibatalkan: konfirmasi pembuatan quest uji belum diberikan.');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    if (mongoose.connection.name !== 'jasa_lepas_db') throw new Error('Database target tidak sesuai.');

    const existing = await Quest.findOne({ deskripsi: DESCRIPTION, status: { $in: ['OPEN', 'TAKEN', 'IN_PROGRESS'] } }).lean();
    if (existing) {
        console.log(JSON.stringify({ success: true, reused: true, quest: existing }, null, 2));
        return;
    }

    const client = await User.findOne({ nama_lengkap: 'Lupi' });
    if (!client) throw new Error('Akun dummy Klien Lupi tidak ditemukan.');

    const quest = await Quest.create({
        pembuat_id: client._id,
        pekerja_id: null,
        kategori: 'fisik',
        deskripsi: DESCRIPTION,
        upah_jasa: 10000,
        nominal_talangan: 0,
        lokasi: { type: 'Point', coordinates: [114.833449, -3.446931] },
        status: 'OPEN',
        negotiation_status: 'NOT_STARTED',
        agreed_upah: null,
        agreed_duration: null,
        payment_required: true,
        payment_status: 'UNPAID',
        chat_status: 'ACTIVE',
        pin_rahasia: '2468',
        created_at: new Date(),
        expired_at: new Date(Date.now() + 4 * 60 * 60 * 1000)
    });

    console.log(JSON.stringify({
        success: true,
        reused: false,
        quest: {
            id: quest._id,
            deskripsi: quest.deskripsi,
            status: quest.status,
            client: client.nama_lengkap,
            coordinates: quest.lokasi.coordinates,
            pin: quest.pin_rahasia,
            upah_jasa: quest.upah_jasa
        }
    }, null, 2));
}

main().catch((error) => {
    console.error(JSON.stringify({ success: false, message: error.message }));
    process.exitCode = 1;
}).finally(() => mongoose.disconnect());
