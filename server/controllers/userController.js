const User = require('../models/User');

// 1. Dapatkan Profil Pengguna Saat Ini
exports.getProfile = async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id) {
            return res.status(400).json({ success: false, message: "user_id diperlukan" });
        }

        const user = await User.findById(user_id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan" });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Perbarui Profil Pengguna
exports.updateProfile = async (req, res) => {
    try {
        const { user_id, no_whatsapp, nama_lengkap } = req.body;
        if (!user_id) {
            return res.status(400).json({ success: false, message: "user_id diperlukan" });
        }

        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan" });
        }

        if (no_whatsapp) {
            if (no_whatsapp.length < 10 || no_whatsapp.length > 15) {
                return res.status(400).json({ success: false, message: "Nomor WhatsApp harus berukuran antara 10 hingga 15 digit!" });
            }
            const duplicatePhone = await User.findOne({ no_whatsapp, _id: { $ne: user_id } });
            if (duplicatePhone) {
                return res.status(400).json({ success: false, message: "Nomor WhatsApp sudah digunakan oleh akun lain!" });
            }
            user.no_whatsapp = no_whatsapp;
        }
        if (nama_lengkap) user.nama_lengkap = nama_lengkap;

        await user.save();

        res.status(200).json({ success: true, message: "Profil berhasil diperbarui", data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
