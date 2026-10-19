require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function resetLegacyKyc() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Cari user yang statusnya VERIFIED tapi tidak punya foto KTP atau tidak punya NIK
        const legacyUsers = await User.find({
            kyc_status: 'VERIFIED',
            $or: [
                { kyc_document_image: null },
                { kyc_document_image: { $exists: false } },
                { kyc_document_image: '' },
                { kyc_nik: null },
                { kyc_nik: { $exists: false } },
                { kyc_nik: '' }
            ]
        });

        console.log(`Ditemukan ${legacyUsers.length} akun lama berstatus VERIFIED tanpa data KTP lengkap:`);
        legacyUsers.forEach(u => {
            console.log(`- ${u.nama_lengkap} (${u.email}) [NIK: ${u.kyc_nik || '-'}, Foto: ${u.kyc_document_image ? 'Ada' : 'Tidak'}]`);
        });

        const result = await User.updateMany(
            {
                kyc_status: 'VERIFIED',
                $or: [
                    { kyc_document_image: null },
                    { kyc_document_image: { $exists: false } },
                    { kyc_document_image: '' },
                    { kyc_nik: null },
                    { kyc_nik: { $exists: false } },
                    { kyc_nik: '' }
                ]
            },
            {
                $set: {
                    kyc_status: 'UNVERIFIED',
                    kyc_verified_at: null,
                    kyc_rejection_reason: null
                }
            }
        );

        console.log(`Berhasil mereset status KYC untuk ${result.modifiedCount} akun ke 'UNVERIFIED'.`);

        // Tampilkan semua user sekarang
        const allUsers = await User.find({}, 'nama_lengkap email kyc_status kyc_nik kyc_document_image');
        console.log('\nStatus Akun Saat Ini:');
        allUsers.forEach(u => {
            console.log(`- ${u.nama_lengkap}: ${u.kyc_status} (KTP: ${u.kyc_document_image ? 'Ada' : 'Tidak'})`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Error resetting legacy KYC:', err);
        process.exit(1);
    }
}

resetLegacyKyc();
