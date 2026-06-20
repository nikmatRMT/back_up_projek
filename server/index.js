const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jasa_lepas_db')
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => console.error('MongoDB connection error:', err));

// Import Routes
const questRoutes = require('./routes/questRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');

// Routes
app.use('/api/quests', questRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.send('Server Aplikasi Pencarian Jasa Lepas Berjalan');
});

const Quest = require('./models/Quest');

// Auto-Cancel Sweeper Job (Berjalan setiap 5 menit)
setInterval(async () => {
    try {
        const now = Date.now();
        const oneHourAgo = new Date(now - 60 * 60 * 1000);
        const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
        const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000);

        // 1. Batalkan tugas OPEN yang sudah > 1 jam
        const canceledOpen = await Quest.updateMany(
            { status: 'OPEN', created_at: { $lt: oneHourAgo } },
            { $set: { status: 'CANCELED' } }
        );

        // 2. Batalkan tugas TAKEN yang sudah > 2 jam
        const canceledTaken = await Quest.updateMany(
            { status: 'TAKEN', taken_at: { $lt: twoHoursAgo } },
            { $set: { status: 'CANCELED' } }
        );

        // 3. Batalkan tugas IN_PROGRESS yang sudah > 12 jam (Pencegahan tugas menggantung selamanya)
        const canceledInProgress = await Quest.updateMany(
            { status: 'IN_PROGRESS', arrived_at: { $lt: twelveHoursAgo } },
            { $set: { status: 'CANCELED' } }
        );

        if (canceledOpen.modifiedCount > 0 || canceledTaken.modifiedCount > 0 || canceledInProgress.modifiedCount > 0) {
            console.log(`[Sweeper] Canceled ${canceledOpen.modifiedCount} OPEN, ${canceledTaken.modifiedCount} TAKEN, ${canceledInProgress.modifiedCount} IN_PROGRESS tasks.`);
        }
    } catch (err) {
        console.error('[Sweeper] Error running auto-cancel job:', err);
    }
}, 5 * 60 * 1000); // 5 menit

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
