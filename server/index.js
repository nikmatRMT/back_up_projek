const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection helper for serverless environment
let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;
    try {
        const db = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jasa_lepas_db');
        isConnected = db.connections[0].readyState === 1;
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        throw err;
    }
};

// Middleware to ensure DB connection is established before processing request
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database connection failed' });
    }
});

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

const AppLog = require('./models/AppLog');

// Endpoint untuk Pelaporan Log Error Aplikasi (Diagnostics)
app.post('/api/logs/report', async (req, res) => {
    try {
        const { level, message, stack, platform, userId, deviceInfo } = req.body;
        const newLog = new AppLog({
            level: level || 'ERROR',
            message: message || 'No message provided',
            stack: stack || '',
            platform: platform || 'web',
            userId: userId || '',
            deviceInfo: deviceInfo || {}
        });
        await newLog.save();
        res.status(200).json({ success: true, message: 'Log reported successfully' });
    } catch (err) {
        console.error('Failed to save reported log:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Endpoint untuk Mendapatkan Log Error Terbaru (untuk Admin/Developer)
app.get('/api/logs', async (req, res) => {
    try {
        const logs = await AppLog.find().sort({ timestamp: -1 }).limit(100);
        res.status(200).json({ success: true, data: logs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const Quest = require('./models/Quest');

// Endpoint untuk Vercel Cron Job (Sweeper)
app.get('/api/sweeper', async (req, res) => {
    try {
        const now = Date.now();
        // SEMENTARA UBAH BATAS WAKTU OPEN MENJADI 1 MENIT UNTUK PENGUJIAN USER
        const oneMinuteAgo = new Date(now - 1 * 60 * 1000); 
        const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
        const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000);

        // 1. Batalkan tugas OPEN yang sudah > 1 menit
        const canceledOpen = await Quest.updateMany(
            { status: 'OPEN', created_at: { $lt: oneMinuteAgo } },
            { $set: { status: 'CANCELED', cancel_reason: 'TIMEOUT_OPEN' } }
        );

        // 2. Batalkan tugas TAKEN yang sudah > 2 jam
        const canceledTaken = await Quest.updateMany(
            { status: 'TAKEN', taken_at: { $lt: twoHoursAgo } },
            { $set: { status: 'CANCELED', cancel_reason: 'WORKER_NO_SHOW' } }
        );

        // 3. Batalkan tugas IN_PROGRESS yang sudah > 12 jam
        const canceledInProgress = await Quest.updateMany(
            { status: 'IN_PROGRESS', arrived_at: { $lt: twelveHoursAgo } },
            { $set: { status: 'CANCELED', cancel_reason: 'WORKER_INCOMPLETE' } }
        );

        const logMsg = `[Sweeper TEST 1 MIN] Canceled ${canceledOpen.modifiedCount} OPEN, ${canceledTaken.modifiedCount} TAKEN, ${canceledInProgress.modifiedCount} IN_PROGRESS tasks.`;
        console.log(logMsg);

        res.status(200).json({
            success: true,
            message: 'Sweeper test executed successfully',
            data: {
                canceledOpen: canceledOpen.modifiedCount,
                canceledTaken: canceledTaken.modifiedCount,
                canceledInProgress: canceledInProgress.modifiedCount
            }
        });
    } catch (err) {
        console.error('[Sweeper] Error running auto-cancel job:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Auto-Cancel Sweeper Job (Jalan lokal setiap 10 detik untuk Pengujian 1 Menit)
if (!process.env.VERCEL) {
    setInterval(async () => {
        try {
            const now = Date.now();
            const oneMinuteAgo = new Date(now - 1 * 60 * 1000); // 1 Menit
            const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
            const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000);

            // 1. Batalkan tugas OPEN yang sudah > 1 menit
            const canceledOpen = await Quest.updateMany(
                { status: 'OPEN', created_at: { $lt: oneMinuteAgo } },
                { $set: { status: 'CANCELED', cancel_reason: 'TIMEOUT_OPEN' } }
            );

            // 2. Batalkan tugas TAKEN yang sudah > 2 jam
            const canceledTaken = await Quest.updateMany(
                { status: 'TAKEN', taken_at: { $lt: twoHoursAgo } },
                { $set: { status: 'CANCELED', cancel_reason: 'WORKER_NO_SHOW' } }
            );

            // 3. Batalkan tugas IN_PROGRESS yang sudah > 12 jam
            const canceledInProgress = await Quest.updateMany(
                { status: 'IN_PROGRESS', arrived_at: { $lt: twelveHoursAgo } },
                { $set: { status: 'CANCELED', cancel_reason: 'WORKER_INCOMPLETE' } }
            );

            if (canceledOpen.modifiedCount > 0 || canceledTaken.modifiedCount > 0 || canceledInProgress.modifiedCount > 0) {
                console.log(`[Sweeper TEST 1 MIN] Canceled ${canceledOpen.modifiedCount} OPEN, ${canceledTaken.modifiedCount} TAKEN, ${canceledInProgress.modifiedCount} IN_PROGRESS tasks.`);
            }
        } catch (err) {
            console.error('[Sweeper] Error running auto-cancel job:', err);
        }
    }, 10 * 1000); // Check setiap 10 detik
}

// Start Server jika tidak berjalan di Vercel
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
