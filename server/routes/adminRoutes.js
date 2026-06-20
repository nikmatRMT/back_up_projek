const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Route untuk mendapatkan statistik dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Route untuk mendapatkan daftar pengguna
router.get('/users', adminController.getUsers);

// Route untuk block/suspend pengguna
router.put('/users/:userId/toggle-status', adminController.toggleUserStatus);

// Hapus pengguna permanen
router.delete('/users/:userId', adminController.deleteUser);

// Route untuk memantau semua tugas
router.get('/quests', adminController.getQuests);

// Route untuk membatalkan tugas secara paksa
router.put('/quests/:questId/cancel', adminController.cancelQuest);

// Route untuk mendapatkan data pelaporan teragregasi
router.get('/reports/data', adminController.getReportsData);

module.exports = router;
