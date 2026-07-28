const Quest = require('../models/Quest');
const User = require('../models/User');

function getHaversineDistance(coords1, coords2) {
    const lon1 = coords1[0];
    const lat1 = coords1[1];
    const lon2 = coords2[0];
    const lat2 = coords2[1];

    const R = 6371e3;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}


// 1. Membuat Tugas Baru
exports.createQuest = async (req, res) => {
    try {
        const { pembuat_id, kategori, deskripsi, upah_jasa, nominal_talangan, longitude, latitude } = req.body;

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
            expired_at: new Date(Date.now() + 2 * 60 * 60 * 1000)
        });

        res.status(201).json({ success: true, data: newQuest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Mencari Tugas Terdekat (OPEN: 10 MENIT, TAKEN: 1 MENIT UNTUK TES WORKER NO-SHOW)
exports.getNearbyQuests = async (req, res) => {
    try {
        const { longitude, latitude, radius = 1000 } = req.query;

        if (!longitude || !latitude) {
            return res.status(400).json({ success: false, message: "Longitude dan Latitude wajib diisi" });
        }

        const now = Date.now();
        const tenMinutesAgo = new Date(now - 10 * 60 * 1000); 
        const oneMinuteAgo = new Date(now - 1 * 60 * 1000); 

        // 1. OPEN > 10 menit (agar tidak batal duluan saat mau diambil)
        await Quest.updateMany(
            { status: 'OPEN', created_at: { $lt: tenMinutesAgo } },
            { $set: { status: 'CANCELED', cancel_reason: 'TIMEOUT_OPEN' } }
        );

        // 2. TAKEN > 1 menit (Otomatis Batal WORKER_NO_SHOW setelah diambil 1 menit)
        await Quest.updateMany(
            { status: 'TAKEN', taken_at: { $lt: oneMinuteAgo } },
            { $set: { status: 'CANCELED', cancel_reason: 'WORKER_NO_SHOW' } }
        );

        const quests = await Quest.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    distanceField: "jarak_meter",
                    maxDistance: parseInt(radius),
                    query: { status: "OPEN" },
                    spherical: true
                }
            }
        ]);

        res.status(200).json({ success: true, total: quests.length, data: quests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Menerima Tugas
exports.takeQuest = async (req, res) => {
    try {
        const { id } = req.params;
        const { pekerja_id, jarak_meter, transport_mode } = req.body;

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

        const quest = await Quest.findOneAndUpdate(
            { _id: id, status: 'OPEN' },
            {
                $set: {
                    status: 'TAKEN',
                    pekerja_id: pekerja_id,
                    taken_at: new Date(),
                    jarak_meter: jarak_meter || 0,
                    transport_mode: transport_mode || 'walk'
                }
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

// 3.5. Mulai Mengerjakan Tugas
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

// 4. Menyelesaikan Tugas (Validasi PIN & Geofencing)
exports.completeQuest = async (req, res) => {
    try {
        const { id } = req.params;
        const { pin, latitude, longitude } = req.body;

        const quest = await Quest.findById(id);

        if (!quest) {
            return res.status(404).json({ success: false, message: "Tugas tidak ditemukan." });
        }

        if (quest.status !== 'IN_PROGRESS') {
            return res.status(400).json({ success: false, message: "Tugas ini tidak dalam status pengerjaan." });
        }

        if (quest.pin_rahasia !== pin) {
            return res.status(400).json({ success: false, message: "PIN Salah! Silakan coba lagi." });
        }

        if (latitude && longitude && quest.lokasi && quest.lokasi.coordinates) {
            const workerCoords = [Number(longitude), Number(latitude)];
            const questCoords = quest.lokasi.coordinates;

            const distanceInMeters = getHaversineDistance(workerCoords, questCoords);
            const MAX_GEOFENCE_RADIUS_METERS = 100;

            if (distanceInMeters > MAX_GEOFENCE_RADIUS_METERS) {
                return res.status(400).json({
                    success: false,
                    message: `Validasi Geofencing Gagal! Jarak Anda adalah ${Math.round(distanceInMeters)} meter. Wajib <${MAX_GEOFENCE_RADIUS_METERS} meter.`
                });
            }
        }

        quest.status = 'COMPLETED';
        quest.completed_at = new Date();
        await quest.save();

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
        const { pembuat_id } = req.body;

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
                return res.status(400).json({ success: false, message: "Pekerja baru saja mengambil tugas ini (belum 1 jam)." });
            }
        } else if (quest.status !== 'OPEN') {
            return res.status(400).json({ success: false, message: "Tugas sudah mulai dikerjakan (In Progress)." });
        }

        await Quest.findByIdAndDelete(id);

        res.status(200).json({ success: true, message: "Tugas berhasil dibatalkan dan dihapus." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Mendapatkan Tugas Aktif (Dengan AUTO-SWEEP TAKEN > 1 MENIT)
exports.getMyActiveQuest = async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id) return res.status(400).json({ success: false, message: "User ID diperlukan" });

        // AUTO-SWEEP TAKEN > 1 MENIT UNTUK PENGUJIAN WORKER NO-SHOW
        const now = Date.now();
        const oneMinuteAgo = new Date(now - 1 * 60 * 1000);
        await Quest.updateMany(
            { status: 'TAKEN', taken_at: { $lt: oneMinuteAgo } },
            { $set: { status: 'CANCELED', cancel_reason: 'WORKER_NO_SHOW' } }
        );

        const activeQuest = await Quest.findOne({
            $or: [
                { pembuat_id: user_id },
                { pekerja_id: user_id }
            ],
            status: { $in: ['OPEN', 'TAKEN', 'IN_PROGRESS'] }
        })
            .populate('pembuat_id', 'nama_lengkap no_whatsapp email')
            .populate('pekerja_id', 'nama_lengkap no_whatsapp email');

        if (!activeQuest) {
            return res.status(404).json({ success: false, message: "Tidak ada tugas aktif." });
        }

        res.status(200).json({ success: true, data: activeQuest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 7. Update Lokasi Live Pekerja
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

// 8. Mendapatkan Statistik Gamifikasi
exports.getMyStats = async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id) return res.status(400).json({ success: false, message: "User ID diperlukan" });

        const now = new Date();
        const todayStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
        const currentMonthStr = todayStr.slice(0, 7);

        const completedQuests = await Quest.find({
            pekerja_id: user_id,
            status: 'COMPLETED'
        });

        let incomeToday = 0;
        let incomeMonth = 0;
        let questsMonth = 0;
        let distanceTodayKm = 0;
        let langkahToday = 0;
        let kaloriToday = 0;

        completedQuests.forEach(q => {
            const completedAt = q.completed_at || new Date();
            const totalUangTunai = q.upah_jasa + (q.nominal_talangan || 0);

            const completedAtStr = completedAt.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
            const completedAtMonthStr = completedAtStr.slice(0, 7);

            if (completedAtMonthStr === currentMonthStr) {
                incomeMonth += totalUangTunai;
                questsMonth += 1;
            }

            if (completedAtStr === todayStr) {
                incomeToday += totalUangTunai;
                const distanceKm = (q.jarak_meter || 0) / 1000;
                distanceTodayKm += distanceKm;

                if (q.transport_mode === 'motorcycle') {
                    kaloriToday += Math.round(distanceKm * 15);
                } else {
                    langkahToday += Math.round(distanceKm * 1300);
                    kaloriToday += Math.round(distanceKm * 55);
                }
            }
        });

        res.status(200).json({
            success: true,
            data: {
                incomeToday,
                incomeMonth,
                questsMonth,
                distanceTodayKm: parseFloat(distanceTodayKm.toFixed(2)),
                langkahToday,
                kaloriToday
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
        })
            .populate('pembuat_id', 'nama_lengkap no_whatsapp email')
            .populate('pekerja_id', 'nama_lengkap no_whatsapp email')
            .sort({ created_at: -1 });

        res.status(200).json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 10. Memberikan Rating Tugas
exports.rateQuest = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, ulasan } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: "Rating harus bernilai 1 s.d 5" });
        }

        const quest = await Quest.findById(id);
        if (!quest) return res.status(404).json({ success: false, message: "Tugas tidak ditemukan" });
        if (quest.status !== 'COMPLETED') return res.status(400).json({ success: false, message: "Tugas belum selesai" });
        if (quest.rating_pekerja !== null) return res.status(400).json({ success: false, message: "Tugas ini sudah diberi rating" });

        quest.rating_pekerja = Number(rating);
        quest.ulasan_pekerja = ulasan || '';
        await quest.save();

        const workerId = quest.pekerja_id;
        const completedQuests = await Quest.find({ pekerja_id: workerId, status: 'COMPLETED', rating_pekerja: { $ne: null } });

        const totalRating = completedQuests.reduce((sum, q) => sum + q.rating_pekerja, 0);
        const totalUlasan = completedQuests.length;
        const avgRating = totalUlasan > 0 ? (totalRating / totalUlasan) : 0;

        await User.findByIdAndUpdate(workerId, {
            $set: { rating_rata_rata: Number(avgRating.toFixed(2)), total_ulasan: totalUlasan }
        });

        res.status(200).json({ success: true, message: "Rating berhasil dikirim!", data: quest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 11. Mendapatkan Daftar Pekerja Terbaik (Leaderboard)
exports.getTopWorkers = async (req, res) => {
    try {
        const workers = await User.find({ role: 'user', total_ulasan: { $gt: 0 } })
            .sort({ rating_rata_rata: -1 })
            .limit(20)
            .select('nama_lengkap no_whatsapp rating_rata_rata total_ulasan');
        res.status(200).json({ success: true, data: workers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
