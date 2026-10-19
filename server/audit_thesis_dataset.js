require('dotenv').config();

const mongoose = require('mongoose');
const Quest = require('./models/Quest');
const User = require('./models/User');

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({ role: 'user' })
        .select('nama_lengkap email no_whatsapp rating_rata_rata total_ulasan saldo')
        .sort({ nama_lengkap: 1 })
        .lean();
    const statuses = await Quest.aggregate([
        { $group: { _id: '$status', total: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);
    const participation = await Quest.aggregate([
        { $group: {
            _id: null,
            creators: { $addToSet: '$pembuat_id' },
            workers: { $addToSet: '$pekerja_id' },
        } },
    ]);
    const latest = await Quest.find({})
        .populate('pembuat_id', 'nama_lengkap')
        .populate('pekerja_id', 'nama_lengkap')
        .sort({ created_at: -1 })
        .limit(5)
        .select('deskripsi status pembuat_id pekerja_id pin_rahasia rating_pekerja')
        .lean();
    console.log(JSON.stringify({
        totalUsers: users.length,
        users,
        totalTransactions: await Quest.countDocuments({}),
        statuses,
        distinctCreators: participation[0]?.creators.filter(Boolean).length || 0,
        distinctWorkers: participation[0]?.workers.filter(Boolean).length || 0,
        latest,
    }, null, 2));
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(error.message);
    try { await mongoose.disconnect(); } catch (_) { /* abaikan */ }
    process.exit(1);
});
