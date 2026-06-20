const User = require('../models/User');
const Quest = require('../models/Quest');

// Mendapatkan statistik utama untuk dashboard Admin
exports.getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        
        // Tugas yang sedang dikerjakan (TAKEN)
        const activeQuests = await Quest.countDocuments({ status: 'TAKEN' });
        
        // Tugas yang sudah selesai (COMPLETED) hari ini
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const completedToday = await Quest.countDocuments({
            status: 'COMPLETED',
            created_at: { $gte: startOfDay }
        });

        // Deteksi order fiktif / dibatalkan (Simulasi: Menghitung jumlah tugas berstatus CANCELED)
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
        const users = await User.find().sort({ created_at: -1 }); // terbaru di atas
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

        // Toggle status
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

        // Opsional: Hapus tugas yang terkait dengan user ini jika diperlukan
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
            .populate('pekerja_id', 'nama_lengkap email no_whatsapp')
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
        const takenQuests = await Quest.countDocuments({ status: 'TAKEN' });
        const completedQuests = await Quest.countDocuments({ status: 'COMPLETED' });
        const canceledQuests = await Quest.countDocuments({ status: 'CANCELED' });

        // Hitung perputaran uang dari tugas yang selesai
        const completedList = await Quest.find({ status: 'COMPLETED' })
            .populate('pembuat_id', 'nama_lengkap')
            .populate('pekerja_id', 'nama_lengkap');

        let totalUpah = 0;
        let totalTalangan = 0;
        completedList.forEach(q => {
            totalUpah += q.upah_jasa || 0;
            totalTalangan += q.nominal_talangan || 0;
        });

        // Hitung tugas berdasarkan kategori
        const categoryCounts = await Quest.aggregate([
            { $group: { _id: "$kategori", count: { $sum: 1 } } }
        ]);

        // Daftar pengguna dan tugas untuk visualisasi/cetak
        const users = await User.find().sort({ created_at: -1 });
        const quests = await Quest.find()
            .populate('pembuat_id', 'nama_lengkap email no_whatsapp')
            .populate('pekerja_id', 'nama_lengkap email no_whatsapp')
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
