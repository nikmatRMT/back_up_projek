require('dotenv').config();

const mongoose = require('mongoose');
const Quest = require('./models/Quest');
const User = require('./models/User');
const AppLog = require('./models/AppLog');

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);

    const quests = await Quest.find({}).lean();
    const invalidLocations = quests.filter((quest) => (
        quest.lokasi?.type !== 'Point'
        || !Array.isArray(quest.lokasi?.coordinates)
        || quest.lokasi.coordinates.length !== 2
    ));
    const sameActor = quests.filter((quest) => (
        quest.pekerja_id && String(quest.pekerja_id) === String(quest.pembuat_id)
    ));
    const nearby = await Quest.aggregate([
        {
            $geoNear: {
                near: { type: 'Point', coordinates: [114.838971, -3.451007] },
                distanceField: 'jarak_meter_uji',
                maxDistance: 5000,
                spherical: true,
            },
        },
        { $count: 'total' },
    ]);
    const cancelReasons = await Quest.aggregate([
        { $match: { status: 'CANCELED' } },
        { $group: { _id: '$cancel_reason', total: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);

    console.log(JSON.stringify({
        database: mongoose.connection.name,
        quests: quests.length,
        users: await User.countDocuments({}),
        applogs: await AppLog.countDocuments({}),
        invalidLocations: invalidLocations.length,
        creatorEqualsWorker: sameActor.length,
        withinFiveKilometers: nearby[0]?.total || 0,
        cancelReasons,
    }));

    await mongoose.disconnect();
}

main()
    .then(() => process.exit(0))
    .catch(async (error) => {
        console.error(error.message);
        try {
            await mongoose.disconnect();
        } catch (_) {
            // Abaikan error penutupan setelah kegagalan utama.
        }
        process.exit(1);
    });
