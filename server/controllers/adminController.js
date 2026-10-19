const User = require('../models/User');
const Quest = require('../models/Quest');

// Mendapatkan statistik utama untuk dashboard Admin
exports.getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        
        // FIX BUG: Tugas yang sedang berjalan mencakup TAKEN maupun IN_PROGRESS (Sedang Dikerjakan)
        const activeQuests = await Quest.countDocuments({ status: { $in: ['TAKEN', 'IN_PROGRESS'] } });
        
        // Tugas yang sudah selesai (COMPLETED) hari ini
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const completedToday = await Quest.countDocuments({
            status: 'COMPLETED',
            created_at: { $gte: startOfDay }
        });

        // Deteksi order fiktif / dibatalkan (Menghitung jumlah tugas berstatus CANCELED)
        const fictitiousOrders = await Quest.countDocuments({ status: 'CANCELED' });

        res.json({
            success: true,
            data: {
                totalUsers,
                activeQuests,
                completedToday,
                fictitiousOrders
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Mendapatkan daftar pengguna untuk tabel
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('nama_lengkap email no_whatsapp batas_talangan saldo role status created_at rating_rata_rata total_ulasan kyc_status kyc_method kyc_rejection_reason kyc_verified_at kyc_nik kyc_name kyc_address kyc_document_image')
            .sort({ created_at: -1 });
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Memblokir (Suspend) atau Mengaktifkan kembali pengguna
exports.toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
        }

        if (user.status === 'ACTIVE') {
            user.status = 'SUSPENDED';
        } else {
            user.status = 'ACTIVE';
        }

        await user.save();

        res.json({
            success: true,
            message: `Status pengguna berhasil diubah menjadi ${user.status}`,
            data: user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Menghapus pengguna secara permanen
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findByIdAndDelete(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
        }

        await Quest.deleteMany({ pembuat_id: userId });

        res.json({
            success: true,
            message: 'Akun pengguna berhasil dihapus secara permanen'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Mendapatkan seluruh daftar tugas
exports.getQuests = async (req, res) => {
    try {
        const quests = await Quest.find()
            .populate('pembuat_id', 'nama_lengkap email no_whatsapp')
            .populate('pekerja_id', 'nama_lengkap email no_whatsapp rating_rata_rata total_ulasan')
            .sort({ created_at: -1 });
        res.json({
            success: true,
            data: quests
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Membatalkan tugas secara paksa oleh Admin
exports.cancelQuest = async (req, res) => {
    try {
        const { questId } = req.params;
        const quest = await Quest.findById(questId);
        if (!quest) {
            return res.status(404).json({ success: false, message: 'Tugas tidak ditemukan' });
        }
        quest.status = 'CANCELED';
        await quest.save();
        res.json({
            success: true,
            message: 'Tugas berhasil dibatalkan secara paksa oleh Admin',
            data: quest
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Menyusun data statistik laporan teragregasi
exports.getReportsData = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ status: 'ACTIVE' });
        const suspendedUsers = await User.countDocuments({ status: 'SUSPENDED' });

        const totalQuests = await Quest.countDocuments();
        const openQuests = await Quest.countDocuments({ status: 'OPEN' });
        // FIX BUG: Hitung tugas berjalan mencakup TAKEN dan IN_PROGRESS
        const takenQuests = await Quest.countDocuments({ status: { $in: ['TAKEN', 'IN_PROGRESS'] } });
        const completedQuests = await Quest.countDocuments({ status: 'COMPLETED' });
        const canceledQuests = await Quest.countDocuments({ status: 'CANCELED' });

        const completedList = await Quest.find({ status: 'COMPLETED' })
            .populate('pembuat_id', 'nama_lengkap')
            .populate('pekerja_id', 'nama_lengkap');

        let totalUpah = 0;
        let totalTalangan = 0;
        completedList.forEach(q => {
            totalUpah += q.upah_jasa || 0;
            totalTalangan += q.nominal_talangan || 0;
        });

        const categoryCounts = await Quest.aggregate([
            { $group: { _id: "$kategori", count: { $sum: 1 } } }
        ]);

        const users = await User.find().sort({ created_at: -1 });
        const quests = await Quest.find()
            .populate('pembuat_id', 'nama_lengkap email no_whatsapp')
            .populate('pekerja_id', 'nama_lengkap email no_whatsapp rating_rata_rata total_ulasan')
            .sort({ created_at: -1 });

        res.json({
            success: true,
            data: {
                summary: {
                    totalUsers,
                    activeUsers,
                    suspendedUsers,
                    totalQuests,
                    openQuests,
                    takenQuests,
                    completedQuests,
                    canceledQuests,
                    totalUpah,
                    totalTalangan,
                    totalPerputaranUang: totalUpah + totalTalangan
                },
                categories: categoryCounts,
                users,
                quests
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Reset password pengguna
exports.resetUserPassword = async (req, res) => {
    const bcrypt = require('bcryptjs');
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('warga123', salt);

        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ 
            success: true, 
            message: `Kata sandi untuk ${user.nama_lengkap} berhasil di-reset menjadi "warga123".` 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update status KYC pengguna (Verifikasi, Tolak, atau Cabut/Reset)
exports.updateUserKycStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status, rejection_reason } = req.body; // 'VERIFIED' | 'REJECTED' | 'UNVERIFIED'

        if (!['VERIFIED', 'REJECTED', 'UNVERIFIED'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status KYC tidak valid.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
        }

        user.kyc_status = status;
        if (status === 'VERIFIED') {
            user.kyc_verified_at = new Date();
            user.kyc_rejection_reason = null;
            user.kyc_method = user.kyc_method || 'ADMIN_MANUAL';
        } else if (status === 'REJECTED') {
            user.kyc_verified_at = null;
            user.kyc_rejection_reason = rejection_reason || 'Verifikasi ditolak oleh Administrator.';
        } else {
            // UNVERIFIED (Dicabut / Dibatalkan / Reset)
            user.kyc_verified_at = null;
            user.kyc_rejection_reason = null;
        }

        await user.save();

        res.json({
            success: true,
            message: `Status KYC untuk ${user.nama_lengkap} berhasil diubah menjadi ${
                status === 'VERIFIED' ? 'Terverifikasi' : status === 'REJECTED' ? 'Ditolak' : 'Belum Verifikasi'
            }.`,
            data: user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Mendapatkan daftar transaksi pembayaran untuk Monitoring Pembayaran Admin
exports.getPayments = async (req, res) => {
    try {
        const { status, method, search } = req.query;
        let query = {};

        // Filter status jika ada
        if (status && status !== 'ALL') {
            query.payment_status = status;
        }

        // Filter method jika ada
        if (method && method !== 'ALL') {
            query.payment_method = method;
        }

        let quests = await Quest.find(query)
            .populate('pembuat_id', 'nama_lengkap email no_whatsapp')
            .populate('pekerja_id', 'nama_lengkap email no_whatsapp')
            .sort({ payment_updated_at: -1, created_at: -1 });

        // Filter search jika ada (pencarian teks pada referensi, deskripsi, nama user)
        if (search) {
            const q = search.toLowerCase();
            quests = quests.filter(quest => {
                const refMatch = (quest.payment_reference || '').toLowerCase().includes(q);
                const descMatch = (quest.deskripsi || '').toLowerCase().includes(q);
                const clientMatch = (quest.pembuat_id?.nama_lengkap || '').toLowerCase().includes(q) || (quest.pembuat_id?.email || '').toLowerCase().includes(q);
                const workerMatch = (quest.pekerja_id?.nama_lengkap || '').toLowerCase().includes(q) || (quest.pekerja_id?.email || '').toLowerCase().includes(q);
                return refMatch || descMatch || clientMatch || workerMatch;
            });
        }

        res.json({
            success: true,
            data: quests
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Memproses refund dana pembayaran oleh Admin
exports.processRefund = async (req, res) => {
    try {
        const { questId } = req.params;
        const { reason } = req.body;

        const quest = await Quest.findById(questId)
            .populate('pembuat_id', 'nama_lengkap email no_whatsapp')
            .populate('pekerja_id', 'nama_lengkap email no_whatsapp');

        if (!quest) {
            return res.status(404).json({ success: false, message: 'Transaksi tugas tidak ditemukan.' });
        }

        if (quest.payment_status !== 'PAID') {
            return res.status(400).json({
                success: false,
                message: `Refund hanya dapat dilakukan untuk transaksi yang berstatus PAID (Status saat ini: ${quest.payment_status}).`
            });
        }

        quest.payment_status = 'REFUNDED';
        quest.payment_updated_at = new Date();
        quest.refund_reason = reason || 'Refund diproses oleh Administrator atas kesepakatan sengketa / pembatalan.';
        
        await quest.save();

        res.json({
            success: true,
            message: `Pembayaran tugas '${quest.deskripsi}' berhasil di-refund oleh Admin.`,
            data: quest
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


