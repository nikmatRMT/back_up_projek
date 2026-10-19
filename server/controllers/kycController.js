const User = require('../models/User');

exports.getStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('nama_lengkap kyc_status kyc_rejection_reason kyc_verified_at');
        if (!user) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
        return res.json({ success: true, data: user });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.verifyDummy = async (req, res) => {
    try {
        const { scenario } = req.body;
        if (!['clear', 'blurry'].includes(scenario)) {
            return res.status(400).json({ success: false, message: 'Pilih skenario KTP dummy yang tersedia.' });
        }
        const verified = scenario === 'clear';
        const update = verified
            ? { kyc_status: 'VERIFIED', kyc_rejection_reason: null, kyc_verified_at: new Date(), kyc_method: 'DUMMY_SIMULATION' }
            : { kyc_status: 'REJECTED', kyc_rejection_reason: 'Foto KTP dummy buram dan NIK tidak terbaca.', kyc_verified_at: null, kyc_method: 'DUMMY_SIMULATION' };
        const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true })
            .select('nama_lengkap kyc_status kyc_rejection_reason kyc_verified_at');
        return res.json({ success: true, data: user });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.submitVerification = async (req, res) => {
    try {
        const { nik, name, address, document_image } = req.body;
        const normalizedName = (value) => (value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
        const nikValid = /^\d{16}$/.test(nik || '');
        const addressProvided = typeof address === 'string' && address.trim().length >= 5;
        const imageValid = typeof document_image === 'string' && /^data:image\/(jpeg|jpg|png|webp);base64,/.test(document_image) && document_image.length <= 4_500_000;
        if (!nikValid || !addressProvided || !imageValid) {
            return res.status(400).json({ success: false, message: 'Lengkapi NIK, alamat, dan foto KTP sebelum mengirim verifikasi.' });
        }
        const userAccount = await User.findById(req.user.id).select('nama_lengkap');
        if (!userAccount) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
        const verified = normalizedName(name) === normalizedName(userAccount.nama_lengkap);
        const update = verified
            ? { kyc_status: 'VERIFIED', kyc_rejection_reason: null, kyc_verified_at: new Date(), kyc_method: 'LOCAL_FORM_PROTOTYPE' }
            : { kyc_status: 'REJECTED', kyc_rejection_reason: 'Nama pada data KTP tidak sesuai dengan nama akun.', kyc_verified_at: null, kyc_method: 'LOCAL_FORM_PROTOTYPE' };
        Object.assign(update, {
            kyc_nik: nik,
            kyc_name: name.trim(),
            kyc_address: address.trim(),
            kyc_document_image: document_image
        });
        const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true })
            .select('nama_lengkap kyc_status kyc_rejection_reason kyc_verified_at');
        return res.json({ success: true, data: user });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
