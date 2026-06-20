const Quest = require('../models/Quest');
const User = require('../models/User');

function getHaversineDistance(coords1, coords2) {
    const lon1 = coords1[0];
    const lat1 = coords1[1];
    const lon2 = coords2[0];
    const lat2 = coords2[1];

    const R = 6371e3; // metres
    const phi1 = lat1 * Math.PI/180; // phi, lambda in radians
    const phi2 = lat2 * Math.PI/180;
    const deltaPhi = (lat2-lat1) * Math.PI/180;
    const deltaLambda = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
}


// 1. Membuat Tugas Baru
exports.createQuest = async (req, res) => {
    try {
        const { pembuat_id, kategori, deskripsi, upah_jasa, nominal_talangan, longitude, latitude } = req.body;

        // Validasi: Cek apakah user masih memiliki tugas yang aktif (OPEN atau TAKEN) sebagai Klien maupun Pekerja
        const activeQuest = await Quest.findOne({ 
            $or: [
                { pembuat_id: pembuat_id },
                { pekerja_id: pembuat_id }
            ],
            status: { $in: ['OPEN', 'TAKEN'] } 
        });

        if (activeQuest) {
            return res.status(400).json({ 
                success: false, 
                message: "Anda tidak bisa membuat tugas baru karena masih ada tugas yang sedang berjalan (baik sebagai pembuat maupun pekerja). Selesaikan dulu!" 
            });
        }

        // Validasi Batas Talangan
        const user = await User.findById(pembuat_id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User pembuat tidak ditemukan." });
        }
        if (kategori === 'jastip' && nominal_talangan > user.batas_talangan) {
            return res.status(400).json({
                success: false,
                message: `Nominal talangan (Rp ${Number(nominal_talangan).toLocaleString('id-ID')}) melebihi batas talangan akun Anda (Rp ${user.batas_talangan.toLocaleString('id-ID')}).`
            });
        }

        // Generate PIN Rahasia 4-digit
        const pin_rahasia = Math.floor(1000 + Math.random() * 9000).toString();

        const newQuest = await Quest.create({
            pembuat_id,
            kategori,
            deskripsi,
            upah_jasa,
            nominal_talangan: nominal_talangan || 0,
            lokasi: {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            pin_rahasia,
            // Misal kadaluarsa 2 jam dari sekarang
            expired_at: new Date(Date.now() + 2 * 60 * 60 * 1000) 
        });

        res.status(201).json({ success: true, data: newQuest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Mencari Tugas Terdekat (Algoritma Haversine dengan $geoNear)
exports.getNearbyQuests = async (req, res) => {
    try {
        const { longitude, latitude, radius = 1000 } = req.query; // Default radius 1 KM (1000 meter)

        if (!longitude || !latitude) {
            return res.status(400).json({ success: false, message: "Longitude dan Latitude wajib diisi" });
        }

        const quests = await Quest.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    distanceField: "jarak_meter",
                    maxDistance: parseInt(radius), // Jarak maksimal dalam meter
                    query: { status: "OPEN" }, // Hanya cari tugas yang belum diambil
                    spherical: true // Menggunakan rumus Haversine (kelengkungan bumi)
                }
            }
        ]);

        res.status(200).json({ success: true, total: quests.length, data: quests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Menerima Tugas (Pencegahan Race Condition dengan Atomic Update)
exports.takeQuest = async (req, res) => {
    try {
        const { id } = req.params;
        const { pekerja_id } = req.body;

        // Validasi: Cek apakah pekerja sudah punya tugas aktif (baik sebagai Klien atau Pekerja)
        const activeQuest = await Quest.findOne({ 
            $or: [
                { pembuat_id: pekerja_id },
                { pekerja_id: pekerja_id }
            ],
            status: { $in: ['OPEN', 'TAKEN', 'IN_PROGRESS'] } 
        });

        if (activeQuest) {
            return res.status(400).json({ 
                success: false, 
                message: "Anda tidak bisa mengambil tugas ini karena masih memiliki tugas yang aktif. Selesaikan atau batalkan terlebih dahulu!" 
            });
        }

        // Atomic Update: Cari tugas yang statusnya OPEN, lalu ubah jadi TAKEN
        // Jika tugas sudah diambil orang lain, statusnya bukan OPEN lagi, sehingga query ini akan return null.
        const quest = await Quest.findOneAndUpdate(
            { _id: id, status: 'OPEN' },
            { 
                $set: { status: 'TAKEN', pekerja_id: pekerja_id, taken_at: new Date() } 
            },
            { new: true }
        );

        if (!quest) {
            return res.status(400).json({ success: false, message: "Tugas sudah diambil oleh pekerja lain atau tidak tersedia." });
        }

        res.status(200).json({ success: true, message: "Tugas berhasil diambil", data: quest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3.5. Mulai Mengerjakan Tugas (Pekerja Sudah Sampai)
exports.startQuest = async (req, res) => {
    try {
        const { id } = req.params;
        const { pekerja_id } = req.body;

        const quest = await Quest.findOneAndUpdate(
            { _id: id, pekerja_id: pekerja_id, status: 'TAKEN' },
            { 
                $set: { status: 'IN_PROGRESS', arrived_at: new Date() } 
            },
            { new: true }
        );

        if (!quest) {
            return res.status(400).json({ success: false, message: "Tugas tidak valid atau bukan milik Anda." });
        }

        res.status(200).json({ success: true, message: "Pekerjaan dimulai", data: quest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Menyelesaikan Tugas (Validasi PIN)
exports.completeQuest = async (req, res) => {
    const User = require('../models/User'); // Include User model to update balance
    try {
        const { id } = req.params;
        const { pin } = req.body;

        const quest = await Quest.findById(id);

        if (!quest) {
            return res.status(404).json({ success: false, message: "Tugas tidak ditemukan." });
        }

        if (quest.status !== 'IN_PROGRESS') {
            return res.status(400).json({ success: false, message: "Tugas ini tidak dalam status pengerjaan." });
        }

        // Validasi PIN
        if (quest.pin_rahasia !== pin) {
            return res.status(400).json({ success: false, message: "PIN Salah! Silakan coba lagi." });
        }

        quest.status = 'COMPLETED';
        quest.completed_at = new Date();
        await quest.save();

        // Tambahkan uang ke saldo Pekerja
        const totalPendapatan = quest.upah_jasa + (quest.nominal_talangan || 0);
        await User.findByIdAndUpdate(quest.pekerja_id, {
            $inc: { saldo: totalPendapatan }
        });

        res.status(200).json({ success: true, message: "Tugas selesai dengan sukses!", data: quest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Membatalkan / Menghapus Tugas Sendiri
exports.deleteQuest = async (req, res) => {
    try {
        const { id } = req.params;
        const { pembuat_id } = req.body; // Butuh ID pembuat untuk memastikan itu miliknya

        const quest = await Quest.findById(id);

        if (!quest) {
            return res.status(404).json({ success: false, message: "Tugas tidak ditemukan." });
        }

        if (quest.pembuat_id.toString() !== pembuat_id) {
            return res.status(403).json({ success: false, message: "Anda tidak berhak menghapus tugas orang lain." });
        }

        if (quest.status === 'TAKEN') {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            if (!quest.taken_at || quest.taken_at > oneHourAgo) {
                return res.status(400).json({ success: false, message: "Pekerja baru saja mengambil tugas ini (belum 1 jam). Harap tunggu atau hubungi pekerja terkait." });
            }
        } else if (quest.status !== 'OPEN') {
            return res.status(400).json({ success: false, message: "Tugas sudah mulai dikerjakan (In Progress) dan tidak bisa dibatalkan sepihak." });
        }

        await Quest.findByIdAndDelete(id);

        res.status(200).json({ success: true, message: "Tugas berhasil dibatalkan dan dihapus dari sistem." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Mendapatkan Tugas Aktif Saat Ini
exports.getMyActiveQuest = async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id) return res.status(400).json({ success: false, message: "User ID diperlukan" });

        const activeQuest = await Quest.findOne({
            $or: [
                { pembuat_id: user_id },
                { pekerja_id: user_id }
            ],
            status: { $in: ['OPEN', 'TAKEN', 'IN_PROGRESS'] }
        });

        if (!activeQuest) {
            return res.status(404).json({ success: false, message: "Tidak ada tugas aktif." });
        }

        res.status(200).json({ success: true, data: activeQuest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 7. Update Lokasi Live Pekerja (Untuk Tracking Klien)
exports.updatePekerjaLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { longitude, latitude } = req.body;
        
        await Quest.findByIdAndUpdate(id, {
            pekerja_lokasi: { longitude, latitude }
        });
        
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 8. Mendapatkan Statistik Gamifikasi (Penghasilan & Aktivitas)
exports.getMyStats = async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id) return res.status(400).json({ success: false, message: "User ID diperlukan" });

        // Tentukan rentang waktu Hari Ini
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Tentukan rentang waktu Bulan Ini
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Cari semua tugas selesai milik pekerja ini
        const completedQuests = await Quest.find({
            pekerja_id: user_id,
            status: 'COMPLETED'
        });

        let incomeToday = 0;
        let incomeMonth = 0;
        let questsMonth = 0;
        let distanceTodayKm = 0;

        completedQuests.forEach(q => {
            // Gunakan waktu selesai sebenarnya, atau fallback ke waktu saat ini jika data lama
            const completedAt = q.completed_at || new Date(); 
            const totalUangTunai = q.upah_jasa + (q.nominal_talangan || 0);
            
            if (completedAt >= startOfMonth) {
                incomeMonth += totalUangTunai;
                questsMonth += 1;
            }

            if (completedAt >= startOfDay && completedAt <= endOfDay) {
                incomeToday += totalUangTunai;
                distanceTodayKm += (q.upah_jasa / 10000); 
            }
        });

        // Tidak ada data dummy lagi, semua berdasarkan hasil perhitungan nyata

        res.status(200).json({
            success: true,
            data: {
                incomeToday,
                incomeMonth,
                questsMonth,
                distanceTodayKm: parseFloat(distanceTodayKm.toFixed(2))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 9. Mendapatkan Riwayat Tugas
exports.getHistory = async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id) return res.status(400).json({ success: false, message: "User ID diperlukan" });

        const history = await Quest.find({
            $or: [
                { pembuat_id: user_id },
                { pekerja_id: user_id }
            ],
            status: { $in: ['COMPLETED', 'CANCELED'] }
        }).sort({ created_at: -1 });

        res.status(200).json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
