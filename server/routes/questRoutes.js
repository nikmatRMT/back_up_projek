const express = require('express');
const router = express.Router();
const questController = require('../controllers/questController');

// Rute untuk Tugas (Quests)
router.post('/', questController.createQuest);
router.get('/my-active', questController.getMyActiveQuest);
router.get('/my-stats', questController.getMyStats);
router.get('/history', questController.getHistory);
router.get('/nearby', questController.getNearbyQuests);
router.put('/:id/take', questController.takeQuest);
router.put('/:id/start', questController.startQuest);
router.put('/:id/complete', questController.completeQuest);
router.put('/:id/location', questController.updatePekerjaLocation);
router.delete('/:id', questController.deleteQuest);

module.exports = router;
