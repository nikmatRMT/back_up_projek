require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Quest = require('./models/Quest');
const QuestConversation = require('./models/QuestConversation');
const ChatMessage = require('./models/ChatMessage');

async function setup() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected.');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        // 1. Buat / Update Akun Klien
        let klien = await User.findOneAndUpdate(
            { email: 'klien@jawarga.test' },
            {
                $set: {
                    nama_lengkap: 'Budi Santoso (Klien)',
                    email: 'klien@jawarga.test',
                    no_whatsapp: '081299881122',
                    password: hashedPassword,
                    role: 'user',
                    kyc_status: 'VERIFIED',
                    saldo: 100000
                }
            },
            { upsert: true, new: true }
        );
        console.log('Akun Klien siap:', klien.email, klien._id);

        // 2. Buat / Update Akun Pekerja
        let pekerja = await User.findOneAndUpdate(
            { email: 'pekerja@jawarga.test' },
            {
                $set: {
                    nama_lengkap: 'Siti Rahma (Pekerja)',
                    email: 'pekerja@jawarga.test',
                    no_whatsapp: '081377665544',
                    password: hashedPassword,
                    role: 'user',
                    kyc_status: 'VERIFIED',
                    saldo: 25000
                }
            },
            { upsert: true, new: true }
        );
        console.log('Akun Pekerja siap:', pekerja.email, pekerja._id);

        // Bersihkan quest lama khusus demo ini jika ada
        await Quest.deleteMany({
            pembuat_id: klien._id,
            deskripsi: { $regex: /Apotek Kimia Farma/i }
        });

        // 3. Buat Quest dalam Status AWAITING_PAYMENT
        const now = new Date();
        const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
        const twentyMinsAgo = new Date(now.getTime() - 20 * 60 * 1000);
        const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000);

        const quest = await Quest.create({
            pembuat_id: klien._id,
            pekerja_id: pekerja._id,
            kategori: 'jastip',
            deskripsi: 'Bantu Belikan Obat Flu & Vitamin C di Apotek Kimia Farma',
            upah_jasa: 15000,
            nominal_talangan: 35000,
            jarak_meter: 80,
            transport_mode: 'motorcycle',
            lokasi: {
                type: 'Point',
                coordinates: [114.8365, -3.4405]
            },
            pekerja_lokasi: {
                longitude: 114.8366,
                latitude: -3.4406
            },
            status: 'AWAITING_PAYMENT',
            negotiation_status: 'AGREED',
            agreed_upah: 20000,
            agreed_duration: '20 Menit',
            payment_required: true,
            payment_status: 'UNPAID',
            payment_method: null,
            payment_reference: null,
            pin_rahasia: '8899',
            chat_status: 'ACTIVE',
            created_at: thirtyMinsAgo,
            taken_at: twentyMinsAgo,
            arrived_at: fiveMinsAgo,
            completion_verified_at: fiveMinsAgo
        });
        console.log('Quest AWAITING_PAYMENT berhasil dibuat:', quest._id);

        // 4. Buat Percakapan (QuestConversation)
        await QuestConversation.deleteMany({ quest_id: quest._id });
        const conversation = await QuestConversation.create({
            quest_id: quest._id,
            client_id: klien._id,
            worker_id: pekerja._id,
            status: 'SELECTED',
            jarak_meter: 80,
            transport_mode: 'motorcycle',
            created_at: twentyMinsAgo,
            last_message_at: fiveMinsAgo
        });

        // 5. Buat Riwayat Chat
        await ChatMessage.deleteMany({ quest_id: quest._id });
        await ChatMessage.insertMany([
            {
                conversation_id: conversation._id,
                quest_id: quest._id,
                sender_id: pekerja._id,
                type: 'OFFER',
                text: 'Saya ajukan upah Rp 20.000 dengan estimasi 20 Menit ya Pak, karena antre apotek.',
                offer: {
                    amount: 20000,
                    duration: '20 Menit',
                    status: 'ACCEPTED'
                },
                read_by: [klien._id, pekerja._id],
                created_at: new Date(twentyMinsAgo.getTime() + 1000)
            },
            {
                conversation_id: conversation._id,
                quest_id: quest._id,
                type: 'SYSTEM',
                text: 'Penawaran disepakati! Quest diberikan kepada Siti Rahma (Pekerja) dengan upah Rp 20.000.',
                read_by: [klien._id, pekerja._id],
                created_at: new Date(twentyMinsAgo.getTime() + 5000)
            },
            {
                conversation_id: conversation._id,
                quest_id: quest._id,
                sender_id: pekerja._id,
                type: 'TEXT',
                text: 'Halo Pak Budi, obat flu dan vitamin sudah dibelikan dan saya sudah sampai di depan pagar rumah Bapak.',
                read_by: [klien._id, pekerja._id],
                created_at: new Date(fiveMinsAgo.getTime() - 60000)
            },
            {
                conversation_id: conversation._id,
                quest_id: quest._id,
                type: 'SYSTEM',
                text: 'PIN 8899 berhasil diverifikasi. Pekerjaan fisik telah diserahkan. Silakan periksa hasil kerja dan lanjutkan ke Pembayaran P2P.',
                read_by: [klien._id, pekerja._id],
                created_at: fiveMinsAgo
            }
        ]);
        console.log('Semua pesan chat berhasil dibuat.');

        console.log('\n========================================');
        console.log('✅ DATA DEMO BERHASIL DISIAPKAN!');
        console.log('========================================');
        console.log('Akun Klien (Pemilik Quest):');
        console.log('  Email    : klien@jawarga.test');
        console.log('  Password : password123');
        console.log('\nAkun Pekerja:');
        console.log('  Email    : pekerja@jawarga.test');
        console.log('  Password : password123');
        console.log('\nQuest ID   : ' + quest._id);
        console.log('Status     : AWAITING_PAYMENT (Siap bayar P2P)');
        console.log('Rincian Biaya:');
        console.log('  - Upah Jasa Kesepakatan : Rp 20.000');
        console.log('  - Uang Talangan Apotek  : Rp 35.000');
        console.log('  - TOTAL BAYAR           : Rp 55.000');
        console.log('========================================\n');

        process.exit(0);
    } catch (err) {
        console.error('Error setup demo:', err);
        process.exit(1);
    }
}

setup();
