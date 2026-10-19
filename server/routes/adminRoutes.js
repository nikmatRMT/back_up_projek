const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const requireAuth = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use((req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Akses khusus administrator.' });
    }
    return next();
});

// Route untuk mendapatkan statistik dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Route untuk mendapatkan daftar pengguna
router.get('/users', adminController.getUsers);

// Route untuk block/suspend pengguna
router.put('/users/:userId/toggle-status', adminController.toggleUserStatus);

// Hapus pengguna permanen
router.delete('/users/:userId', adminController.deleteUser);

// Route untuk mereset password pengguna
router.put('/users/:userId/reset-password', adminController.resetUserPassword);

// Route untuk mengubah status KYC pengguna (Verifikasi / Tolak / Cabut)
router.put('/users/:userId/kyc-status', adminController.updateUserKycStatus);

// Route untuk memantau semua tugas
router.get('/quests', adminController.getQuests);

// Route untuk membatalkan tugas secara paksa
router.put('/quests/:questId/cancel', adminController.cancelQuest);

// Route untuk mendapatkan data pelaporan teragregasi
router.get('/reports/data', adminController.getReportsData);

// Route untuk monitoring transaksi pembayaran & refund
router.get('/payments', adminController.getPayments);
router.put('/payments/:questId/refund', adminController.processRefund);

module.exports = router;

